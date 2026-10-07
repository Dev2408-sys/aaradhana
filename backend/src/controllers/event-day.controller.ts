import { NextFunction, Request, Response } from 'express';
import * as eventDayService from '../services/event-day.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await eventDayService.listEventDays(
      typeof req.query.eventId === 'string' ? req.query.eventId : undefined,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
