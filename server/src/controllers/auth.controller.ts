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
import { emailService } from '../services/email.service.js';
import crypto from 'crypto';

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
      
      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      await emailService.sendVerificationEmail(
        { name: user.name, email: user.email },
        verificationToken,
        env.FRONTEND_URL
      );

      res.status(201).json({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          },
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

      // Check if email is verified
      if (!user.emailVerified) {
        throw new UnauthorizedError('Please verify your email address before logging in. Check your inbox for the verification link.');
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
            emailVerified: user.emailVerified,
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

      // Check if email is verified
      if (!user.emailVerified) {
        throw new UnauthorizedError('Please verify your email address before accessing this resource.');
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
            emailVerified: user.emailVerified,
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

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        throw new BadRequestError('Verification token is required');
      }

      // Hash the token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with this token and check if it's not expired
      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired verification token');
      }

      // Update using updateOne to avoid Mongoose validation issues
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            emailVerified: true,
          },
          $unset: {
            emailVerificationToken: '',
            emailVerificationTokenExpires: '',
          },
        }
      );

      // Send success email
      await emailService.sendVerificationSuccessEmail({
        name: user.name,
        email: user.email,
      });

      res.json({
        status: 'success',
        message: 'Email verified successfully. You can now log in.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new BadRequestError('Email is required');
      }

      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists or not for security
        res.json({
          status: 'success',
          message: 'If an account with this email exists and is not verified, a verification email has been sent.',
        });
        return;
      }

      if (user.emailVerified) {
        throw new BadRequestError('Email is already verified');
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update using updateOne to avoid Mongoose validation issues
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            emailVerificationToken: hashedToken,
            emailVerificationTokenExpires: expiresAt,
          },
        }
      );

      // Send verification email
      await emailService.sendVerificationEmail(
        { name: user.name, email: user.email },
        verificationToken,
        env.FRONTEND_URL
      );

      res.json({
        status: 'success',
        message: 'Verification email sent. Please check your inbox.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();


