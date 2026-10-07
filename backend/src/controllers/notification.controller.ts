import { NextFunction, Request, Response } from 'express';
import * as notificationService from '../services/notification.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const unreadOnly =
      req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
    const data = await notificationService.listNotifications(req.user!, {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      unreadOnly,
    });
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function badges(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await notificationService.getNotificationBadges(req.user!);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await notificationService.markNotificationRead(
      req.user!,
      req.params.id,
    );
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await notificationService.markAllNotificationsRead(req.user!);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
