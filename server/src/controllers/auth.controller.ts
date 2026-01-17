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
import { GoogleOAuthService } from '../services/google-oauth.service.js';
import crypto from 'crypto';

class AuthController {
  private googleOAuthService: GoogleOAuthService;

  constructor() {
    this.googleOAuthService = new GoogleOAuthService();
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // Check if it's a Google account
        if (existingUser.authProvider === 'google') {
          throw new ConflictError('An account with this email already exists. Please sign in with Google instead.');
        }
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

      // Send welcome email
      await emailService.sendWelcomeEmail({
        name: user.name,
        email: user.email,
      });

      res.status(201).json({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            isAdmin: user.isAdmin || false,
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

      // Check if user is Google-only account
      if (user.authProvider === 'google' && !user.password) {
        throw new UnauthorizedError('This account uses Google sign-in. Please sign in with Google instead.');
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if email is verified (skip for Google users)
      if (user.authProvider !== 'google' && !user.emailVerified) {
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
            isAdmin: user.isAdmin || false,
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

      // Check if email is verified (skip for Google users)
      if (user.authProvider !== 'google' && !user.emailVerified) {
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
            isAdmin: user.isAdmin || false,
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

  /**
   * Initiate Google OAuth flow
   */
  googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.googleOAuthService.isConfigured()) {
        throw new BadRequestError(
          'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
        );
      }

      // Generate state token for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in session/cookie (optional - can also verify in callback)
      // For now, we'll include it in the redirect and verify it in callback
      
      // Generate Google OAuth URL
      const authUrl = this.googleOAuthService.getAuthUrl(state);
      
      // Redirect to Google
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle Google OAuth callback
   */
  googleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, error: oauthError, state } = req.query;

      console.log('🔐 Google OAuth callback received:', { 
        hasCode: !!code, 
        hasError: !!oauthError, 
        error: oauthError,
        state 
      });

      // Handle OAuth errors
      if (oauthError) {
        console.error('❌ OAuth error from Google:', oauthError);
        return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_cancelled`);
      }

      if (!code || typeof code !== 'string') {
        console.error('❌ Missing or invalid authorization code');
        return res.redirect(`${env.FRONTEND_URL}/login?error=invalid_code`);
      }

      if (!this.googleOAuthService.isConfigured()) {
        console.error('❌ Google OAuth not configured');
        return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);
      }

      console.log('🔄 Exchanging authorization code for tokens...');
      // Exchange code for tokens
      const tokens = await this.googleOAuthService.getTokens(code);
      console.log('✅ Tokens received successfully');
      
      console.log('🔄 Verifying ID token...');
      // Get user info from Google (using ID token is more secure)
      const googleUser = await this.googleOAuthService.verifyIdToken(tokens.id_token);
      console.log('✅ ID token verified, user:', { id: googleUser.id, email: googleUser.email, name: googleUser.name });

      // Check if user exists by Google ID
      console.log('🔄 Checking for existing user with Google ID:', googleUser.id);
      let user = await User.findOne({ googleId: googleUser.id });

      if (user) {
        console.log('✅ Found existing Google user:', user.email);
        // Existing Google user - login
        // Update email verified status if needed
        if (!user.emailVerified) {
          await User.updateOne({ _id: user._id }, { $set: { emailVerified: true } });
          user.emailVerified = true;
        }
      } else {
        // Check if user exists by email (auto-link)
        console.log('🔄 Checking for existing user with email:', googleUser.email.toLowerCase());
        user = await User.findOne({ email: googleUser.email.toLowerCase() });

        if (user) {
          console.log('✅ Found existing user, linking Google account');
          // Link Google account to existing account
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                googleId: googleUser.id,
                authProvider: 'google',
                emailVerified: true, // Google emails are verified
              },
            }
          );
          user.googleId = googleUser.id;
          user.authProvider = 'google';
          user.emailVerified = true;
        } else {
          console.log('🆕 Creating new user');
          // Create new user
          user = new User({
            email: googleUser.email.toLowerCase(),
            name: googleUser.name,
            googleId: googleUser.id,
            authProvider: 'google',
            emailVerified: true, // Google emails are pre-verified
            tokenUsage: {
              used: 0,
              allowance: env.USER_TOKEN_ALLOWANCE || 50000,
              lastResetAt: new Date(),
              pendingRequest: false,
              version: 0,
            },
          });
          await user.save();
          console.log('✅ New user created:', user.email);

          // Send welcome email for new Google OAuth users
          try {
            await emailService.sendWelcomeEmail({
              name: user.name,
              email: user.email,
            });
            console.log('✅ Welcome email sent');
          } catch (emailError) {
            console.error('⚠️ Failed to send welcome email (non-critical):', emailError);
            // Don't fail the OAuth flow if email fails
          }
        }
      }

      console.log('🔄 Generating JWT tokens...');
      // Generate JWT tokens
      const jwtTokens = generateTokens(user._id.toString());
      console.log('✅ JWT tokens generated');

      // Validate FRONTEND_URL is set
      if (!env.FRONTEND_URL) {
        console.error('❌ FRONTEND_URL is not set in environment variables');
        throw new Error('FRONTEND_URL environment variable is not configured');
      }

      // Redirect to frontend with tokens in query params
      // In production, consider using httpOnly cookies instead
      const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/google/callback`);
      redirectUrl.searchParams.set('accessToken', jwtTokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', jwtTokens.refreshToken);
      redirectUrl.searchParams.set('userId', user._id.toString());

      // Log redirect details for debugging (without exposing full tokens)
      console.log('✅ Redirecting to frontend callback');
      console.log('   Frontend URL:', env.FRONTEND_URL);
      console.log('   User ID:', user._id.toString());
      console.log('   Access token length:', jwtTokens.accessToken.length);
      console.log('   Refresh token length:', jwtTokens.refreshToken.length);
      console.log('   Full redirect URL (first 100 chars):', redirectUrl.toString().substring(0, 100) + '...');
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const encodedError = encodeURIComponent(errorMessage);
      console.error('❌ Redirecting to login with error:', encodedError);
      res.redirect(`${env.FRONTEND_URL}/login?error=${encodedError}`);
    }
  };
}

export const authController = new AuthController();


