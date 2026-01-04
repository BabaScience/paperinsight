import { redis } from '../config/redis.js';

/**
 * Cache Service for Redis-based caching
 * Provides caching for paper analysis, user profiles, and other frequently accessed data
 */
class CacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private readonly ANALYSIS_TTL = 86400; // 24 hours for analysis
  private readonly PROFILE_TTL = 1800; // 30 minutes for profiles

  /**
   * Generic get method
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) return null;
      return JSON.parse(cached) as T;
    } catch (error) {
      console.warn(`⚠️ Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic set method
   */
  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn(`⚠️ Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn(`⚠️ Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.warn(`⚠️ Cache invalidate error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  // ============================================
  // Paper Analysis Caching
  // ============================================

  private analysisKey(paperId: string): string {
    return `paper:analysis:${paperId}`;
  }

  async getPaperAnalysis(paperId: string): Promise<{
    summary: string;
    keyInsights: string[];
    methodology?: string;
    limitations?: string;
  } | null> {
    return this.get(this.analysisKey(paperId));
  }

  async setPaperAnalysis(
    paperId: string, 
    analysis: {
      summary: string;
      keyInsights: string[];
      methodology?: string;
      limitations?: string;
    }
  ): Promise<void> {
    await this.set(this.analysisKey(paperId), analysis, this.ANALYSIS_TTL);
  }

  async invalidatePaperAnalysis(paperId: string): Promise<void> {
    await this.del(this.analysisKey(paperId));
  }

  // ============================================
  // Paper Visuals Caching
  // ============================================

  private visualsKey(paperId: string): string {
    return `paper:visuals:${paperId}`;
  }

  async getPaperVisuals(paperId: string): Promise<{
    diagrams: Array<{
      type: string;
      title: string;
      description: string;
      code: string;
    }>;
  } | null> {
    return this.get(this.visualsKey(paperId));
  }

  async setPaperVisuals(
    paperId: string,
    visuals: {
      diagrams: Array<{
        type: string;
        title: string;
        description: string;
        code: string;
      }>;
    }
  ): Promise<void> {
    await this.set(this.visualsKey(paperId), visuals, this.ANALYSIS_TTL);
  }

  async invalidatePaperVisuals(paperId: string): Promise<void> {
    await this.del(this.visualsKey(paperId));
  }

  // ============================================
  // Paper Ideas Caching (context-specific)
  // ============================================

  private ideasKey(paperId: string, contextHash: string): string {
    return `paper:ideas:${paperId}:${contextHash}`;
  }

  /**
   * Generate a hash of user context for cache key
   */
  private hashContext(context: {
    researchField?: string;
    interests?: string[];
    currentProjects?: string;
  }): string {
    const str = JSON.stringify(context);
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async getPaperIdeas(
    paperId: string,
    userContext: {
      researchField?: string;
      interests?: string[];
      currentProjects?: string;
    }
  ): Promise<{
    ideas: Array<{
      title: string;
      description: string;
      difficulty: string;
      relevance: string;
      steps: string[];
      tools?: string[];
      relatedConcepts?: string[];
    }>;
  } | null> {
    const contextHash = this.hashContext(userContext);
    return this.get(this.ideasKey(paperId, contextHash));
  }

  async setPaperIdeas(
    paperId: string,
    userContext: {
      researchField?: string;
      interests?: string[];
      currentProjects?: string;
    },
    ideas: {
      ideas: Array<{
        title: string;
        description: string;
        difficulty: string;
        relevance: string;
        steps: string[];
        tools?: string[];
        relatedConcepts?: string[];
      }>;
    }
  ): Promise<void> {
    const contextHash = this.hashContext(userContext);
    await this.set(this.ideasKey(paperId, contextHash), ideas, this.ANALYSIS_TTL);
  }

  async invalidatePaperIdeas(paperId: string): Promise<void> {
    await this.invalidate(`paper:ideas:${paperId}:*`);
  }

  // ============================================
  // User Profile Caching
  // ============================================

  private profileKey(userId: string): string {
    return `user:profile:${userId}`;
  }

  async getUserProfile(userId: string): Promise<{
    researchField?: string;
    expertiseLevel?: string;
    interests?: string[];
    currentProjects?: string;
    preferredStyle?: string;
    preferredLanguage?: string;
    preferredModel?: string;
    tokenLimit?: number;
    bio?: string;
  } | null> {
    return this.get(this.profileKey(userId));
  }

  async setUserProfile(
    userId: string,
    profile: {
      researchField?: string;
      expertiseLevel?: string;
      interests?: string[];
      currentProjects?: string;
      preferredStyle?: string;
      preferredLanguage?: string;
      preferredModel?: string;
      tokenLimit?: number;
      bio?: string;
    }
  ): Promise<void> {
    await this.set(this.profileKey(userId), profile, this.PROFILE_TTL);
  }

  async invalidateUserProfile(userId: string): Promise<void> {
    await this.del(this.profileKey(userId));
  }

  // ============================================
  // Invalidate all cache for a paper
  // ============================================

  async invalidateAllPaperCache(paperId: string): Promise<void> {
    await Promise.all([
      this.invalidatePaperAnalysis(paperId),
      this.invalidatePaperVisuals(paperId),
      this.invalidatePaperIdeas(paperId),
    ]);
  }

  // ============================================
  // Cache Statistics (for monitoring)
  // ============================================

  async getStats(): Promise<{
    analysisKeys: number;
    visualsKeys: number;
    ideasKeys: number;
    profileKeys: number;
  }> {
    const [analysisKeys, visualsKeys, ideasKeys, profileKeys] = await Promise.all([
      redis.keys('paper:analysis:*'),
      redis.keys('paper:visuals:*'),
      redis.keys('paper:ideas:*'),
      redis.keys('user:profile:*'),
    ]);

    return {
      analysisKeys: analysisKeys.length,
      visualsKeys: visualsKeys.length,
      ideasKeys: ideasKeys.length,
      profileKeys: profileKeys.length,
    };
  }
}

export const cacheService = new CacheService();

