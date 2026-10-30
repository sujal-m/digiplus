require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./config/db');
const { logger } = require('./config/logger');
const correlationId = require('./middleware/correlationId');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const meetingRoutes = require('./routes/meetings');
const handoverRoutes = require('./routes/handovers');
const taskRoutes = require('./routes/tasks');
const decisionRoutes = require('./routes/decisions');
const knowledgeRoutes = require('./routes/knowledge');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const activityRoutes = require('./routes/activity');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMIT' } },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: { message: 'AI rate limit exceeded. Please wait.', code: 'AI_RATE_LIMIT' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { message: 'Too many auth attempts', code: 'AUTH_RATE_LIMIT' } },
});

app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Custom middleware
app.use(correlationId);
app.use(requestLogger);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/activity', activityRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function start() {
  await connectDB();

  // If database is empty, auto-seed realistic organizational fixtures
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    logger.info('Database is empty. Automatically loading initial demonstration fixtures...');
    const { seedData } = require('./seed');
    await seedData();
    logger.info('Initial demo fixtures seeded successfully');
  }

  app.listen(PORT, () => {
    logger.info(`DigiPlus API server running on port ${PORT}`, { env: process.env.NODE_ENV });
  });
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('FATAL SERVER START ERROR:', err);
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  });
}

module.exports = app;
