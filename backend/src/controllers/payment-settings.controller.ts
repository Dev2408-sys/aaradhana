import { NextFunction, Request, Response } from 'express';
import * as settingsService from '../services/payment-settings.service';
import { sendSuccess } from '../utils/apiResponse';

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const amountRaw = req.query.amount;
    const amount =
      amountRaw != null && String(amountRaw).trim() !== ''
        ? Number(amountRaw)
        : null;
    const data = await settingsService.getPaymentSettings(
      req.user!,
      req.query.eventId as string | undefined,
      Number.isFinite(amount) ? amount : null,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await settingsService.updatePaymentSettings(
      req.user!,
      req.body,
      req.ip,
    );
    return sendSuccess(res, data, 'Payment settings updated');
  } catch (error) {
    next(error);
  }
}
