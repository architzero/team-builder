const router = require('express').Router();
const User = require('../models/User');
const Match = require('../models/Match');
const auth = require('../middleware/authMiddleware');

// Find matches for a project based on skills needed
router.post('/find', auth, async (req, res) => {
  try {
    const { skillsNeeded, excludeIds } = req.body;
    
    if (!skillsNeeded || !Array.isArray(skillsNeeded) || skillsNeeded.length === 0) {
      return res.status(400).json({ error: 'Skills needed array is required' });
    }

    const exclude = [req.userId, ...(excludeIds || [])];

    // Find users whose skills overlap with needed skills
    const users = await User.find({
      _id: { $nin: exclude },
      availability: 'available',
      skills: { $in: skillsNeeded.map(s => new RegExp(s, 'i')) }
    }).select('-password -refreshToken').limit(10);

    // Score each user by how many needed skills they have
    const scored = users.map(u => {
      const matchedSkills = u.skills.filter(s =>
        skillsNeeded.some(needed => s.toLowerCase().includes(needed.toLowerCase()))
      );
      return {
        user: u,
        matchedSkills,
        score: matchedSkills.length
      };
    }).sort((a, b) => b.score - a.score);

    res.json(scored);
  } catch (err) {
    console.error('Find matches error:', err);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Get messages / matches for current user
router.get('/my-messages', auth, async (req, res) => {
  try {
    const received = await Match.find({ matched: req.userId })
      .populate('requester', 'name skills')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
    const sent = await Match.find({ requester: req.userId })
      .populate('matched', 'name skills')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
    res.json({ received, sent });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message/invite
router.post('/send', auth, async (req, res) => {
  try {
    const { matchedId, projectId, message, suggestedRole, reason, isAiDrafted } = req.body;

    if (!matchedId || !message) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }

    // Verify recipient exists
    const recipient = await User.findById(matchedId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Prevent sending to self
    if (matchedId === req.userId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    const match = await Match.create({
      requester: req.userId,
      matched: matchedId,
      project: projectId || null,
      message, suggestedRole, reason,
      isAiDrafted: isAiDrafted || false,
      status: 'sent'
    });

    res.status(201).json(match);
  } catch (err) {
    console.error('Send match error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Accept a message/invite
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only the recipient can accept
    if (match.matched.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    match.status = 'accepted';
    await match.save();
    
    res.json({ success: true, message: 'Invite accepted' });
  } catch (err) {
    console.error('Accept match error:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// Reject a message/invite
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only the recipient can reject
    if (match.matched.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    match.status = 'rejected';
    await match.save();
    
    res.json({ success: true, message: 'Invite rejected' });
  } catch (err) {
    console.error('Reject match error:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    res.status(500).json({ error: 'Failed to reject invite' });
  }
});

module.exports = router;
