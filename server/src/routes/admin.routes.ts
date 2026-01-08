import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

export const adminRouter = Router();

// All admin routes require authentication and admin privileges
adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

// GET /api/admin/stats - Overall system statistics
adminRouter.get('/stats', adminController.getStats);

// GET /api/admin/users - User statistics
adminRouter.get('/users', adminController.getUsers);

// GET /api/admin/papers - Paper statistics
adminRouter.get('/papers', adminController.getPapers);

// GET /api/admin/tokens - Token usage statistics
adminRouter.get('/tokens', adminController.getTokens);

// GET /api/admin/health - System health metrics
adminRouter.get('/health', adminController.getHealth);


