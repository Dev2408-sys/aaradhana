import { Request, Response } from 'express';

export function health(_req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: 'Kesariya API is running',
  });
}
