import mongoose from 'mongoose';
import { ENV } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  if (isConnected) return;

  const uri = ENV.MONGODB_URI;

  try {
    logger.info(`Attempting connection to MongoDB at: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    
    // Connect with 5 second timeout for fast fallback in dev if local MongoDB not running
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info('Successfully connected to MongoDB Database');
  } catch (primaryError: any) {
    logger.warn(`Could not connect to MongoDB URI (${primaryError.message}).`);

    // In development mode, try in-memory MongoDB server as fallback
    if (ENV.NODE_ENV !== 'production') {
      try {
        logger.info('Attempting fallback to in-memory MongoDB server for development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memoryUri = mongod.getUri();

        await mongoose.connect(memoryUri);
        isConnected = true;
        logger.info(`Connected to in-memory MongoDB at: ${memoryUri}`);

        process.on('SIGINT', async () => {
          await mongoose.disconnect();
          await mongod.stop();
          process.exit(0);
        });
        return;
      } catch (memError: any) {
        logger.warn(`In-memory MongoDB not started (${memError.message}).`);
      }
    }

    logger.error('CRITICAL: MongoDB is required. Please set MONGODB_URI in .env (e.g. MongoDB Atlas connection string)');
    throw primaryError;
  }
};
