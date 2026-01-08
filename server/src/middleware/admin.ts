import type { Response, NextFunction } from 'express';
import { User } from '../models/user.model.js';
import { ForbiddenError } from '../utils/errors.js';
import type { AuthRequest } from './auth.js';

/**
 * Middleware to require admin privileges
 * Must be used after authenticate middleware
 */
export async function requireAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      throw new ForbiddenError('Authentication required');
    }

    const user = await User.findById(req.userId).select('isAdmin email').lean();
    
    if (!user) {
      throw new ForbiddenError('User not found');
    }

    if (!user.isAdmin) {
      console.warn(`⚠️  Admin access denied for user: ${user.email} (userId: ${req.userId})`);
      console.warn(`   isAdmin field: ${user.isAdmin}`);
      throw new ForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}


