import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
) {
  return res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    data,
  });
}

export function sendMessage(res: Response, message: string, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
  });
}

export function sendError(
  res: Response,
  message: string,
  code: string,
  statusCode = 400,
) {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
  });
}
