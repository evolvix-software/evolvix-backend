import mongoose from 'mongoose';
import config from '../../../config/env';

const connectDB = async (): Promise<void> => {
  try {
    if (!config.mongoURI) {
      throw new Error('MongoDB URI is not configured. Please set MONGODB_URI in your .env file');
    }
    
    const conn = await mongoose.connect(config.mongoURI);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error: any) {
    console.error('Error connecting to MongoDB:', error.message);
    // Don't throw - let the server start anyway in development
    if (config.nodeEnv === 'production') {
      throw error;
  }
  }
};

/**
 * Check if MongoDB is connected
 */
export const isMongoDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

export default connectDB;

