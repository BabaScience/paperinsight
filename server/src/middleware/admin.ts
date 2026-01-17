import type { Response, NextFunction } from 'express';
import { User } from '../models/user.model.js';
import { ForbiddenError } from '../utils/errors.js';
import type { AuthRequest } from './auth.js';
import { redis } from '../config/redis.js';

// Cache TTL for admin status (5 minutes)
const ADMIN_CACHE_TTL = 300; // 5 minutes in seconds
const ADMIN_CACHE_KEY_PREFIX = 'admin:status:';

/**
 * Get admin status from cache or database
 */
async function getAdminStatus(userId: string): Promise<{ isAdmin: boolean; email: string } | null> {
  // Try cache first
  const cacheKey = `${ADMIN_CACHE_KEY_PREFIX}${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`⚠️  Admin cache read error for user ${userId}:`, error);
  }

  // Cache miss - query database
  const user = await User.findById(userId).select('isAdmin email').lean();
  if (!user) {
    return null;
  }

  const adminStatus = { isAdmin: user.isAdmin, email: user.email };

  // Cache the result
  try {
    await redis.setex(cacheKey, ADMIN_CACHE_TTL, JSON.stringify(adminStatus));
  } catch (error) {
    console.warn(`⚠️  Admin cache write error for user ${userId}:`, error);
  }

  return adminStatus;
}

/**
 * Invalidate admin status cache for a user
 * Call this when admin status changes
 */
export async function invalidateAdminCache(userId: string): Promise<void> {
  const cacheKey = `${ADMIN_CACHE_KEY_PREFIX}${userId}`;
  try {
    await redis.del(cacheKey);
  } catch (error) {
    console.warn(`⚠️  Admin cache invalidation error for user ${userId}:`, error);
  }
}

/**
 * Middleware to require admin privileges
 * Must be used after authenticate middleware
 * Uses Redis caching to reduce database queries
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

    const adminStatus = await getAdminStatus(req.userId);
    
    if (!adminStatus) {
      throw new ForbiddenError('User not found');
    }

    if (!adminStatus.isAdmin) {
      console.warn(`⚠️  Admin access denied for user: ${adminStatus.email} (userId: ${req.userId})`);
      console.warn(`   isAdmin field: ${adminStatus.isAdmin}`);
      throw new ForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}


