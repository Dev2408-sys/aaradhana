import { NextFunction, Request, Response } from 'express';
import * as pricingService from '../services/pricing.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await pricingService.listDayPricing(
      req.user!,
      req.query.eventId as string | undefined,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await pricingService.upsertDayPrices(req.user!, req.body, req.ip);
    return sendSuccess(res, data, 'Day pricing updated');
  } catch (error) {
    next(error);
  }
}
