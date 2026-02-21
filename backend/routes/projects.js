const router = require('express').Router();
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');

// Get all open projects
router.get('/', auth, async (req, res) => {
  try {
    const { skill, domain, search, status, page = 1, limit = 30 } = req.query;
    let filter = {};

    // Skill-based filtering (case-insensitive)
    if (skill) filter.skillsNeeded = { $in: [new RegExp(skill, 'i')] };
    
    // Domain filtering
    if (domain && domain !== 'all') filter.domain = domain;
    
    // Title search (case-insensitive)
    if (search) filter.title = new RegExp(search, 'i');
    
    // Status filter (only if explicitly provided)
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('creator', 'name skills avatar')
        .populate('members.user', 'name skills avatar')
        .limit(parseInt(limit))
        .skip(skip)
        .sort({ createdAt: -1 }),
      Project.countDocuments(filter)
    ]);

    res.json({ 
      projects,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// My projects (created + joined) - MUST come before /:id
router.get('/user/mine', auth, async (req, res) => {
  try {
    const created = await Project.find({ creator: req.userId }).populate('members.user', 'name skills');
    const joined = await Project.find({ 'members.user': req.userId, creator: { $ne: req.userId } })
      .populate('creator', 'name').populate('members.user', 'name skills');
    res.json({ created, joined });
  } catch (err) {
    console.error('Get my projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email skills')
      .populate('members.user', 'name skills bio');
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, skillsNeeded, domain, teamSize } = req.body;
    const skillsArr = typeof skillsNeeded === 'string'
      ? skillsNeeded.split(',').map(s => s.trim()).filter(Boolean)
      : (skillsNeeded || []);

    const project = await Project.create({
      title, description, domain,
      skillsNeeded: skillsArr,
      teamSize: parseInt(teamSize) || 4,
      creator: req.userId,
      members: [{ user: req.userId, role: 'lead', status: 'accepted' }]
    });

    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: Object.values(err.errors).map(e => e.message) });
    }
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Request to join
router.post('/:id/join', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });

    const already = project.members.find(m => m.user.toString() === req.userId);
    if (already) return res.status(400).json({ error: 'Already requested or joined' });

    // Check if team is full
    const acceptedCount = project.members.filter(m => m.status === 'accepted').length;
    if (acceptedCount >= project.teamSize) {
      return res.status(400).json({ error: 'Team is full' });
    }

    project.members.push({ user: req.userId, role: req.body.role || 'member', status: 'pending' });
    await project.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Join project error:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    res.status(500).json({ error: 'Failed to join project' });
  }
});

// Accept member (creator only)
router.post('/:id/accept/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.creator.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const member = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Check team size limit
    const acceptedCount = project.members.filter(m => m.status === 'accepted').length;
    if (acceptedCount >= project.teamSize) {
      return res.status(400).json({ error: 'Team is full' });
    }

    member.status = 'accepted';
    if (req.body.role) member.role = req.body.role;
    await project.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Accept member error:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    res.status(500).json({ error: 'Failed to accept member' });
  }
});

// Reject member
router.post('/:id/reject/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.creator.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const member = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.status = 'rejected';
    await project.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Reject member error:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    res.status(500).json({ error: 'Failed to reject member' });
  }
});

// Leave project
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });

    project.members = project.members.filter(m => m.user.toString() !== req.userId);
    await project.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Leave project error:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    res.status(500).json({ error: 'Failed to leave project' });
  }
});

module.exports = router;
