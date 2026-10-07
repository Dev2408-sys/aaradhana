import { NextFunction, Request, Response } from 'express';
import * as accountingService from '../services/accounting.service';
import { sendSuccess } from '../utils/apiResponse';

export async function sellerSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await accountingService.getSellerFinanceSummary(
      req.user!,
      req.params.sellerId,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function sellerLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await accountingService.listSellerLedger(
      req.user!,
      req.params.sellerId,
      req.query as never,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function customerSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await accountingService.getCustomerAccountingSummary(
      req.user!,
      req.params.customerId,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function saleSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await accountingService.getSaleAccountingSummary(
      req.user!,
      req.params.saleId,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function receivables(req: Request, res: Response, next: NextFunction) {
  try {
    const eventDay = req.query.eventDay
      ? Number(req.query.eventDay)
      : undefined;
    const data = await accountingService.getAdminReceivableSummary(req.user!, {
      eventDay: Number.isFinite(eventDay) ? eventDay : undefined,
    });
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const eventDay = req.query.eventDay
      ? Number(req.query.eventDay)
      : undefined;
    const data = await accountingService.getAdminReceivableSummary(req.user!, {
      eventDay: Number.isFinite(eventDay) ? eventDay : undefined,
    });
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function sellers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await accountingService.listSellerAccountingRows(
      req.user!,
      req.query as never,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function backfill(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await accountingService.backfillAccounting(req.user!, req.ip);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
