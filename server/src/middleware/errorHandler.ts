import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  status: 'error';
  message: string;
  stack?: string;
}

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', error);

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      status: 'error',
      message: error.message,
    };

    if (env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // Unknown error
  const response: ErrorResponse = {
    status: 'error',
    message: env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
  };

  if (env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.path}`,
  });
}





