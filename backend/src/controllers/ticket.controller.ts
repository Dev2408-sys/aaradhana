import { NextFunction, Request, Response } from 'express';
import * as ticketService from '../services/ticket.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ticketService.listTickets(req.user!, req.query as never);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ticketService.getTicketById(req.user!, req.params.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ticketService.getTicketStats(req.user!);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
