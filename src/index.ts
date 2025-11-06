import app from './app';
import config from './config/env';
import connectDB from './infrastructure/db/connection/database';
import mongoose from 'mongoose';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB (non-blocking for development)
    console.log('Connecting to MongoDB...');
    try {
      await connectDB();
      console.log('✅ MongoDB connected successfully');
    } catch (error: any) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.warn('⚠️  Server will start without database connection (development mode)');
      console.warn('⚠️  Database features will not work until MongoDB is connected');
    }

    // Start Express server
    const server = app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║       Evolvix Backend Server Running                ║
╠══════════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(42)}║
║  Port:        ${config.port.toString().padEnd(42)}║
║  Database:    ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected (Dev Mode)'.padEnd(42)}║
╚══════════════════════════════════════════════════════╝
      
      API Root: http://localhost:${config.port}
        `);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      server.close(() => {
        console.log('HTTP server closed');
        if (mongoose.connection.readyState === 1) {
          mongoose.connection.close().then(() => {
            console.log('MongoDB connection closed');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

