import { NextFunction, Request, Response } from 'express';
import * as saleService from '../services/sale.service';
import * as workflow from '../services/sale-workflow.service';
import { sendSuccess } from '../utils/apiResponse';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await saleService.createSale(req.user!, req.body, req.ip);
    const message =
      data.saleStatus === 'PENDING'
        ? 'Sale submitted — awaiting admin approval'
        : 'Sale confirmed';
    return sendSuccess(res, data, message, 201);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await saleService.listSales(req.user!, req.query as never);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await saleService.getSaleById(req.user!, req.params.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workflow.approveSale(
      req.user!,
      req.params.id,
      req.body,
      req.ip,
    );
    return sendSuccess(res, data, 'Sale approved');
  } catch (error) {
    next(error);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workflow.rejectSale(
      req.user!,
      req.params.id,
      req.body,
      req.ip,
    );
    return sendSuccess(res, data, 'Sale rejected');
  } catch (error) {
    next(error);
  }
}

export async function markWhatsAppSent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workflow.markWhatsAppSent(req.user!, req.params.id, req.ip);
    return sendSuccess(res, data, 'Marked as WhatsApp sent');
  } catch (error) {
    next(error);
  }
}

export async function slip(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workflow.getSaleSlip(req.user!, req.params.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
