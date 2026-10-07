import { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { mobile, password } = req.body;
    const result = await authService.login(mobile, password, req.ip);
    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    return sendSuccess(res, result, 'Token refreshed');
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.user?.id, req.body.refreshToken, req.ip);
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.id);
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
      req.ip,
    );
    return sendSuccess(res, result, 'Password updated');
  } catch (error) {
    next(error);
  }
}
