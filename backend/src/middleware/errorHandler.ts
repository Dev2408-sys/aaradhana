import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'NOT_FOUND',
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: err.errors[0]?.message ?? 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  if (err instanceof Error && err.message.includes('Only JPG')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
  ) {
    return res.status(400).json({
      success: false,
      message: 'Image too large (max 5 MB)',
      code: 'VALIDATION_ERROR',
    });
  }

  logger.error({ err }, 'Unhandled error');

  return res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err instanceof Error
          ? err.message
          : 'Something went wrong',
    code: 'INTERNAL_ERROR',
  });
}
