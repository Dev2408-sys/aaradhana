import { NextFunction, Request, Response } from 'express';
import * as customerService from '../services/customer.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customerService.listCustomers(req.user!, req.query as never);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customerService.searchCustomers(
      req.user!,
      String(req.query.q ?? ''),
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customerService.getCustomerById(req.user!, req.params.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customerService.createCustomer(req.user!, req.body, req.ip);
    return sendSuccess(res, data, 'Customer created', 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await customerService.updateCustomer(
      req.user!,
      req.params.id,
      req.body,
      req.ip,
    );
    return sendSuccess(res, data, 'Customer updated');
  } catch (error) {
    next(error);
  }
}
