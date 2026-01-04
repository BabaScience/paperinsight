import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';
import { 
  generateTokens, 
  verifyRefreshToken,
  type AuthRequest 
} from '../middleware/auth.js';
import { 
  BadRequestError, 
  UnauthorizedError,
  ConflictError 
} from '../utils/errors.js';
import { tokenBlacklistService } from '../services/token-blacklist.service.js';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Create new user
      const user = new User({ email, password, name });
      await user.save();

      // Generate tokens
      const tokens = generateTokens(user._id.toString());

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
          },
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Generate tokens
      const tokens = generateTokens(user._id.toString());

      res.json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
          },
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const userId = verifyRefreshToken(refreshToken);

      // Check if user still exists
      const user = await User.findById(userId);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Generate new tokens
      const tokens = generateTokens(userId);

      res.json({
        status: 'success',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            profile: user.profile || {},
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (token) {
        // Decode token to get expiry time
        const decoded = jwt.decode(token) as { exp?: number } | null;
        if (decoded?.exp) {
          // Calculate remaining time until token expires
          const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0) {
            // Add token to blacklist
            await tokenBlacklistService.revokeToken(token, expiresIn);
          }
        }
      }

      res.json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.userId) {
        throw new UnauthorizedError('Not authenticated');
      }

      // Revoke all tokens for this user
      // Use 7 days (refresh token lifetime) as the revocation period
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      await tokenBlacklistService.revokeAllUserTokens(req.userId, sevenDaysInSeconds);

      res.json({
        status: 'success',
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();


