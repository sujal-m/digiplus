const mongoose = require('mongoose');
const { logger } = require('./logger');

let mongodInstance = null;

/**
 * Connect to MongoDB with automatic in-memory fallback for zero-setup portability
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiplus';
  
  try {
    // Attempt standard connection with 10s timeout for cloud networks like Atlas
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('MongoDB connected successfully to primary URI', { uri: uri.replace(/\/\/.*@/, '//<credentials>@') });
    return;
  } catch (error) {
    logger.warn('Primary MongoDB connection failed, attempting in-memory database fallback...', { error: error.message });
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbName: 'digiplus'
      }
    });
    const memoryUri = mongodInstance.getUri();
    await mongoose.connect(memoryUri);
    logger.info('Connected to in-memory fallback MongoDB instance', { memoryUri });
  } catch (fallbackError) {
    logger.error('Failed to initialize MongoDB (both primary and in-memory fallback failed)', { error: fallbackError.message });
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}

module.exports = { connectDB, disconnectDB };
