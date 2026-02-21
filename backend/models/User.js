const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: { 
    type: String, 
    required: function() {
      return !this.googleId; // Password not required if using Google OAuth
    },
    minlength: [8, 'Password must be at least 8 characters']
  },
  bio: { 
    type: String, 
    default: '',
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  college: { 
    type: String, 
    default: '',
    maxlength: [100, 'College name cannot exceed 100 characters']
  },
  year: { 
    type: Number, 
    default: 1,
    min: [1, 'Year must be between 1 and 5'],
    max: [5, 'Year must be between 1 and 5']
  },
  skills: {
    type: [String],
    validate: {
      validator: function(arr) {
        return arr.length <= 20;
      },
      message: 'Cannot have more than 20 skills'
    }
  },
  experienceLevel: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'advanced', 'expert'],
      message: '{VALUE} is not a valid experience level'
    },
    default: 'beginner'
  },
  interests: {
    type: [String],
    validate: {
      validator: function(arr) {
        return arr.length <= 10;
      },
      message: 'Cannot have more than 10 interests'
    }
  },
  availability: { 
    type: String, 
    enum: {
      values: ['available', 'busy', 'in-team'],
      message: '{VALUE} is not a valid availability status'
    },
    default: 'available' 
  },
  github: { 
    type: String, 
    default: '',
    validate: {
      validator: function(v) {
        return !v || validator.isURL(v) || /^https?:\/\/(www\.)?github\.com\/[\w-]+\/?$/.test(v);
      },
      message: 'Please provide a valid GitHub URL'
    }
  },
  linkedin: { 
    type: String, 
    default: '',
    validate: {
      validator: function(v) {
        return !v || validator.isURL(v) || /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(v);
      },
      message: 'Please provide a valid LinkedIn URL'
    }
  },
  refreshToken: {
    type: String,
    default: null
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  avatar: {
    type: String,
    default: ''
  },
  profileComplete: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ skills: 1 });
userSchema.index({ interests: 1 });
userSchema.index({ availability: 1 });
userSchema.index({ college: 1 });
userSchema.index({ experienceLevel: 1 });
// Text index for full-text search
userSchema.index({ name: 'text', bio: 'text', skills: 'text', interests: 'text' });

// Check if profile is complete before saving
userSchema.pre('save', function(next) {
  if (this.isModified('skills') || this.isModified('college') || this.isModified('experienceLevel') || this.isModified('interests') || this.isNew) {
    this.profileComplete = !!(
      this.skills && this.skills.length > 0 && 
      this.college && this.college.trim() &&
      this.experienceLevel
    );
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
