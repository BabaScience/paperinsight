import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * MongoDB connection options with proper pooling configuration
 * Optimized for production workloads
 */
const mongooseOptions: mongoose.ConnectOptions = {
  // Connection pool settings - optimized for dev vs prod
  maxPoolSize: env.NODE_ENV === 'development' ? 5 : 10,  // Smaller pool in dev
  minPoolSize: env.NODE_ENV === 'development' ? 1 : 5,  // Don't pre-create connections in dev
  
  // Timeout settings - faster in development
  socketTimeoutMS: 45000,            // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: env.NODE_ENV === 'development' ? 3000 : 5000,  // Faster fail in dev
  connectTimeoutMS: env.NODE_ENV === 'development' ? 5000 : 10000,        // Faster timeout in dev
  
  // Heartbeat settings - less frequent in dev
  heartbeatFrequencyMS: env.NODE_ENV === 'development' ? 30000 : 10000,  // Less frequent checks in dev
  
  // Write concern for data safety
  writeConcern: {
    w: env.NODE_ENV === 'development' ? 1 : 'majority',  // Faster writes in dev
    wtimeout: 5000,
  },
  
  // Read preference - must be 'primary' to support transactions
  readPreference: 'primary',
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Auto-index in development only
  autoIndex: env.NODE_ENV === 'development',
};

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, mongooseOptions);
    
    console.log('✅ Connected to MongoDB with pool:', {
      maxPoolSize: mongooseOptions.maxPoolSize,
      minPoolSize: mongooseOptions.minPoolSize,
    });
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('📡 MongoDB connection established');
    });
    
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      // Implement circuit breaker pattern here if needed
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Mongoose will attempt to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB disconnect:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

/**
 * Get connection pool statistics (useful for monitoring)
 */
export function getPoolStats(): {
  isConnected: boolean;
  readyState: number;
  host: string | undefined;
  name: string | undefined;
} {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}





