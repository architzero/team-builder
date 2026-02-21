require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// ── Security Middleware ──
app.use(helmet());

// ── CORS Configuration ──
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

console.log('🔒 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Allow any localhost or 127.0.0.1 origin in development
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: ${origin}`);
      console.error(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ── Body Parser ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ──
app.use('/api/', apiLimiter);

// ── MongoDB Connection ──
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.log('Retrying in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

connectDB();

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/match', require('./routes/match'));
app.use('/api/ai', require('./routes/aiAgent'));

// ── Health Check ──
app.get('/', (req, res) => res.json({ 
  status: 'TeamBuilder API running',
  version: '2.0.0',
  timestamp: new Date().toISOString()
}));

app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => ({ field: e.path, message: e.message }))
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ── Start Server ──
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
