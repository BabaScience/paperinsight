import 'reflect-metadata';
import { injectable } from 'inversify';
import { redis } from '../config/redis.js';

/**
 * Token Blacklist Service
 * Uses Redis to track revoked JWT tokens until they expire
 * This enables logout functionality and token revocation
 */
@injectable()
export class TokenBlacklistService {
  private readonly PREFIX = 'blacklist:token:';

  /**
   * Revoke a token by adding it to the blacklist
   * @param token - The JWT token to revoke
   * @param expiresInSeconds - How long until the token naturally expires
   */
  async revokeToken(token: string, expiresInSeconds: number): Promise<void> {
    // Store in Redis with TTL matching token expiry
    // No need to keep blacklisted tokens after they would have expired anyway
    await redis.setex(
      `${this.PREFIX}${this.hashToken(token)}`,
      expiresInSeconds,
      '1'
    );
  }

  /**
   * Check if a token has been revoked
   * @param token - The JWT token to check
   * @returns true if the token is revoked/blacklisted
   */
  async isRevoked(token: string): Promise<boolean> {
    const result = await redis.get(`${this.PREFIX}${this.hashToken(token)}`);
    return result === '1';
  }

  /**
   * Revoke all tokens for a user by storing a "revoke all before" timestamp
   * This is useful for "logout from all devices" functionality
   * @param userId - The user ID
   * @param expiresInSeconds - How long to maintain this revocation (should match max token lifetime)
   */
  async revokeAllUserTokens(userId: string, expiresInSeconds: number): Promise<void> {
    const timestamp = Date.now();
    await redis.setex(
      `${this.PREFIX}user:${userId}:revoked_before`,
      expiresInSeconds,
      timestamp.toString()
    );
  }

  /**
   * Check if all tokens issued before a certain time are revoked for a user
   * @param userId - The user ID
   * @param tokenIssuedAt - When the token was issued (iat claim)
   * @returns true if tokens issued at that time are revoked
   */
  async isUserTokenRevokedBefore(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const revokedBefore = await redis.get(`${this.PREFIX}user:${userId}:revoked_before`);
    if (!revokedBefore) {
      return false;
    }
    // Token issued before the revocation timestamp is considered revoked
    // Convert tokenIssuedAt from seconds to milliseconds for comparison
    return tokenIssuedAt * 1000 < parseInt(revokedBefore, 10);
  }

  /**
   * Hash a token for storage to save space and add a layer of security
   * We don't need to store the full token, just enough to identify it
   */
  private hashToken(token: string): string {
    // Use a simple hash - just the last 32 characters of the token
    // JWTs are base64 encoded so this provides sufficient uniqueness
    return token.slice(-32);
  }

  /**
   * Get the number of blacklisted tokens (for monitoring)
   */
  async getBlacklistCount(): Promise<number> {
    const keys = await redis.keys(`${this.PREFIX}*`);
    // Exclude user revocation entries
    return keys.filter(k => !k.includes(':user:')).length;
  }
}

export const tokenBlacklistService = new TokenBlacklistService();

