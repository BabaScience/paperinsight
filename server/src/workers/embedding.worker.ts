import type { Job } from 'bullmq';
import { Paper } from '../models/paper.model.js';
import { Chunk } from '../models/chunk.model.js';
import { embeddingService } from '../services/embedding.service.js';
import { vectorService } from '../services/vector.service.js';
import { io } from '../index.js';
import { emitToPaper } from '../socket/index.js';

export interface EmbeddingJobData {
  paperId: string;
  userId: string;
}

export async function processEmbeddingJob(job: Job<EmbeddingJobData>): Promise<void> {
  const { paperId } = job.data;
  
  try {
    await Paper.findByIdAndUpdate(paperId, { 
      'processingSteps.embedding': 'in_progress'
    });
    
    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'embedding',
      status: 'in_progress',
      message: 'Generating embeddings...',
    });

    // Get all chunks for this paper
    const chunks = await Chunk.find({ paperId }).lean();
    
    if (chunks.length === 0) {
      throw new Error('No chunks found for paper');
    }

    // Generate embeddings in batches (smaller batch size for safety)
    const batchSize = 5;
    const paper = await Paper.findById(paperId).lean();
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.content).filter(Boolean); // Filter empty content
      
      if (texts.length === 0) continue;
      
      const embeddings = await embeddingService.generateEmbeddings(texts);
      
      // Filter out failed embeddings (zero vectors) and build valid points
      const vectorPoints = batch
        .map((chunk, idx) => {
          const embedding = embeddings[idx];
          // Skip if no embedding or it's a zero vector (fallback from error)
          if (!embedding || embedding.every(v => v === 0)) {
            return null;
          }
          return {
            id: chunk._id.toString(),
            vector: embedding,
            payload: {
              paperId,
              chunkId: chunk._id.toString(),
              chunkType: chunk.chunkType,
              position: chunk.position,
              sectionTitle: chunk.sectionTitle || '',
              content: chunk.content,
              authors: paper?.authors || [],
              title: paper?.title || '',
            },
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
      
      if (vectorPoints.length > 0) {
        await vectorService.upsertVectors(vectorPoints);
      }
      
      // Update progress
      const progress = Math.round(((i + batch.length) / chunks.length) * 100);
      await job.updateProgress(progress);
      
      emitToPaper(io, paperId, 'processing:progress', {
        paperId,
        step: 'embedding',
        progress,
        message: `Processing embeddings... ${progress}%`,
      });
    }
    
    await Paper.findByIdAndUpdate(paperId, {
      status: 'ready',
      'processingSteps.embedding': 'completed',
      processedAt: new Date(),
    });

    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'embedding',
      status: 'completed',
      message: 'Paper ready for analysis',
    });

    emitToPaper(io, paperId, 'processing:complete', {
      paperId,
      message: 'Paper processing complete!',
    });
    
  } catch (error) {
    await Paper.findByIdAndUpdate(paperId, { 
      status: 'failed',
      'processingSteps.embedding': 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'embedding',
      status: 'failed',
      message: 'Failed to generate embeddings',
    });
    
    throw error;
  }
}

