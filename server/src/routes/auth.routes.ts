import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate, authSchemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(authSchemas.register),
  authController.register
);

authRouter.post(
  '/login',
  validate(authSchemas.login),
  authController.login
);

authRouter.post(
  '/refresh',
  validate(authSchemas.refresh),
  authController.refresh
);

authRouter.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

// Logout current session
authRouter.post(
  '/logout',
  authenticate,
  authController.logout
);

// Logout from all devices
authRouter.post(
  '/logout-all',
  authenticate,
  authController.logoutAll
);

// Email verification
authRouter.get(
  '/verify-email',
  validate(authSchemas.verifyEmail),
  authController.verifyEmail
);

authRouter.post(
  '/resend-verification',
  validate(authSchemas.resendVerification),
  authController.resendVerificationEmail
);

// Google OAuth
authRouter.get(
  '/google',
  authController.googleAuth
);

authRouter.get(
  '/google/callback',
  validate(authSchemas.googleCallback),
  authController.googleCallback
);





