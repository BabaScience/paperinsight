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





