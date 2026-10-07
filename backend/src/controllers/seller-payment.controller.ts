import { NextFunction, Request, Response } from 'express';
import * as sellerPaymentService from '../services/seller-payment.service';
import { sendSuccess } from '../utils/apiResponse';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerPaymentService.createSellerPayment(
      req.user!,
      req.body,
      req.ip,
    );
    return sendSuccess(res, data, undefined, 201);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerPaymentService.listSellerPayments(
      req.user!,
      req.query as never,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerPaymentService.getSellerPaymentById(
      req.user!,
      req.params.id,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function reverse(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerPaymentService.reverseSellerPayment(
      req.user!,
      req.params.id,
      req.ip,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
