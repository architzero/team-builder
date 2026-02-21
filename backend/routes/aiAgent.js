const router = require('express').Router();
const User = require('../models/User');
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');
const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1: Multi-Provider AI Caller
// ════════════════════════════════════════════════════════════════════════════

async function callAI(prompt) {
  console.log('GROQ KEY:', process.env.GROQ_API_KEY?.slice(0, 10));
  const provider = process.env.AI_PROVIDER || 'gemini';

  if (provider === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });
    const data = await res.json();
    if (data.error) {
      console.error('Gemini error:', data.error.message);
      return `AI Error: ${data.error.message}`;
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI unavailable';
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 2048 })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'AI unavailable';
  }

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    return data.content?.[0]?.text || 'AI unavailable';
  }

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 2048 })
    });
    const data = await res.json();
    if (data.error) {
      console.error('Groq error:', data.error.message);
      return `AI Error: ${data.error.message}`;
    }
    return data.choices?.[0]?.message?.content || 'AI unavailable';
  }

  return 'No AI provider configured';
}

// Like callAI but forces JSON output (used by planner node only)
async function callAIJson(prompt) {
  const provider = process.env.AI_PROVIDER || 'gemini';

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a JSON-only planner. Always respond with valid JSON and nothing else. No markdown, no explanation, no code fences.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 512,
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    if (data.error) {
      console.error('Groq JSON error:', data.error.message);
      return null;
    }
    return data.choices?.[0]?.message?.content || null;
  }

  // For other providers, just call normally and let safeJsonParse handle it
  return callAI(prompt);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2: Helpers
// ════════════════════════════════════════════════════════════════════════════

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try { return JSON.parse(fenced[1]); } catch (_) {}
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      try { return JSON.parse(objectMatch[0]); } catch (_) {}
    }
    return null;
  }
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills.map(s => String(s || '').trim()).filter(Boolean);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3: LangGraph Tools (Zod-validated)
// ════════════════════════════════════════════════════════════════════════════

// Tool 1: Find users by skill match
const matchCandidatesBySkillTool = tool(
  async ({ skills, availability_required }) => {
    const normalizedSkills = normalizeSkills(skills);
    if (!normalizedSkills.length) return { candidates: [] };

    const filter = { skills: { $in: normalizedSkills.map(s => new RegExp(s, 'i')) } };
    if (availability_required) filter.availability = 'available';

    const users = await User.find(filter).select('name skills availability college year').lean();
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
    description: 'Find users whose skills match ANY skill in the input list.',
    schema: z.object({
      skills: z.array(z.string()).min(1),
      availability_required: z.boolean().default(true)
    })
  }
);

// Tool 2: AI-draft a team intro message
const draftIntroMessageTool = tool(
  async ({ team_members, project_name, goal }) => {
    const members = Array.isArray(team_members) ? team_members : [];
    const memberLines = members.map((m, i) => {
      const skills = Array.isArray(m.skills) ? m.skills.join(', ') : 'Not specified';
      return `${i + 1}. ${m.name || `Member ${i + 1}`} | Skills: ${skills}`;
    }).join('\n');

    const prompt = `You are drafting a concise intro message for a hackathon team.
PROJECT NAME: ${project_name}
GOAL: ${goal}
TEAM MEMBERS:
${memberLines || 'No members provided'}
Write a friendly intro message in under 120 words. Output ONLY the message text.`;

    const draft = await callAI(prompt);
    return { draft };
  },
  {
    name: 'draft_intro_message',
    description: 'Generate a concise intro message draft for a team.',
    schema: z.object({
      team_members: z.array(z.object({}).passthrough()).default([]),
      project_name: z.string().min(1),
      goal: z.string().min(1)
    })
  }
);

const TOOL_REGISTRY = {
  match_candidates_by_skill: matchCandidatesBySkillTool,
  draft_intro_message: draftIntroMessageTool
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4: LangGraph StateGraph (Planner → Tool → Responder)
// ════════════════════════════════════════════════════════════════════════════

const LangGraphState = Annotation.Root({
  request: Annotation(),
  plan: Annotation(),
  toolResult: Annotation(),
  finalResponse: Annotation()
});

async function plannerNode(state) {
  const reqData = state.request || {};
  const userMessage = reqData.message || '';

  const plannerPrompt = `You are a tool planner for a hackathon team-building assistant.

AVAILABLE TOOLS:
1) match_candidates_by_skill - use when user wants to find/search/match people by skills
   Example triggers: "find React devs", "who knows Python", "build my team for fintech", "need someone for pitch"
   arguments: {"skills": ["skill1", "skill2"], "availability_required": true}

2) draft_intro_message - use when user wants to draft/write an invite or intro message
   arguments: {"team_members": [], "project_name": "name", "goal": "description"}

3) none - use for greetings, general questions, strategy advice, anything else
   ask_user: provide a helpful, friendly natural language response

USER MESSAGE: "${userMessage}"

INSTRUCTIONS:
- For "build my team for fintech hack need React, Node.js backend, and someone for pitch" → tool: match_candidates_by_skill, skills: ["React", "Node.js", "pitch", "presentation"]
- For "hii", "hello", "hi" → tool: none, ask_user: friendly greeting + offer to help find teammates or projects
- For "what open projects match my skills?" → tool: none, ask_user: explain they need to browse Projects page or tell you their skills
- For strategy questions → tool: none, ask_user: give helpful advice
- Always extract real skill names from context, never use placeholder text
- NEVER leave ask_user as null when tool is "none"

Respond with ONLY valid JSON, no extra text:
{"tool":"match_candidates_by_skill"|"draft_intro_message"|"none","arguments":{},"ask_user":null}`;

  const raw = await callAIJson(plannerPrompt);
  const parsed = safeJsonParse(raw);

  if (!parsed || typeof parsed !== 'object') {
    // Graceful fallback — ask AI to respond naturally
    const fallback = await callAI(`You are a friendly hackathon team-building assistant. Respond helpfully to: "${userMessage}"`);
    return {
      plan: { tool: 'none', arguments: {}, ask_user: fallback }
    };
  }

  return {
    plan: {
      tool: typeof parsed.tool === 'string' ? parsed.tool : 'none',
      arguments: parsed.arguments && typeof parsed.arguments === 'object' ? parsed.arguments : {},
      ask_user: typeof parsed.ask_user === 'string' ? parsed.ask_user : null
    }
  };
}

async function runToolNode(state) {
  const { plan } = state;
  const selectedTool = TOOL_REGISTRY[plan.tool];
  if (!selectedTool) return { toolResult: null };
  const result = await selectedTool.invoke(plan.arguments || {});
  return { toolResult: result };
}

async function responderNode(state) {
  const { plan, toolResult } = state;

  if (plan?.tool === 'none') {
    return { finalResponse: plan.ask_user || 'Please provide more details so I can run a tool.' };
  }

  if (plan?.tool === 'match_candidates_by_skill') {
    const candidates = toolResult?.candidates || [];
    if (!candidates.length) {
      return { finalResponse: 'No matching candidates were found for the given skills.', toolResult };
    }
    const lines = candidates.map((c, idx) => `${idx + 1}. ${c.name} (${(c.skills || []).join(', ')})`);
    return {
      finalResponse: `Found ${candidates.length} matching candidate(s):\n${lines.join('\n')}`,
      toolResult
    };
  }

  if (plan?.tool === 'draft_intro_message') {
    const draft = toolResult?.draft || 'Unable to generate draft right now.';
    return { finalResponse: draft, toolResult };
  }

  return { finalResponse: 'No supported tool selected.' };
}

const langGraphApp = new StateGraph(LangGraphState)
  .addNode('planner', plannerNode)
  .addNode('toolRunner', runToolNode)
  .addNode('responder', responderNode)
  .addEdge(START, 'planner')
  .addConditionalEdges(
    'planner',
    (state) => (state.plan?.tool && state.plan.tool !== 'none' ? 'toolRunner' : 'responder'),
    ['toolRunner', 'responder']
  )
  .addEdge('toolRunner', 'responder')
  .addEdge('responder', END)
  .compile();

// LangGraph chat: planner → tool → responder pipeline
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, context } = req.body;
    const output = await langGraphApp.invoke({
      request: { message: message || '', context: context || '' }
    });

    const candidates = output?.toolResult?.candidates || [];
    const mentionedUsers = candidates.map(c => ({
      id: c.user_id,
      name: c.name,
      skills: c.skills
    }));

    res.json({
      response: output?.finalResponse || 'No response generated.',
      selectedTool: output?.plan?.tool || 'none',
      toolResult: output?.toolResult || null,
      mentionedUsers
    });
  } catch (err) {
    console.error('LangGraph chat error:', err);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// ── Draft Endpoint using LangGraph ──
router.post('/draft', auth, async (req, res) => {
  try {
    const { receiverId, projectContext } = req.body;
    const sender = await User.findById(req.userId);
    if (!sender) return res.status(404).json({ error: 'Sender not found' });

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    const prompt = `Draft a short friendly hackathon team invite from ${sender.name} (skills: ${sender.skills.join(', ')}) to ${receiver.name} (skills: ${receiver.skills.join(', ')}).
${projectContext ? `Project: ${projectContext}` : ''}
Keep it under 3 sentences. Mention why their skills match. Return ONLY the message text.`;

    const draft = await callAI(prompt);
    res.json({ draft, receiverName: receiver.name });
  } catch (err) {
    res.status(500).json({ error: 'Draft failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5: LangGraph Tool Endpoints
// ════════════════════════════════════════════════════════════════════════════

// Direct tool: match candidates by skill
router.post('/tools/match-candidates-by-skill', auth, async (req, res) => {
  try {
    const result = await matchCandidatesBySkillTool.invoke(req.body || {});
    res.json(result);
  } catch (err) {
    console.error('LangGraph tool error:', err);
    res.status(400).json({ error: 'Invalid input for match_candidates_by_skill', details: err.message });
  }
});

// Direct tool: draft intro message
router.post('/tools/draft-intro-message', auth, async (req, res) => {
  try {
    const result = await draftIntroMessageTool.invoke(req.body || {});
    res.json(result);
  } catch (err) {
    console.error('LangGraph tool error:', err);
    res.status(400).json({ error: 'Invalid input for draft_intro_message', details: err.message });
  }
});

module.exports = router;