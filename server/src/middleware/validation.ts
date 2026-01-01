import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        next(new ValidationError(message));
      } else {
        next(error);
      }
    }
  };
}

// Common validation schemas
export const authSchemas = {
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      name: z.string().min(2, 'Name must be at least 2 characters'),
    }),
  }),
  
  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),
  
  refresh: z.object({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  }),
};

export const paperSchemas = {
  query: z.object({
    body: z.object({
      question: z.string().min(1, 'Question is required').max(1000),
    }),
    params: z.object({
      id: z.string().min(1, 'Paper ID is required'),
    }),
  }),
  
  getById: z.object({
    params: z.object({
      id: z.string().min(1, 'Paper ID is required'),
    }),
  }),
};

// Profile validation schemas
export const profileSchemas = {
  update: z.object({
    body: z.object({
      researchField: z
        .string()
        .max(100, 'Research field must be 100 characters or less')
        .optional(),
      expertiseLevel: z
        .enum(['beginner', 'intermediate', 'advanced', 'expert'])
        .optional(),
      interests: z
        .array(z.string().max(50, 'Each interest must be 50 characters or less'))
        .max(10, 'Maximum 10 interests allowed')
        .optional(),
      currentProjects: z
        .string()
        .max(500, 'Current projects must be 500 characters or less')
        .optional(),
      preferredStyle: z
        .enum(['technical', 'simplified', 'examples-heavy', 'concise'])
        .optional(),
      bio: z
        .string()
        .max(300, 'Bio must be 300 characters or less')
        .optional(),
    }),
  }),
};





