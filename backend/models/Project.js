const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillsNeeded: [String],
  domain: { type: String, default: 'general' },
  teamSize: { type: Number, default: 4 },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],
  status: { type: String, enum: ['open', 'in-progress', 'completed'], default: 'open' },
}, { timestamps: true });

// Indexes for performance
projectSchema.index({ creator: 1 });
projectSchema.index({ domain: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ skillsNeeded: 1 });
// Text index for full-text search
projectSchema.index({ title: 'text', description: 'text', skillsNeeded: 'text' });

module.exports = mongoose.model('Project', projectSchema);
