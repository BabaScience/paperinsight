import OpenAI from 'openai';
import { get_encoding } from 'tiktoken';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;
const CACHE_TTL = 60 * 60 * 24 * 30; // 30 days
const MAX_TOKENS_PER_TEXT = 8000; // Leave some buffer from 8192 limit
const MAX_TOKENS_PER_BATCH = 8000; // Safe batch limit

class EmbeddingService {
  private encoding = get_encoding('cl100k_base');

  private ensureString(text: unknown): string {
    if (typeof text === 'string') {
      return text;
    }
    if (text === null || text === undefined) {
      return '';
    }
    return String(text);
  }

  private countTokens(text: string): number {
    const safeText = this.ensureString(text);
    if (!safeText) return 0;
    return this.encoding.encode(safeText).length;
  }

  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const safeText = this.ensureString(text);
    if (!safeText) return '';
    
    const tokens = this.encoding.encode(safeText);
    if (tokens.length <= maxTokens) {
      return safeText;
    }
    // Truncate and decode back to string
    const truncatedTokens = tokens.slice(0, maxTokens);
    const decoded = this.encoding.decode(truncatedTokens);
    // Convert Uint8Array to string
    return new TextDecoder().decode(decoded);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Truncate if too long
    const truncatedText = this.truncateToTokenLimit(text, MAX_TOKENS_PER_TEXT);
    
    // Check cache first
    const cacheKey = this.getCacheKey(truncatedText);
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedText,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0]?.embedding;
    
    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }

    // Cache the result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(embedding));

    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Filter out empty/invalid texts and truncate
    const truncatedTexts = texts
      .map(t => this.truncateToTokenLimit(t, MAX_TOKENS_PER_TEXT))
      .map(t => t || 'empty'); // Ensure no empty strings sent to API
    
    // Check cache for all texts
    const cacheKeys = truncatedTexts.map(t => this.getCacheKey(t));
    const cachedResults = await redis.mget(...cacheKeys);
    
    const embeddings: (number[] | null)[] = cachedResults.map(r => 
      r ? JSON.parse(r) : null
    );
    
    // Find texts that need embedding
    const textsToEmbed: { index: number; text: string; tokens: number }[] = [];
    truncatedTexts.forEach((text, index) => {
      if (!embeddings[index]) {
        textsToEmbed.push({ 
          index, 
          text,
          tokens: this.countTokens(text)
        });
      }
    });

    if (textsToEmbed.length > 0) {
      // Process in batches that respect token limits
      const batches = this.createTokenSafeBatches(textsToEmbed);
      
      for (const batch of batches) {
        try {
          const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batch.map(t => t.text),
            dimensions: EMBEDDING_DIMENSIONS,
          });

          // Map results back to original positions
          for (let i = 0; i < response.data.length; i++) {
            const item = batch[i];
            const embedding = response.data[i]?.embedding;
            
            if (item && embedding) {
              embeddings[item.index] = embedding;
              
              // Cache the new embedding
              const cacheKey = this.getCacheKey(item.text);
              await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(embedding));
            }
          }
        } catch (error) {
          console.error('Batch embedding error, falling back to individual processing:', error);
          // Fall back to processing one at a time
          for (const item of batch) {
            try {
              const embedding = await this.generateEmbedding(item.text);
              embeddings[item.index] = embedding;
            } catch (e) {
              console.error(`Failed to embed text at index ${item.index}:`, e);
              // Create a zero embedding as fallback
              embeddings[item.index] = new Array(EMBEDDING_DIMENSIONS).fill(0);
            }
          }
        }
      }
    }

    return embeddings.filter((e): e is number[] => e !== null);
  }

  private createTokenSafeBatches(
    items: { index: number; text: string; tokens: number }[]
  ): { index: number; text: string; tokens: number }[][] {
    const batches: { index: number; text: string; tokens: number }[][] = [];
    let currentBatch: { index: number; text: string; tokens: number }[] = [];
    let currentTokens = 0;

    for (const item of items) {
      // If single item exceeds limit, it goes in its own batch (already truncated)
      if (item.tokens >= MAX_TOKENS_PER_BATCH) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentTokens = 0;
        }
        batches.push([item]);
        continue;
      }

      // If adding this item would exceed limit, start new batch
      if (currentTokens + item.tokens > MAX_TOKENS_PER_BATCH) {
        batches.push(currentBatch);
        currentBatch = [item];
        currentTokens = item.tokens;
      } else {
        currentBatch.push(item);
        currentTokens += item.tokens;
      }
    }

    // Don't forget the last batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private getCacheKey(text: string): string {
    // Create a simple hash of the text for the cache key
    const hash = Buffer.from(text).toString('base64').slice(0, 32);
    return `embedding:${hash}`;
  }
}

export const embeddingService = new EmbeddingService();
