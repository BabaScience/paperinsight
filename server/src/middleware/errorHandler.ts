import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { errorSanitizer } from '../utils/error-sanitizer.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  stack?: string;
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log full error details server-side
  errorSanitizer.logError(error, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  // Sanitize error for client response
  const sanitized = errorSanitizer.sanitizeError(
    error,
    env.NODE_ENV === 'development'
  );

  const statusCode = error instanceof AppError 
    ? error.statusCode 
    : 500;

  const response: ErrorResponse = {
    status: 'error',
    message: sanitized.message,
    code: sanitized.code,
  };

  if (env.NODE_ENV === 'development' && sanitized.stack) {
    response.stack = sanitized.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.path}`,
  });
}





