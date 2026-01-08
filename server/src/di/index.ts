/**
 * Dependency Injection Module
 * 
 * This module provides IoC (Inversion of Control) capabilities using Inversify.
 * Services are bound to interfaces and can be injected into other services.
 * 
 * Usage:
 * 
 * 1. Import the services helper:
 *    import { services } from '../di/index.js';
 * 
 * 2. Use services:
 *    const embedding = services.embedding;
 *    const result = await embedding.generateEmbedding(text);
 * 
 * 3. For classes with @injectable decorator:
 *    @injectable()
 *    class MyService {
 *      constructor(
 *        @inject(TYPES.EmbeddingService) private embedding: IEmbeddingService
 *      ) {}
 *    }
 */

export { TYPES } from './types.js';
export { container, getService, services } from './container.js';
export type {
  IEmbeddingService,
  IVectorService,
  IChunkingService,
  IPdfService,
  IMinioService,
  ICacheService,
  ITokenBlacklistService,
  ITokenService,
  IEmailService,
  ILLMService,
  ILLMProvider,
  IRagService,
  ChatMessage,
  ChatParams,
  StreamCallbacks,
  QueryResult,
  AnalysisResult,
  VisualsResult,
  IdeasResult,
  TokenUsageInfo,
  ChunkResult,
  ParsedPDF,
} from './interfaces.js';



