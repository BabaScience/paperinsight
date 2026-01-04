import 'reflect-metadata';
import { injectable } from 'inversify';
import { qdrantClient } from '../config/qdrant.js';
import { env } from '../config/env.js';
import { v5 as uuidv5 } from 'uuid';

// Namespace for generating consistent UUIDs from MongoDB ObjectIds
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

@injectable()
export class VectorService {
  private collectionName = env.QDRANT_COLLECTION;

  // Convert MongoDB ObjectId to valid UUID for Qdrant
  private toUUID(id: string): string {
    return uuidv5(id, NAMESPACE);
  }

  async upsertVectors(points: VectorPoint[]): Promise<void> {
    await qdrantClient.upsert(this.collectionName, {
      wait: true,
      points: points.map(p => ({
        id: this.toUUID(p.id),
        vector: p.vector,
        payload: {
          ...p.payload,
          originalId: p.id, // Store original ID for reference
        },
      })),
    });
  }

  async search(
    queryVector: number[],
    options: {
      limit?: number;
      filter?: Record<string, unknown>;
      scoreThreshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 5, filter, scoreThreshold = 0.3 } = options;

    const results = await qdrantClient.search(this.collectionName, {
      vector: queryVector,
      limit,
      filter: filter ? { must: [filter] } : undefined,
      score_threshold: scoreThreshold,
      with_payload: true,
    });

    return results.map(r => ({
      id: (r.payload as Record<string, unknown>)?.originalId as string || r.id as string,
      score: r.score,
      payload: r.payload as Record<string, unknown>,
    }));
  }

  async searchByPaperId(
    queryVector: number[],
    paperId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    return this.search(queryVector, {
      limit,
      filter: {
        key: 'paperId',
        match: { value: paperId },
      },
    });
  }

  async deleteByPaperId(paperId: string): Promise<void> {
    await qdrantClient.delete(this.collectionName, {
      filter: {
        must: [
          {
            key: 'paperId',
            match: { value: paperId },
          },
        ],
      },
    });
  }

  async getCollectionInfo(): Promise<{ vectorCount: number }> {
    const info = await qdrantClient.getCollection(this.collectionName);
    return {
      vectorCount: info.points_count ?? 0,
    };
  }
}

// Legacy export for backward compatibility
export const vectorService = new VectorService();
