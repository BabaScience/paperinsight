import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocketHandlers(io: Server): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}, User: ${socket.userId}`);
    
    // Join user-specific room for targeted updates
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
    
    // Paper-specific room for real-time updates
    socket.on('paper:subscribe', (paperId: string) => {
      socket.join(`paper:${paperId}`);
      console.log(`Socket ${socket.id} subscribed to paper:${paperId}`);
    });
    
    socket.on('paper:unsubscribe', (paperId: string) => {
      socket.leave(`paper:${paperId}`);
      console.log(`Socket ${socket.id} unsubscribed from paper:${paperId}`);
    });
  });

  console.log('✅ WebSocket handlers initialized');
}

// Helper to emit events to specific user
export function emitToUser(io: Server, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data);
}

// Helper to emit events to paper subscribers
export function emitToPaper(io: Server, paperId: string, event: string, data: unknown): void {
  io.to(`paper:${paperId}`).emit(event, data);
}







