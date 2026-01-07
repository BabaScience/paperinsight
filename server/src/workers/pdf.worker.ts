import type { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { Paper } from '../models/paper.model.js';
import { pdfService } from '../services/pdf.service.js';
import { minioService } from '../services/minio.service.js';
import { io } from '../index.js';
import { emitToPaper } from '../socket/index.js';

export interface PdfJobData {
  paperId: string;
  userId: string;
  fileKey: string; // MinIO object key
}

const chunkingQueue = new Queue('chunking-processing', { connection: redis as any });


export async function processPdfJob(job: Job<PdfJobData>): Promise<void> {
  const { paperId, userId, fileKey } = job.data;
  
  try {
    // Update status to processing
    await Paper.findByIdAndUpdate(paperId, { 
      status: 'processing',
      'processingSteps.parsing': 'in_progress'
    });
    
    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'parsing',
      status: 'in_progress',
      message: 'Downloading PDF from storage...',
    });

    // Download file from MinIO
    const fileBuffer = await minioService.downloadFile(fileKey);

    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'parsing',
      status: 'in_progress',
      message: 'Extracting text from PDF...',
    });

    // Parse PDF from buffer
    const result = await pdfService.parsePdf(fileBuffer);
    
    // Update paper with extracted metadata
    await Paper.findByIdAndUpdate(paperId, {
      title: result.metadata.title || 'Untitled Paper',
      authors: result.metadata.authors,
      abstract: result.metadata.abstract,
      pageCount: result.metadata.pageCount,
      rawText: result.text,
      sections: result.sections,
      'processingSteps.parsing': 'completed',
    });

    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'parsing',
      status: 'completed',
      message: 'PDF parsed successfully',
    });

    // Queue chunking job
    await chunkingQueue.add('chunk', {
      paperId,
      userId,
      text: result.text,
      sections: result.sections,
    });
    
    await job.updateProgress(100);
  } catch (error) {
    await Paper.findByIdAndUpdate(paperId, { 
      status: 'failed',
      'processingSteps.parsing': 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    emitToPaper(io, paperId, 'processing:status', {
      paperId,
      step: 'parsing',
      status: 'failed',
      message: 'Failed to parse PDF',
    });
    
    throw error;
  }
}
