import type { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { Paper } from '../models/paper.model.js';
import { Chunk } from '../models/chunk.model.js';
import { chunkingService } from '../services/chunking.service.js';
import { io } from '../index.js';
import { emitToPaper } from '../socket/index.js';

export interface ChunkingJobData {
  paperId: string;
  userId: string;
  text: string;
  sections: Array<{ title: string; content: string; position: number }>;
}

const embeddingQueue = new Queue('embedding-processing', { connection: redis });

export async function processChunkingJob(job: Job<ChunkingJobData>): Promise<void> {
  const { paperId, userId, text, sections } = job.data;
  
  try {
    await Paper.findByIdAndUpdate(paperId, { 
      'processingSteps.chunking': 'in_progress'
    });
    
    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'chunking',
      status: 'in_progress',
      message: 'Creating text chunks...',
    });

    // Generate chunks using hierarchical strategy
    const chunks = await chunkingService.createHierarchicalChunks(text, sections);
    
    // Store chunks in database
    const chunkDocs = chunks.map((chunk, index) => ({
      paperId,
      content: chunk.content,
      chunkType: chunk.type,
      position: index,
      sectionTitle: chunk.sectionTitle,
      tokenCount: chunk.tokenCount,
      metadata: chunk.metadata,
    }));
    
    await Chunk.insertMany(chunkDocs);
    
    await Paper.findByIdAndUpdate(paperId, {
      'processingSteps.chunking': 'completed',
      chunkCount: chunks.length,
    });

    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'chunking',
      status: 'completed',
      message: `Created ${chunks.length} chunks`,
    });

    // Queue embedding job
    await embeddingQueue.add('embed', {
      paperId,
      userId,
    });
    
    await job.updateProgress(100);
  } catch (error) {
    await Paper.findByIdAndUpdate(paperId, { 
      status: 'failed',
      'processingSteps.chunking': 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'chunking',
      status: 'failed',
      message: 'Failed to create chunks',
    });
    
    throw error;
  }
}

