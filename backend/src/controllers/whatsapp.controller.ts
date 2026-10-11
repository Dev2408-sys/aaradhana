import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/errors';
import { sendBulkPassEnquiry, whatsappStatus } from '../services/whatsapp-bulk.service';

export function status(_req: Request, res: Response) {
  return sendSuccess(res, whatsappStatus());
}

export async function bulkSend(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError('Pass image is required (JPG, PNG, or WEBP)', 400, 'IMAGE_REQUIRED');
    }

    const data = await sendBulkPassEnquiry({
      numbersRaw: String(req.body.numbers ?? ''),
      message: String(req.body.message ?? ''),
      imagePath: file.path,
      imageMime: file.mimetype,
    });

    return sendSuccess(
      res,
      data,
      `Sent ${data.sent} of ${data.sent + data.failed}`,
    );
  } catch (error) {
    next(error);
  }
}
