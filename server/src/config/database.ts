import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * MongoDB connection options with proper pooling configuration
 * Optimized for production workloads
 */
const mongooseOptions: mongoose.ConnectOptions = {
  // Connection pool settings
  maxPoolSize: 10,           // Maximum number of connections in the pool
  minPoolSize: 5,            // Minimum number of connections to keep
  
  // Timeout settings
  socketTimeoutMS: 45000,            // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 5000,    // Fail fast if no server available
  connectTimeoutMS: 10000,           // Connection timeout
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000,       // Check server health every 10 seconds
  
  // Write concern for data safety
  writeConcern: {
    w: 'majority',                   // Wait for majority of replicas to acknowledge
    wtimeout: 5000,                  // Timeout for write concern
  },
  
  // Read preference - must be 'primary' to support transactions
  readPreference: 'primary',
  
  // Retry settings
  retryWrites: true,                 // Retry failed writes once
  retryReads: true,                  // Retry failed reads once
  
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





