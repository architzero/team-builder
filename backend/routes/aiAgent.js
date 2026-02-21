const router = require('express').Router();
const User = require('../models/User');
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');
const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

////////////////////////////////////////////////////////////////////////////////
// AI CALLERS
////////////////////////////////////////////////////////////////////////////////

async function callAI(prompt) {
  const provider = process.env.AI_PROVIDER || 'gemini';

  if (provider === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );
    const data = await res.json();
    if (data.error) return `AI Error: ${data.error.message}`;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI unavailable';
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'AI unavailable';
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text || 'AI unavailable';
  }

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048
      })
    });
    const data = await res.json();
    if (data.error) return `AI Error: ${data.error.message}`;
    return data.choices?.[0]?.message?.content || 'AI unavailable';
  }

  return 'No AI provider configured';
}

async function callAIJson(prompt) {
  const provider = process.env.AI_PROVIDER || 'gemini';

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are a JSON-only planner. Respond with valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 512,
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    if (data.error) return null;
    return data.choices?.[0]?.message?.content || null;
  }

  return callAI(prompt);
}

////////////////////////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////////////////////////

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch (_) {}
    }
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj?.[0]) {
      try {
        return JSON.parse(obj[0]);
      } catch (_) {}
    }
    return null;
  }
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills.map(s => String(s || '').trim()).filter(Boolean);
}

function dedupeStrings(values) {
  const seen = new Set();
  const out = [];
  for (const v of values || []) {
    const text = String(v || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function matchesText(value, expected) {
  const s = String(value || '').toLowerCase();
  const t = String(expected || '').toLowerCase();
  return s.includes(t);
}

function candidateHasSkill(candidate, skill) {
  const sk = String(skill || '').toLowerCase();
  return (candidate.skills || []).some(s =>
    String(s).toLowerCase().includes(sk)
  );
}

function normalizeConstraints(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const count = Number(input.count);
  const year = Number(input.year);
  const availability = String(input.availability || 'available').toLowerCase();

  return {
    count: Number.isFinite(count) && count > 0 ? Math.floor(count) : null,
    skills_all: dedupeStrings(input.skills_all || []),
    skills_any: dedupeStrings(input.skills_any || []),
    college: input.college ? String(input.college).trim() : null,
    year: Number.isFinite(year) ? year : null,
    availability: ['available', 'unavailable', 'any'].includes(availability)
      ? availability
      : 'available'
  };
}

const PlannerOutputSchema = z.object({
  intent: z
    .enum(['build_team', 'find_people', 'draft_message', 'general'])
    .optional(),
  tool: z.enum([
    'match_candidates_by_skill',
    'draft_intro_message',
    'none'
  ]),
  arguments: z.record(z.any()).optional(),
  constraints: z.record(z.any()).optional(),
  ask_user: z.string().nullable().optional()
});

////////////////////////////////////////////////////////////////////////////////
// TOOLS
////////////////////////////////////////////////////////////////////////////////

const matchCandidatesBySkillTool = tool(
  async ({
    skills,
    availability_required,
    match_mode,
    limit,
    college,
    year
  }) => {
    const normalized = normalizeSkills(skills);
    const mode = match_mode === 'all' ? 'all' : 'any';
    const safeLimit =
      Number.isFinite(Number(limit)) && Number(limit) > 0
        ? Math.min(Math.floor(Number(limit)), 100)
        : 50;

    const filter = {};

    if (normalized.length) {
      const regex = normalized.map(s => new RegExp(s, 'i'));
      if (mode === 'all') {
        filter.$and = regex.map(r => ({ skills: r }));
      } else {
        filter.skills = { $in: regex };
      }
    }

    if (availability_required) filter.availability = 'available';
    if (college) filter.college = new RegExp(college, 'i');
    if (Number.isFinite(Number(year))) filter.year = Math.floor(Number(year));

    if (!Object.keys(filter).length) return { candidates: [] };

    const users = await User.find(filter)
      .limit(safeLimit)
      .select('name skills availability college year')
      .lean();

    return {
      candidates: users.map(u => ({
        user_id: String(u._id),
        name: u.name,
        skills: u.skills || [],
        availability: u.availability,
        college: u.college || '',
        year: u.year || null
      }))
    };
  },
  {
    name: 'match_candidates_by_skill',
    schema: z.object({
      skills: z.array(z.string()).default([]),
      availability_required: z.boolean().default(true),
      match_mode: z.enum(['any', 'all']).default('any'),
      limit: z.number().int().positive().max(100).default(50),
      college: z.string().optional(),
      year: z.number().int().optional()
    })
  }
);

const draftIntroMessageTool = tool(
  async ({ team_members, project_name, goal }) => {
    const members = Array.isArray(team_members) ? team_members : [];
    const lines = members
      .map(
        (m, i) =>
          `${i + 1}. ${m.name || 'Member'} | Skills: ${(m.skills || []).join(
            ', '
          )}`
      )
      .join('\n');

    const prompt = `Draft a concise intro message.
Project: ${project_name}
Goal: ${goal}
Members:
${lines}
Under 120 words. Output only message.`;

    const draft = await callAI(prompt);
    return { draft };
  },
  {
    name: 'draft_intro_message',
    schema: z.object({
      team_members: z.array(z.object({}).passthrough()).default([]),
      project_name: z.string(),
      goal: z.string()
    })
  }
);

const TOOL_REGISTRY = {
  match_candidates_by_skill: matchCandidatesBySkillTool,
  draft_intro_message: draftIntroMessageTool
};

////////////////////////////////////////////////////////////////////////////////
// GRAPH STATE
////////////////////////////////////////////////////////////////////////////////

const LangGraphState = Annotation.Root({
  request: Annotation(),
  plan: Annotation(),
  constraints: Annotation(),
  candidatePool: Annotation(),
  selectedCandidates: Annotation(),
  validation: Annotation(),
  attempts: Annotation(),
  maxAttempts: Annotation(),
  toolResult: Annotation(),
  finalResponse: Annotation()
});

////////////////////////////////////////////////////////////////////////////////
// NODES
////////////////////////////////////////////////////////////////////////////////

async function plannerNode(state) {
  const userMessage = state.request?.message || '';

  const plannerPrompt = `You are a tool planner. Respond with valid JSON only.

User: "${userMessage}"

If user wants to find people/teammates, use: {"tool":"match_candidates_by_skill","arguments":{"skills":["skill1","skill2"]}}
If greeting/general question, use: {"tool":"none","ask_user":"your helpful response"}

Respond with JSON only:`;

  const raw = await callAIJson(plannerPrompt);
  const parsed = safeJsonParse(raw);

  if (!parsed || !parsed.tool) {
    const fallback = await callAI(`Respond helpfully to: "${userMessage}"`);
    return {
      plan: { tool: 'none', arguments: {}, ask_user: fallback },
      constraints: {},
      attempts: 0,
      maxAttempts: 2
    };
  }

  return {
    plan: {
      tool: parsed.tool || 'none',
      arguments: parsed.arguments || {},
      ask_user: parsed.ask_user || null
    },
    constraints: {},
    attempts: 0,
    maxAttempts: 2
  };
}

async function runToolNode(state) {
  const tool = TOOL_REGISTRY[state.plan?.tool];
  if (!tool) return { candidatePool: [], selectedCandidates: [] };

  const result = await tool.invoke(state.plan.arguments || {});

  if (state.plan.tool === 'match_candidates_by_skill') {
    return { 
      candidatePool: result?.candidates || [], 
      selectedCandidates: result?.candidates || [],
      toolResult: result 
    };
  }

  return { toolResult: result, selectedCandidates: [] };
}

async function selectorNode(state) {
  const pool = state.candidatePool || [];
  const c = state.constraints || {};
  let filtered = [...pool];

  if (c.college)
    filtered = filtered.filter(u => matchesText(u.college, c.college));
  if (c.year) filtered = filtered.filter(u => u.year === c.year);
  if (c.availability === 'available')
    filtered = filtered.filter(u => u.availability === 'available');

  if (c.skills_all?.length)
    filtered = filtered.filter(u =>
      c.skills_all.every(s => candidateHasSkill(u, s))
    );

  if (c.skills_any?.length)
    filtered = filtered.filter(u =>
      c.skills_any.some(s => candidateHasSkill(u, s))
    );

  if (c.count) filtered = filtered.slice(0, c.count);

  return { selectedCandidates: filtered };
}

async function validatorNode(state) {
  const c = state.constraints || {};
  const selected = state.selectedCandidates || [];
  const failed = [];

  if (c.count && selected.length !== c.count)
    failed.push('COUNT_MISMATCH');

  if (c.skills_all?.length) {
    for (const s of c.skills_all) {
      if (!selected.some(u => candidateHasSkill(u, s)))
        failed.push(`MISSING_${s}`);
    }
  }

  if (c.college && !selected.every(u => matchesText(u.college, c.college)))
    failed.push('COLLEGE_MISMATCH');

  if (c.year && !selected.every(u => u.year === c.year))
    failed.push('YEAR_MISMATCH');

  return {
    validation: { ok: failed.length === 0, failedRules: failed }
  };
}

async function retryNode(state) {
  return { attempts: (state.attempts || 0) + 1 };
}

async function responderNode(state) {
  const { plan, selectedCandidates } = state;

  if (plan?.tool === 'none') {
    return { finalResponse: plan.ask_user || 'Provide more details.' };
  }

  if (plan?.tool === 'match_candidates_by_skill') {
    const candidates = selectedCandidates || [];
    if (!candidates.length) {
      return { finalResponse: 'No matching candidates found.' };
    }
    const lines = candidates.map((c, i) => `${i + 1}. ${c.name} (${(c.skills || []).join(', ')})`);
    return { finalResponse: `Found ${candidates.length} candidate(s):\n${lines.join('\n')}` };
  }

  if (plan?.tool === 'draft_intro_message') {
    const draft = state.toolResult?.draft || 'Unable to generate draft.';
    return { finalResponse: draft };
  }

  return { finalResponse: 'No response generated.' };
}

////////////////////////////////////////////////////////////////////////////////
// GRAPH
////////////////////////////////////////////////////////////////////////////////

const langGraphApp = new StateGraph(LangGraphState)
  .addNode('planner', plannerNode)
  .addNode('toolRunner', runToolNode)
  .addNode('responder', responderNode)

  .addEdge(START, 'planner')

  .addConditionalEdges(
    'planner',
    state =>
      state.plan?.tool && state.plan.tool !== 'none'
        ? 'toolRunner'
        : 'responder',
    ['toolRunner', 'responder']
  )

  .addEdge('toolRunner', 'responder')
  .addEdge('responder', END)
  .compile();

////////////////////////////////////////////////////////////////////////////////
// ROUTES
////////////////////////////////////////////////////////////////////////////////

router.post('/chat', auth, async (req, res) => {
  try {
    const { message, context } = req.body;

    const output = await langGraphApp.invoke({
      request: { message: message || '', context: context || '' },
      attempts: 0,
      maxAttempts: 2
    });

    const candidates = output?.selectedCandidates || [];
    const mentionedUsers = candidates.map(c => ({
      id: c.user_id,
      name: c.name,
      skills: c.skills
    }));

    res.json({
      response: output?.finalResponse || 'No response generated.',
      selectedTool: output?.plan?.tool || 'none',
      constraints: output?.constraints || {},
      validation: output?.validation || null,
      selectedCandidates: output?.selectedCandidates || [],
      toolResult: output?.toolResult || null,
      mentionedUsers
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

router.post('/draft', auth, async (req, res) => {
  try {
    const { receiverId, projectContext } = req.body;
    const sender = await User.findById(req.userId);
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    const prompt = `Draft a short invite from ${sender.name} to ${receiver.name}.
Project: ${projectContext || ''}
Under 3 sentences. Only message text.`;

    const draft = await callAI(prompt);
    res.json({ draft, receiverName: receiver.name });
  } catch {
    res.status(500).json({ error: 'Draft failed' });
  }
});

router.post('/tools/match-candidates-by-skill', auth, async (req, res) => {
  try {
    const result = await matchCandidatesBySkillTool.invoke(req.body || {});
    res.json(result);
  } catch (err) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: err.message });
  }
});

router.post('/tools/draft-intro-message', auth, async (req, res) => {
  try {
    const result = await draftIntroMessageTool.invoke(req.body || {});
    res.json(result);
  } catch (err) {
    res
      .status(400)
      .json({ error: 'Invalid input', details: err.message });
  }
});

module.exports = router;
