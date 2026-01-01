import { Router } from 'express';
import { paperController } from '../controllers/paper.controller.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate, paperSchemas } from '../middleware/validation.js';

export const paperRouter = Router();

// All routes require authentication
paperRouter.use(authenticate);

// Upload paper
paperRouter.post(
  '/upload',
  upload.single('file'),
  paperController.upload
);

// List papers
paperRouter.get('/', paperController.list);

// Get single paper
paperRouter.get(
  '/:id',
  validate(paperSchemas.getById),
  paperController.getById
);

// Delete paper
paperRouter.delete(
  '/:id',
  validate(paperSchemas.getById),
  paperController.delete
);

// Query paper (RAG)
paperRouter.post(
  '/:id/query',
  validate(paperSchemas.query),
  paperController.query
);

// Get paper analysis
paperRouter.get(
  '/:id/analysis',
  validate(paperSchemas.getById),
  paperController.getAnalysis
);

// Get paper chunks
paperRouter.get(
  '/:id/chunks',
  validate(paperSchemas.getById),
  paperController.getChunks
);

// Get conversation history
paperRouter.get(
  '/:id/conversation',
  validate(paperSchemas.getById),
  paperController.getConversation
);

// Get paper visuals (Mermaid diagrams)
paperRouter.get(
  '/:id/visuals',
  validate(paperSchemas.getById),
  paperController.getVisuals
);

// Get personalized implementation ideas
paperRouter.get(
  '/:id/ideas',
  validate(paperSchemas.getById),
  paperController.getIdeas
);





