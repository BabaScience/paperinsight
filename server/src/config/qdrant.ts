import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env.js';

export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
});

export const VECTOR_SIZE = 3072; // text-embedding-3-large dimensions

export async function initializeQdrantCollection(): Promise<void> {
  // In development, add timeout to prevent hanging
  const timeout = env.NODE_ENV === 'development' ? 3000 : 10000;
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Qdrant initialization timeout')), timeout);
    });
    
    const initPromise = (async () => {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === env.QDRANT_COLLECTION
      );

      if (!exists) {
        await qdrantClient.createCollection(env.QDRANT_COLLECTION, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });
        console.log(`✅ Created Qdrant collection: ${env.QDRANT_COLLECTION}`);
      } else {
        console.log(`✅ Qdrant collection exists: ${env.QDRANT_COLLECTION}`);
      }
    })();
    
    await Promise.race([initPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Qdrant initialization timeout') {
      console.warn('⚠️  Qdrant initialization timed out - continuing without Qdrant');
    } else {
      console.warn('⚠️  Qdrant not available - vector search will not work until Qdrant is running');
    }
    console.warn('   Run: npm run docker:up (or start Docker Desktop first)');
  }
}

