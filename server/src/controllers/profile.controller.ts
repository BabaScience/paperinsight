import type { Response, NextFunction } from 'express';
import { User, IUserProfile } from '../models/user.model.js';
import type { AuthRequest } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';
import { tokenService } from '../services/token.service.js';

class ProfileController {
  /**
   * Get the current user's profile
   */
  async getProfile(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await User.findById(req.userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        status: 'success',
        data: {
          profile: user.profile || {},
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        researchField,
        expertiseLevel,
        interests,
        currentProjects,
        preferredStyle,
        preferredLanguage,
        preferredModel,
        tokenLimit,
        bio,
      } = req.body;

      const profileUpdate: IUserProfile = {};

      // Only include fields that are provided
      if (researchField !== undefined) profileUpdate.researchField = researchField;
      if (expertiseLevel !== undefined) profileUpdate.expertiseLevel = expertiseLevel;
      if (interests !== undefined) profileUpdate.interests = interests;
      if (currentProjects !== undefined) profileUpdate.currentProjects = currentProjects;
      if (preferredStyle !== undefined) profileUpdate.preferredStyle = preferredStyle;
      if (preferredLanguage !== undefined) profileUpdate.preferredLanguage = preferredLanguage;
      if (preferredModel !== undefined) profileUpdate.preferredModel = preferredModel;
      if (tokenLimit !== undefined) profileUpdate.tokenLimit = tokenLimit;
      if (bio !== undefined) profileUpdate.bio = bio;

      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: { profile: profileUpdate } },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        status: 'success',
        data: {
          profile: user.profile || {},
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Partially update the current user's profile (merge with existing)
   */
  async patchProfile(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        researchField,
        expertiseLevel,
        interests,
        currentProjects,
        preferredStyle,
        preferredLanguage,
        preferredModel,
        tokenLimit,
        bio,
      } = req.body;

      const updateFields: Record<string, unknown> = {};

      // Only update fields that are provided
      if (researchField !== undefined) updateFields['profile.researchField'] = researchField;
      if (expertiseLevel !== undefined) updateFields['profile.expertiseLevel'] = expertiseLevel;
      if (interests !== undefined) updateFields['profile.interests'] = interests;
      if (currentProjects !== undefined) updateFields['profile.currentProjects'] = currentProjects;
      if (preferredStyle !== undefined) updateFields['profile.preferredStyle'] = preferredStyle;
      if (preferredLanguage !== undefined) updateFields['profile.preferredLanguage'] = preferredLanguage;
      if (preferredModel !== undefined) updateFields['profile.preferredModel'] = preferredModel;
      if (tokenLimit !== undefined) updateFields['profile.tokenLimit'] = tokenLimit;
      if (bio !== undefined) updateFields['profile.bio'] = bio;

      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        status: 'success',
        data: {
          profile: user.profile || {},
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset the current user's profile to defaults
   */
  async resetProfile(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: { profile: {} } },
        { new: true }
      );

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        status: 'success',
        message: 'Profile reset to defaults',
        data: {
          profile: {},
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get token usage info
   */
  async getTokenUsage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const usage = await tokenService.getUsageInfo(req.userId!);

      res.json({
        status: 'success',
        data: {
          tokenUsage: usage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request token extension
   */
  async requestTokenExtension(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { message } = req.body;
      
      const result = await tokenService.requestExtension(req.userId!, message);

      res.json({
        status: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const profileController = new ProfileController();

