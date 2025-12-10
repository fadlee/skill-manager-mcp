/**
 * Error handling utilities
 * Requirements: 1.2, 2.6, 4.4, 5.2, 8.1
 */

import type { ErrorCode } from '../../shared/types';

/**
 * HTTP status codes for each error type
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  DB_ERROR: 500,
  UNAUTHORIZED: 401,
  CONFLICT: 409,
};

/**
 * Application error class with error code and HTTP status
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;

  constructor(code: ErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status ?? ERROR_STATUS_MAP[code];
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * Create a NOT_FOUND error
 */
export function notFound(resource: string): AppError {
  return new AppError('NOT_FOUND', `${resource} not found`, 404);
}

/**
 * Create a CONFLICT error
 */
export function conflict(message: string): AppError {
  return new AppError('CONFLICT', message, 409);
}

/**
 * Create a VALIDATION_ERROR
 */
export function validationError(message: string): AppError {
  return new AppError('VALIDATION_ERROR', message, 400);
}

/**
 * Create an UNAUTHORIZED error
 */
export function unauthorized(): AppError {
  return new AppError('UNAUTHORIZED', 'Invalid or missing API key', 401);
}

/**
 * Create a DB_ERROR
 */
export function dbError(message: string): AppError {
  return new AppError('DB_ERROR', message, 500);
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
