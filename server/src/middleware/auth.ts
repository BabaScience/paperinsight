import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { tokenBlacklistService } from '../services/token-blacklist.service.js';
import { User } from '../models/user.model.js';

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  userId: string;
  type: 'access' | 'refresh';
  iat?: number;
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    
    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Check if token is blacklisted (individual token revocation)
    const isRevoked = await tokenBlacklistService.isRevoked(token);
    if (isRevoked) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Check if all user tokens were revoked before this token was issued
    if (decoded.iat) {
      const isUserRevoked = await tokenBlacklistService.isUserTokenRevokedBefore(
        decoded.userId,
        decoded.iat
      );
      if (isUserRevoked) {
        throw new UnauthorizedError('Session has been invalidated. Please log in again.');
      }
    }

    // Check if user's email is verified
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedError('Please verify your email address before accessing this resource.');
    }
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

export function generateTokens(userId: string): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY } as jwt.SignOptions
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY } as jwt.SignOptions
  );
  
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  
  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Invalid token type');
  }
  
  return decoded.userId;
}





