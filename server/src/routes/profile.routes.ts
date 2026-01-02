import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { validate, profileSchemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

export const profileRouter = Router();

// All profile routes require authentication
profileRouter.use(authenticate);

// GET /api/profile - Get current user's profile
profileRouter.get('/', profileController.getProfile);

// PUT /api/profile - Replace entire profile
profileRouter.put(
  '/',
  validate(profileSchemas.update),
  profileController.updateProfile
);

// PATCH /api/profile - Partially update profile
profileRouter.patch(
  '/',
  validate(profileSchemas.update),
  profileController.patchProfile
);

// DELETE /api/profile - Reset profile to defaults
profileRouter.delete('/', profileController.resetProfile);

// GET /api/profile/tokens - Get token usage info
profileRouter.get('/tokens', profileController.getTokenUsage);

// POST /api/profile/tokens/request - Request token extension
profileRouter.post('/tokens/request', profileController.requestTokenExtension);

