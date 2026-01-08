import 'reflect-metadata';
import { injectable } from 'inversify';
import { User } from '../models/user.model.js';
import { emailService } from './email.service.js';
import { env } from '../config/env.js';

export interface TokenUsageInfo {
  used: number;
  allowance: number;
  remaining: number;
  percentageUsed: number;
  hasReachedLimit: boolean;
  pendingRequest: boolean;
}

// Default token allowance from env
const DEFAULT_ALLOWANCE = env.USER_TOKEN_ALLOWANCE;

@injectable()
export class TokenService {
  /**
   * Ensure token usage is initialized for a user
   * This handles legacy users who don't have tokenUsage set
   */
  private async ensureTokenUsageInitialized(userId: string): Promise<void> {
    const user = await User.findById(userId).select('tokenUsage').lean();
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if tokenUsage needs initialization
    const needsInit = !user.tokenUsage || 
                      user.tokenUsage.allowance === undefined || 
                      user.tokenUsage.allowance === null;

    if (needsInit) {
      console.log(`🔧 Initializing token usage for user ${userId} with ${DEFAULT_ALLOWANCE} tokens`);
      await User.findByIdAndUpdate(userId, {
        $set: {
          'tokenUsage.used': user.tokenUsage?.used || 0,
          'tokenUsage.allowance': DEFAULT_ALLOWANCE,
          'tokenUsage.pendingRequest': user.tokenUsage?.pendingRequest || false,
          'tokenUsage.lastResetAt': user.tokenUsage?.lastResetAt || new Date(),
        }
      });
    }
  }

  /**
   * Get token usage info for a user
   */
  async getUsageInfo(userId: string): Promise<TokenUsageInfo> {
    // Ensure token usage is initialized first
    await this.ensureTokenUsageInitialized(userId);

    const user = await User.findById(userId).select('tokenUsage isAdmin').lean();
    
    if (!user) {
      throw new Error('User not found');
    }

    // Admin users have unlimited tokens
    if (user.isAdmin) {
      const used = user.tokenUsage?.used ?? 0;
      return {
        used,
        allowance: Number.MAX_SAFE_INTEGER,
        remaining: Number.MAX_SAFE_INTEGER,
        percentageUsed: 0,
        hasReachedLimit: false,
        pendingRequest: false,
      };
    }

    const used = user.tokenUsage?.used ?? 0;
    const allowance = user.tokenUsage?.allowance ?? DEFAULT_ALLOWANCE;
    const pendingRequest = user.tokenUsage?.pendingRequest ?? false;
    const remaining = Math.max(0, allowance - used);
    
    return {
      used,
      allowance,
      remaining,
      percentageUsed: allowance > 0 ? (used / allowance) * 100 : 0,
      hasReachedLimit: used >= allowance,
      pendingRequest,
    };
  }

  /**
   * Check if user has enough tokens for an operation
   */
  async canUseTokens(userId: string, requiredTokens: number): Promise<{ allowed: boolean; info: TokenUsageInfo }> {
    const user = await User.findById(userId).select('isAdmin').lean();
    
    // Admin users always allowed
    if (user?.isAdmin) {
      const info = await this.getUsageInfo(userId);
      return {
        allowed: true,
        info,
      };
    }

    const info = await this.getUsageInfo(userId);
    return {
      allowed: info.remaining >= requiredTokens,
      info,
    };
  }

  /**
   * Record token usage for a user with optimistic locking
   * Uses version field to prevent race conditions
   * Admin users still tracked but not enforced
   */
  async recordUsage(userId: string, tokensUsed: number): Promise<TokenUsageInfo> {
    const MAX_RETRIES = 3;
    let retries = 0;

    // Ensure token usage is initialized first
    await this.ensureTokenUsageInitialized(userId);

    // Check if user is admin
    const userCheck = await User.findById(userId).select('isAdmin').lean();
    const isAdmin = userCheck?.isAdmin ?? false;

    while (retries < MAX_RETRIES) {
      const user = await User.findById(userId).select('tokenUsage').lean();

      if (!user) {
        throw new Error('User not found');
      }

      const currentUsed = user.tokenUsage?.used ?? 0;
      const currentVersion = user.tokenUsage?.version ?? 0;
      const newUsed = currentUsed + tokensUsed;

      // Atomic update with version check (optimistic locking)
      const result = await User.findOneAndUpdate(
        {
          _id: userId,
          'tokenUsage.version': currentVersion,
        },
        {
          $set: { 'tokenUsage.used': newUsed },
          $inc: { 'tokenUsage.version': 1 },
        },
        { new: true }
      ).select('tokenUsage').lean();

      if (result) {
        // Update succeeded
        const used = result.tokenUsage?.used ?? 0;
        const allowance = result.tokenUsage?.allowance ?? DEFAULT_ALLOWANCE;
        const pendingRequest = result.tokenUsage?.pendingRequest ?? false;
        const remaining = Math.max(0, allowance - used);

        if (isAdmin) {
          console.log(`📊 Token usage recorded (admin): +${tokensUsed} for user ${userId} (${used} total)`);
          return {
            used,
            allowance: Number.MAX_SAFE_INTEGER,
            remaining: Number.MAX_SAFE_INTEGER,
            percentageUsed: 0,
            hasReachedLimit: false,
            pendingRequest,
          };
        }

        console.log(`📊 Token usage recorded: +${tokensUsed} for user ${userId} (${used}/${allowance})`);

        return {
          used,
          allowance,
          remaining,
          percentageUsed: allowance > 0 ? (used / allowance) * 100 : 0,
          hasReachedLimit: used >= allowance,
          pendingRequest,
        };
      }

      // Version mismatch - another request updated concurrently
      retries++;
      console.warn(`⚠️ Token usage update conflict for user ${userId}, retry ${retries}/${MAX_RETRIES}`);
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 50 * retries));
    }

    throw new Error('Failed to record token usage after retries - concurrent update conflict');
  }

  /**
   * Request token extension
   */
  async requestExtension(userId: string, message?: string): Promise<{ success: boolean; message: string }> {
    const user = await User.findById(userId).lean();
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if there's already a pending request
    if (user.tokenUsage?.pendingRequest) {
      return {
        success: false,
        message: 'You already have a pending token extension request. Please wait for it to be processed.',
      };
    }

    // Mark request as pending
    await User.findByIdAndUpdate(userId, {
      'tokenUsage.pendingRequest': true,
      'tokenUsage.pendingRequestAt': new Date(),
    });

    // Send email to admin
    const emailSent = await emailService.sendTokenExtensionRequest(
      { id: userId, name: user.name, email: user.email },
      user.tokenUsage?.used || 0,
      user.tokenUsage?.allowance || DEFAULT_ALLOWANCE,
      message
    );

    if (!emailSent) {
      console.warn('⚠️ Token request logged but email notification may have failed');
    }

    return {
      success: true,
      message: 'Your token extension request has been submitted. We will review it and get back to you via email.',
    };
  }

  /**
   * Approve token extension (admin function)
   */
  async approveExtension(userId: string, newAllowance: number, resetUsage = false): Promise<void> {
    const update: Record<string, unknown> = {
      'tokenUsage.allowance': newAllowance,
      'tokenUsage.pendingRequest': false,
      'tokenUsage.pendingRequestAt': null,
    };

    if (resetUsage) {
      update['tokenUsage.used'] = 0;
      update['tokenUsage.lastResetAt'] = new Date();
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).lean();

    if (!user) {
      throw new Error('User not found');
    }

    // Send notification to user
    await emailService.sendTokenExtensionApproved(
      { name: user.name, email: user.email },
      newAllowance
    );

    console.log(`✅ Token extension approved for user ${userId}: ${newAllowance} tokens`);
  }

  /**
   * Reset user's token usage (can be used for monthly resets)
   */
  async resetUsage(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      'tokenUsage.used': 0,
      'tokenUsage.lastResetAt': new Date(),
    });

    console.log(`🔄 Token usage reset for user ${userId}`);
  }
}

export const tokenService = new TokenService();

