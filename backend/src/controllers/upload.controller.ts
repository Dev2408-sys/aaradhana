import { NextFunction, Request, Response } from 'express';
import { publicUploadUrl } from '../config/uploads';
import { ValidationAppError } from '../utils/errors';
import { sendSuccess } from '../utils/apiResponse';

export async function uploadPaymentProof(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) {
      throw new ValidationAppError('Payment screenshot is required');
    }
    const url = publicUploadUrl('payment-proofs', req.file.filename);
    return sendSuccess(
      res,
      {
        url,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      'Payment screenshot uploaded',
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function uploadUpiQr(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationAppError('QR image is required');
    }
    const url = publicUploadUrl('upi-qr', req.file.filename);
    return sendSuccess(
      res,
      {
        url,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
      'UPI QR uploaded',
      201,
    );
  } catch (error) {
    next(error);
  }
}
