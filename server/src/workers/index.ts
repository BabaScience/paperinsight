import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { processPdfJob } from './pdf.worker.js';
import { processChunkingJob } from './chunking.worker.js';
import { processEmbeddingJob } from './embedding.worker.js';

const connection = redis as any;

const workerOptions = {
  connection,
  concurrency: 3,
};

export function initializeWorkers(): void {
  // PDF parsing worker
  const pdfWorker = new Worker('pdf-processing', processPdfJob, workerOptions);
  
  pdfWorker.on('completed', (job) => {
    console.log(`✅ PDF parsing completed for job ${job.id}`);
  });
  
  pdfWorker.on('failed', (job, error) => {
    console.error(`❌ PDF parsing failed for job ${job?.id}:`, error);
  });

  // Chunking worker
  const chunkingWorker = new Worker('chunking-processing', processChunkingJob, workerOptions);
  
  chunkingWorker.on('completed', (job) => {
    console.log(`✅ Chunking completed for job ${job.id}`);
  });
  
  chunkingWorker.on('failed', (job, error) => {
    console.error(`❌ Chunking failed for job ${job?.id}:`, error);
  });

  // Embedding worker
  const embeddingWorker = new Worker('embedding-processing', processEmbeddingJob, workerOptions);
  
  embeddingWorker.on('completed', (job) => {
    console.log(`✅ Embedding generation completed for job ${job.id}`);
  });
  
  embeddingWorker.on('failed', (job, error) => {
    console.error(`❌ Embedding generation failed for job ${job?.id}:`, error);
  });

  console.log('✅ Background workers initialized');
}

