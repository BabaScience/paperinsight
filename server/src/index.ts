import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { redis } from './config/redis.js';
import { initializeQdrantCollection } from './config/qdrant.js';
import { initializeMinio } from './config/minio.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { paperRouter } from './routes/paper.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { setupSocketHandlers } from './socket/index.js';
import { initializeWorkers } from './workers/index.js';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://localhost:3000'] 
      : [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://localhost:3000'] 
    : [],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/papers', paperRouter);
app.use('/api/profile', profileRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  console.log('\nShutting down gracefully...');
  
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  
  await redis.quit();
  console.log('Redis connection closed');
  
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to databases
    await connectDatabase();
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB. Is it running?');
    console.error('   Run: npm run docker:up');
    process.exit(1);
  }

  // Initialize Qdrant (non-fatal if not available)
  await initializeQdrantCollection();
  
  // Initialize MinIO (non-fatal if not available)
  await initializeMinio();
  
  // Initialize background workers
  initializeWorkers();
  
  // Setup WebSocket handlers
  setupSocketHandlers(io);
  
  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔧 Environment: ${env.NODE_ENV}\n`);
  });
}

startServer();

export { io };
