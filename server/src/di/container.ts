import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types.js';

// Import implementations
import { EmbeddingService } from '../services/embedding.service.js';
import { VectorService } from '../services/vector.service.js';
import { ChunkingService } from '../services/chunking.service.js';
import { PdfService } from '../services/pdf.service.js';
import { MinioService } from '../services/minio.service.js';
import { CacheService } from '../services/cache.service.js';
import { TokenBlacklistService } from '../services/token-blacklist.service.js';
import { TokenService } from '../services/token.service.js';
import { EmailService } from '../services/email.service.js';
import { LLMService } from '../services/llm/llm.service.js';
import { RagService } from '../services/rag.service.js';

/**
 * Create and configure the DI container
 */
function createContainer(): Container {
  const container = new Container({
    defaultScope: 'Singleton', // Most services should be singletons
  });

  // Bind services - using class types directly
  container.bind(TYPES.EmbeddingService).to(EmbeddingService);
  container.bind(TYPES.VectorService).to(VectorService);
  container.bind(TYPES.ChunkingService).to(ChunkingService);
  container.bind(TYPES.PdfService).to(PdfService);
  container.bind(TYPES.MinioService).to(MinioService);
  container.bind(TYPES.CacheService).to(CacheService);
  container.bind(TYPES.TokenBlacklistService).to(TokenBlacklistService);
  container.bind(TYPES.TokenService).to(TokenService);
  container.bind(TYPES.EmailService).to(EmailService);
  container.bind(TYPES.LLMService).to(LLMService);
  container.bind(TYPES.RagService).to(RagService);

  return container;
}

// Export singleton container instance
export const container = createContainer();

// Helper function to resolve services
export function getService<T>(type: symbol): T {
  return container.get<T>(type);
}

// Export typed service getters for convenience
export const services = {
  get embedding(): EmbeddingService {
    return container.get<EmbeddingService>(TYPES.EmbeddingService);
  },
  get vector(): VectorService {
    return container.get<VectorService>(TYPES.VectorService);
  },
  get chunking(): ChunkingService {
    return container.get<ChunkingService>(TYPES.ChunkingService);
  },
  get pdf(): PdfService {
    return container.get<PdfService>(TYPES.PdfService);
  },
  get minio(): MinioService {
    return container.get<MinioService>(TYPES.MinioService);
  },
  get cache(): CacheService {
    return container.get<CacheService>(TYPES.CacheService);
  },
  get tokenBlacklist(): TokenBlacklistService {
    return container.get<TokenBlacklistService>(TYPES.TokenBlacklistService);
  },
  get token(): TokenService {
    return container.get<TokenService>(TYPES.TokenService);
  },
  get email(): EmailService {
    return container.get<EmailService>(TYPES.EmailService);
  },
  get llm(): LLMService {
    return container.get<LLMService>(TYPES.LLMService);
  },
  get rag(): RagService {
    return container.get<RagService>(TYPES.RagService);
  },
};

