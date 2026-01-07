import { AppError } from './errors.js';

/**
 * Whitelist of safe error messages that can be shown to users
 * These are intentionally vague to not leak implementation details
 */
const SAFE_ERROR_MESSAGES = new Set([
  // Authentication errors
  'Invalid email or password',
  'No token provided',
  'Token expired',
  'Invalid token',
  'Invalid token type',
  'Token has been revoked',
  'Session has been invalidated. Please log in again.',
  'User not found',
  'Email already registered',
  
  // Authorization errors
  'Access denied',
  'Unauthorized',
  'Forbidden',
  
  // Validation errors
  'Validation failed',
  'Invalid ID format',
  'No file uploaded',
  'Only PDF files are allowed',
  'Question is required',
  'Paper ID is required',
  
  // Resource errors
  'Paper not found',
  'Resource not found',
  'Not found',
  
  // Rate limiting
  'Too many authentication attempts, please try again later',
  'Too many requests, please slow down',
  'Too many requests for this operation, please wait before trying again',
  'You can only request token extensions twice per hour',
  
  // Token/usage errors
  'You have reached your token limit. Please request an extension to continue using the AI features.',
  'You already have a pending token extension request. Please wait for it to be processed.',
  
  // Paper processing errors
  'Paper is not ready for querying',
  'Paper is not ready for analysis',
  'Paper is not ready for visual generation',
  'Paper is not ready for idea generation',
  
  // File validation errors
  'File is empty',
  'Invalid file type. Expected PDF but detected:',
  'Invalid PDF: Missing PDF header signature',
  'PDF contains potentially dangerous embedded content (JavaScript or external launches). Please upload a clean PDF.',
  'File has suspicious compression characteristics (potential PDF bomb)',
]);

/**
 * Patterns that indicate a safe error message (partial matches)
 */
const SAFE_ERROR_PATTERNS = [
  /^File size .* exceeds maximum/,
  /^Invalid file type\./,
  /^Unsupported PDF version:/,
  /^Invalid .* format$/,
  /must be at least \d+ characters/,
];

/**
 * Error Sanitizer Service
 * Prevents information leakage by only showing whitelisted error messages
 */
class ErrorSanitizer {
  /**
   * Check if an error message is safe to show to users
   */
  private isSafeMessage(message: string): boolean {
    // Check exact matches
    if (SAFE_ERROR_MESSAGES.has(message)) {
      return true;
    }
    
    // Check if message starts with a safe prefix
    for (const safeMsg of SAFE_ERROR_MESSAGES) {
      if (message.startsWith(safeMsg)) {
        return true;
      }
    }
    
    // Check pattern matches
    for (const pattern of SAFE_ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Sanitize an error for client response
   * @param error - The error to sanitize
   * @param includeStack - Whether to include stack trace (dev only)
   */
  sanitizeError(
    error: Error,
    includeStack: boolean = false
  ): {
    message: string;
    code?: string;
    stack?: string;
  } {
    // AppErrors are our custom errors - their messages are intentionally safe
    const isAppError = error instanceof AppError;
    
    // Check if this error message is in our whitelist
    const isSafeError = isAppError || this.isSafeMessage(error.message);
    
    return {
      message: isSafeError ? error.message : 'An unexpected error occurred',
      code: isAppError ? error.constructor.name : undefined,
      stack: includeStack ? this.sanitizeStack(error.stack) : undefined,
    };
  }

  /**
   * Sanitize stack trace to remove sensitive paths
   */
  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    return stack
      .split('\n')
      .map(line => {
        // Remove absolute paths, keep only filename
        return line.replace(/\(\/[^)]+\/([^/)]+)\)/, '($1)');
      })
      .slice(0, 10) // Limit stack depth
      .join('\n');
  }

  /**
   * Log the full error details server-side
   * This should be called before sanitizing for client response
   */
  logError(error: Error, context?: Record<string, unknown>): void {
    console.error('Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }
}

export const errorSanitizer = new ErrorSanitizer();


