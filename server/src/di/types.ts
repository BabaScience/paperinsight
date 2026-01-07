/**
 * Dependency Injection Types (Symbols)
 * Used as unique identifiers for service bindings
 */
export const TYPES = {
  // Core Services
  EmbeddingService: Symbol.for('EmbeddingService'),
  VectorService: Symbol.for('VectorService'),
  ChunkingService: Symbol.for('ChunkingService'),
  PdfService: Symbol.for('PdfService'),
  RagService: Symbol.for('RagService'),
  TokenService: Symbol.for('TokenService'),
  
  // Storage Services
  MinioService: Symbol.for('MinioService'),
  CacheService: Symbol.for('CacheService'),
  
  // Auth Services
  TokenBlacklistService: Symbol.for('TokenBlacklistService'),
  
  // Email Services
  EmailService: Symbol.for('EmailService'),
  
  // LLM Services
  LLMService: Symbol.for('LLMService'),
  OpenAIProvider: Symbol.for('OpenAIProvider'),
  DeepSeekProvider: Symbol.for('DeepSeekProvider'),
};


