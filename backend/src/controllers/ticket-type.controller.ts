import { NextFunction, Request, Response } from 'express';
import * as ticketTypeService from '../services/ticket-type.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const eventId =
      typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
    const data = await ticketTypeService.listActiveTicketTypes(eventId);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
