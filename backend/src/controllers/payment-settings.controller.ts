import { NextFunction, Request, Response } from 'express';
import * as settingsService from '../services/payment-settings.service';
import * as upiService from '../services/upi-account.service';
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

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await settingsService.getUpiStats(
      req.user!,
      req.query.date as string | undefined,
      req.query.eventId as string | undefined,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await upiService.createUpiAccount(req.user!, req.body, req.ip);
    return sendSuccess(res, data, 'UPI account created', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await upiService.updateUpiAccount(
      req.user!,
      req.params.id,
      req.body,
      req.ip,
    );
    return sendSuccess(res, data, 'UPI account updated');
  } catch (error) {
    next(error);
  }
}

export async function setMain(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await upiService.setMainUpiAccount(
      req.user!,
      req.params.id,
      req.ip,
    );
    return sendSuccess(res, data, 'Main UPI account updated');
  } catch (error) {
    next(error);
  }
}

export async function setReceiving(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await upiService.setReceivingUpiAccount(
      req.user!,
      req.params.id,
      req.ip,
    );
    return sendSuccess(res, data, 'Receiving UPI account updated');
  } catch (error) {
    next(error);
  }
}
