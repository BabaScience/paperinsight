import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import type { Request } from 'express';
import type { AuthRequest } from './auth.js';
import { User } from '../models/user.model.js';

/**
 * Helper to get a safe key from IP address (handles IPv6)
 */
function getIpKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  // Normalize IPv6 addresses by removing the port portion if present
  return ip.replace(/:\d+$/, '');
}

/**
 * Skip rate limiting for admin users
 */
async function skipIfAdmin(req: Request): Promise<boolean> {
  const authReq = req as AuthRequest;
  if (authReq.userId) {
    const user = await User.findById(authReq.userId).select('isAdmin').lean();
    return user?.isAdmin === true;
  }
  return false;
}

/**
 * Rate limiter for authentication endpoints
 * Strict limits to prevent brute force attacks
 * 5 attempts per 15 minutes per IP
 * Admin users bypass this limit
 */
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore expects a specific client type
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skip: skipIfAdmin,
  // Use default key generator to avoid IPv6 validation issues
  validate: { xForwardedForHeader: false },
});

/**
 * Rate limiter for general API endpoints
 * More lenient but still protective
 * 100 requests per minute per user (or IP if not authenticated)
 * Admin users bypass this limit
 */
export const apiRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore expects a specific client type
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:api:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    status: 'error',
    message: 'Too many requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfAdmin,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const authReq = req as AuthRequest;
    return authReq.userId || getIpKey(req);
  },
  validate: { xForwardedForHeader: false },
});

/**
 * Stricter rate limiter for resource-intensive operations
 * Like PDF uploads and AI queries
 * 10 requests per minute per user
 * Admin users bypass this limit
 */
export const heavyOperationRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore expects a specific client type
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:heavy:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    status: 'error',
    message: 'Too many requests for this operation, please wait before trying again',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfAdmin,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || getIpKey(req);
  },
  validate: { xForwardedForHeader: false },
});

/**
 * Rate limiter specifically for token extension requests
 * Very strict: 2 requests per hour
 * Admin users bypass this limit (though they don't need extensions)
 */
export const tokenExtensionRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - RedisStore expects a specific client type
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:token-ext:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2, // 2 requests per hour
  message: {
    status: 'error',
    message: 'You can only request token extensions twice per hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfAdmin,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.userId || getIpKey(req);
  },
  validate: { xForwardedForHeader: false },
});

