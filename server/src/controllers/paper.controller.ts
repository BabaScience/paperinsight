import type { Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import { Paper } from '../models/paper.model.js';
import { Chunk } from '../models/chunk.model.js';
import { Conversation } from '../models/conversation.model.js';
import { User } from '../models/user.model.js';
import { ragService, TokenLimitExceededError } from '../services/rag.service.js';
import { vectorService } from '../services/vector.service.js';
import { minioService } from '../services/minio.service.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import type { AuthRequest } from '../middleware/auth.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { fileValidator } from '../middleware/file-validation.js';
import { withTransaction, withSession } from '../utils/transaction.js';

const pdfQueue = new Queue('pdf-processing', { connection: redis });

class PaperController {
  async upload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const { originalname, size, buffer, mimetype } = req.file;

      // Comprehensive PDF validation
      const validation = await fileValidator.validatePDF(buffer, {
        maxSize: env.MAX_FILE_SIZE,
        allowedTypes: ['application/pdf'],
        checkCompressionRatio: true,
        maxCompressionRatio: 100,
      });

      if (!validation.valid) {
        throw new BadRequestError(validation.reason || 'Invalid PDF file');
      }

      console.log(`✅ PDF validated: ${originalname} (hash: ${validation.fileHash?.substring(0, 16)}...)`);

      // Upload to MinIO
      const fileKey = await minioService.uploadFile(buffer, originalname, mimetype);

      // Create paper record
      const paper = new Paper({
        userId: req.userId,
        fileName: originalname,
        fileUrl: fileKey, // Store MinIO object key
        fileSize: size,
        status: 'uploading',
      });

      await paper.save();

      // Queue processing job
      await pdfQueue.add(
        'parse',
        {
          paperId: paper._id.toString(),
          userId: req.userId,
          fileKey, // Pass MinIO key instead of file path
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      res.status(201).json({
        status: 'success',
        data: {
          paper: {
            id: paper._id,
            fileName: paper.fileName,
            fileSize: paper.fileSize,
            status: paper.status,
            createdAt: paper.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [papers, total] = await Promise.all([
        Paper.find({ userId: req.userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-rawText -sections')
          .lean(),
        Paper.countDocuments({ userId: req.userId }),
      ]);

      res.json({
        status: 'success',
        data: {
          papers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const paper = await Paper.findById(req.params.id)
        .select('-rawText')
        .lean();

      if (!paper) {
        throw new NotFoundError('Paper not found');
      }

      if (paper.userId.toString() !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      res.json({
        status: 'success',
        data: { paper },
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // First, verify the paper exists and user has permission
      const paper = await Paper.findById(req.params.id);

      if (!paper) {
        throw new NotFoundError('Paper not found');
      }

      if (paper.userId.toString() !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      // Store file info before deletion for cleanup
      const fileUrl = paper.fileUrl;
      const paperId = paper._id.toString();
      const paperObjectId = paper._id;

      // Use transaction for database operations
      await withTransaction(async (session) => {
        // Delete all related database records atomically
        await Chunk.deleteMany(
          { paperId: paperObjectId },
          withSession(session, {})
        );
        
        await Conversation.deleteMany(
          { paperId: paperObjectId },
          withSession(session, {})
        );
        
        await Paper.deleteOne(
          { _id: paperObjectId },
          withSession(session, {})
        );

        console.log(`📄 Paper ${paperId} and related data deleted from database`);
      });

      // External service cleanup after DB operations succeed
      // These can't be rolled back anyway, so we use Promise.allSettled
      const cleanupResults = await Promise.allSettled([
        minioService.deleteFile(fileUrl),
        vectorService.deleteByPaperId(paperId),
      ]);

      // Log any failures for manual cleanup if needed
      cleanupResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const service = index === 0 ? 'MinIO' : 'Qdrant';
          console.error(`⚠️ Failed to delete from ${service}:`, result.reason);
        }
      });

      res.json({
        status: 'success',
        message: 'Paper deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async query(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question } = req.body;
      const paperId = req.params.id!;

      // Fetch paper and user profile in parallel
      const [paper, user] = await Promise.all([
        Paper.findById(paperId),
        User.findById(req.userId).select('profile').lean(),
      ]);

      if (!paper) {
        throw new NotFoundError('Paper not found');
      }

      if (paper.userId.toString() !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      if (paper.status !== 'ready') {
        throw new BadRequestError('Paper is not ready for querying');
      }

      // Extract user profile for personalized responses
      const userProfile = user?.profile;

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream the response with user profile context
      await ragService.queryStream(paperId, question, {
        onToken: (token) => {
          res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
        },
        onComplete: async (result) => {
          // Save to conversation history
          let conversation = await Conversation.findOne({
            paperId,
            userId: req.userId,
          });

          if (!conversation) {
            conversation = new Conversation({
              paperId,
              userId: req.userId,
              messages: [],
            });
          }

          conversation.messages.push(
            { role: 'user', content: question, createdAt: new Date() },
            { 
              role: 'assistant', 
              content: result.answer, 
              sources: result.sources,
              createdAt: new Date(),
            }
          );

          await conversation.save();

          res.write(`data: ${JSON.stringify({ type: 'complete', sources: result.sources })}\n\n`);
          res.end();
        },
        onError: (error) => {
          // Handle token limit exceeded error specially
          if (error instanceof TokenLimitExceededError) {
            res.write(`data: ${JSON.stringify({ 
              type: 'error', 
              code: 'TOKEN_LIMIT_EXCEEDED',
              message: error.message,
              tokenUsage: error.tokenUsage 
            })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
          }
          res.end();
        },
      }, userProfile, req.userId);
    } catch (error) {
      // Handle token limit exceeded error specially
      if (error instanceof TokenLimitExceededError) {
        res.status(402).json({
          status: 'error',
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: error.message,
          data: { tokenUsage: error.tokenUsage },
        });
        return;
      }
      next(error);
    }
  }

  async getAnalysis(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Fetch paper and user profile in parallel
      const [paper, user] = await Promise.all([
        Paper.findById(req.params.id),
        User.findById(req.userId).select('profile').lean(),
      ]);

      if (!paper) {
        throw new NotFoundError('Paper not found');
      }

      if (paper.userId.toString() !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      if (paper.status !== 'ready') {
        throw new BadRequestError('Paper is not ready for analysis');
      }

      // Extract user profile for language preference
      const userProfile = user?.profile;

      // Check if regeneration is requested
      const forceRegenerate = req.query.regenerate === 'true';
      const analysis = await ragService.getAnalysis(req.params.id!, userProfile, forceRegenerate, req.userId);

      res.json({
        status: 'success',
        data: { analysis },
      });
    } catch (error) {
      // Handle token limit exceeded error specially
      if (error instanceof TokenLimitExceededError) {
        res.status(402).json({
          status: 'error',
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: error.message,
          data: { tokenUsage: error.tokenUsage },
        });
        return;
      }
      next(error);
    }
  }

  async getChunks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const paper = await Paper.findById(req.params.id);

      if (!paper) {
        throw new NotFoundError('Paper not found');
      }

      if (paper.userId.toString() !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      const chunks = await Chunk.find({ paperId: req.params.id })
        .sort({ position: 1 })
        .lean();

      res.json({
        status: 'success',
        data: { chunks },
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = await Conversation.findOne({
        paperId: req.params.id,
        userId: req.userId,
      }).lean();

      res.json({
        status: 'success',
        data: { 
          conversation: conversation || { messages: [] }
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getVisuals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Fetch paper and user profile in parallel
      const [paper, user] = await Promise.all([
        Paper.findById(req.params.id),
        User.findById(req.userId).select('profile').lean(),
      ]);

      if (!paper) {
        throw new NotFoundError('Paper not found');
      }

      if (paper.userId.toString() !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      if (paper.status !== 'ready') {
        throw new BadRequestError('Paper is not ready for visual generation');
      }

      // Extract user profile for language preference
      const userProfile = user?.profile;

      // Check if regeneration is requested
      const forceRegenerate = req.query.regenerate === 'true';
      const visuals = await ragService.getVisuals(req.params.id!, userProfile, forceRegenerate, req.userId);

      res.json({
        status: 'success',
        data: { visuals },
      });
    } catch (error) {
      // Handle token limit exceeded error specially
      if (error instanceof TokenLimitExceededError) {
        res.status(402).json({
          status: 'error',
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: error.message,
          data: { tokenUsage: error.tokenUsage },
        });
        return;
      }
      next(error);
    }
  }

  async getIdeas(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Fetch paper and user profile in parallel
      const [paper, user] = await Promise.all([
        Paper.findById(req.params.id),
        User.findById(req.userId).select('profile').lean(),
      ]);

      if (!paper) {
        throw new NotFoundError('Paper not found');
      }

      if (paper.userId.toString() !== req.userId) {
        throw new ForbiddenError('Access denied');
      }

      if (paper.status !== 'ready') {
        throw new BadRequestError('Paper is not ready for idea generation');
      }

      // Extract user profile for personalized ideas
      const userProfile = user?.profile;

      // Check if regeneration is requested
      const forceRegenerate = req.query.regenerate === 'true';
      const ideas = await ragService.getIdeas(req.params.id!, userProfile, forceRegenerate, req.userId);

      res.json({
        status: 'success',
        data: { ideas },
      });
    } catch (error) {
      // Handle token limit exceeded error specially
      if (error instanceof TokenLimitExceededError) {
        res.status(402).json({
          status: 'error',
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: error.message,
          data: { tokenUsage: error.tokenUsage },
        });
        return;
      }
      next(error);
    }
  }
}

export const paperController = new PaperController();
