import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoURI: string;
  corsOrigin?: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoURI: process.env.MONGO_DB || process.env.MONGODB_URI || 'mongodb://localhost:27017/evolvix',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Validate required environment variables
const requiredEnvVars = process.env.NODE_ENV === 'production' ? ['MONGO_DB', 'MONGODB_URI'] : [];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName] && process.env.NODE_ENV === 'production') {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

export default config;

