const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/authMiddleware');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '15m' 
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { 
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' 
  });
  return { accessToken, refreshToken };
};

// Register
router.post('/register', authLimiter, validateRegister, async (req, res) => {
  try {
    const { name, email, password, college, year, skills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const skillsArr = typeof skills === 'string'
      ? skills.split(',').map(s => s.trim()).filter(Boolean)
      : (Array.isArray(skills) ? skills : []);
    
    const user = await User.create({
      name: name.trim(), 
      email: normalizedEmail, 
      password: hashed, 
      college: college ? college.trim() : '',
      year: year ? parseInt(year) : 1,
      skills: skillsArr
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      token: accessToken,
      refreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        skills: user.skills || [],
        college: user.college || '',
        year: user.year || 1,
        profileComplete: user.profileComplete || false
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ error: errors });
    }
    
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Store refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      token: accessToken,
      refreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        skills: user.skills,
        college: user.college,
        year: user.year,
        profileComplete: user.profileComplete
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ 
      token: accessToken, 
      refreshToken: newRefreshToken 
    });
  } catch (err) {
    console.error('Refresh error:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired. Please login again.' });
    }
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { refreshToken: null });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user (for token validation)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshToken');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Google OAuth Login
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    const normalizedEmail = email.toLowerCase();

    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });
    
    if (!user) {
      const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
      user = await User.create({
        name,
        email: normalizedEmail,
        googleId,
        avatar: picture || '',
        password: randomPass,
        skills: [],
        interests: [],
        college: '',
        year: 1,
        experienceLevel: 'beginner',
        profileComplete: false
      });
    } else if (!user.googleId) {
      return res.status(400).json({ 
        error: 'Email already registered with password. Please login with email/password.' 
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        skills: user.skills || [],
        college: user.college || '',
        year: user.year || 1,
        profileComplete: user.profileComplete || false
      }
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If email exists, reset link sent' });
    }

    if (user.googleId) {
      return res.status(400).json({ error: 'Google accounts cannot reset password. Use Google sign-in.' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    // In production, send email. For now, return token
    console.log(`Reset link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);
    
    res.json({ 
      message: 'If email exists, reset link sent',
      // Remove this in production
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || user.resetToken !== token || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.refreshToken = null; // Logout all devices
    await user.save();

    res.json({ message: 'Password reset successful. Please login.' });
  } catch (err) {
    console.error('Reset password error:', err);
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
