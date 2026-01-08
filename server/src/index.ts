// Must be first import for Inversify decorators to work
import 'reflect-metadata';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { redis } from './config/redis.js';
import { initializeQdrantCollection } from './config/qdrant.js';
import { initializeMinio } from './config/minio.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rate-limit.js';
import { authRouter } from './routes/auth.routes.js';
import { paperRouter } from './routes/paper.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { setupSocketHandlers } from './socket/index.js';
import { initializeWorkers } from './workers/index.js';

const app = express();
const httpServer = createServer(app);

// CORS origins based on environment
const corsOrigins = env.NODE_ENV === 'development' 
  ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
  : process.env.CORS_ORIGINS?.split(',') || ['*'];

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com', 'https://api.deepseek.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));

// CORS
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 86400, // 24 hours
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL Injection Protection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`🛡️ Sanitized potentially malicious field: ${key} from ${req.ip}`);
  },
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with Rate Limiting
app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/papers', apiRateLimiter, paperRouter);
app.use('/api/profile', apiRateLimiter, profileRouter);
app.use('/api/admin', adminRouter); // Admin routes have their own rate limiting logic

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
