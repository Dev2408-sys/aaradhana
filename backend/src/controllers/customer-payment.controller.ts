import { NextFunction, Request, Response } from 'express';
import * as customerPaymentService from '../services/customer-payment.service';
import { sendSuccess } from '../utils/apiResponse';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customerPaymentService.createCustomerPayment(
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
    const data = await customerPaymentService.listCustomerPayments(
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
    const data = await customerPaymentService.getCustomerPaymentById(
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
    const data = await customerPaymentService.reverseCustomerPayment(
      req.user!,
      req.params.id,
      req.ip,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
