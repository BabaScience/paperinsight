import { Router } from 'express';
import { paperController } from '../controllers/paper.controller.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate, validateObjectId, paperSchemas } from '../middleware/validation.js';
import { heavyOperationRateLimiter } from '../middleware/rate-limit.js';

export const paperRouter = Router();

// All routes require authentication
paperRouter.use(authenticate);

// Upload paper (rate limited due to resource intensity)
paperRouter.post(
  '/upload',
  heavyOperationRateLimiter,
  upload.single('file'),
  paperController.upload
);

// List papers
paperRouter.get('/', paperController.list);

// Get single paper
paperRouter.get(
  '/:id',
  validateObjectId('id'),
  validate(paperSchemas.getById),
  paperController.getById
);

// Delete paper
paperRouter.delete(
  '/:id',
  validateObjectId('id'),
  validate(paperSchemas.getById),
  paperController.delete
);

// Query paper (RAG) - rate limited due to AI usage
paperRouter.post(
  '/:id/query',
  heavyOperationRateLimiter,
  validateObjectId('id'),
  validate(paperSchemas.query),
  paperController.query
);

// Get paper analysis - rate limited due to AI usage
paperRouter.get(
  '/:id/analysis',
  heavyOperationRateLimiter,
  validateObjectId('id'),
  validate(paperSchemas.getById),
  paperController.getAnalysis
);

// Get paper chunks
paperRouter.get(
  '/:id/chunks',
  validateObjectId('id'),
  validate(paperSchemas.getById),
  paperController.getChunks
);

// Get conversation history
paperRouter.get(
  '/:id/conversation',
  validateObjectId('id'),
  validate(paperSchemas.getById),
  paperController.getConversation
);

// Get paper visuals (Mermaid diagrams) - rate limited due to AI usage
paperRouter.get(
  '/:id/visuals',
  heavyOperationRateLimiter,
  validateObjectId('id'),
  validate(paperSchemas.getById),
  paperController.getVisuals
);

// Get personalized implementation ideas - rate limited due to AI usage
paperRouter.get(
  '/:id/ideas',
  heavyOperationRateLimiter,
  validateObjectId('id'),
  validate(paperSchemas.getById),
  paperController.getIdeas
);

// Regenerate a single diagram - rate limited due to AI usage
paperRouter.post(
  '/:id/regenerate-diagram',
  heavyOperationRateLimiter,
  validateObjectId('id'),
  paperController.regenerateDiagram
);

// Translate abstract - rate limited due to AI usage
paperRouter.post(
  '/:id/translate-abstract',
  heavyOperationRateLimiter,
  validateObjectId('id'),
  validate(paperSchemas.translateAbstract),
  paperController.translateAbstract
);





