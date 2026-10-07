import { NextFunction, Request, Response } from 'express';
import * as sellerService from '../services/seller.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.listSellers(req.user!, req.query as never);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.createSeller(req.user!, req.body, req.ip);
    return sendSuccess(res, data, 'Seller created', 201);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.getSellerById(req.user!, req.params.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.updateSeller(req.user!, req.params.id, req.body, req.ip);
    return sendSuccess(res, data, 'Seller updated');
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.updateSellerStatus(
      req.user!,
      req.params.id,
      req.body.activationStatus,
      req.ip,
    );
    return sendSuccess(res, data, 'Seller status updated');
  } catch (error) {
    next(error);
  }
}

export async function updateParent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.updateSellerParent(
      req.user!,
      req.params.id,
      req.body.parentSellerId,
      req.ip,
    );
    return sendSuccess(res, data, 'Seller parent updated');
  } catch (error) {
    next(error);
  }
}

export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.getSellerTeam(req.user!, req.params.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getReferral(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.getReferralByCode(req.params.sellerCode);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.registerViaReferral(req.body, req.ip);
    return sendSuccess(res, data, data.message, 201);
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.getMySellerProfile(req.user!);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.updateMySellerProfile(req.user!, req.body, req.ip);
    return sendSuccess(res, data, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

export async function referralLink(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.getReferralLink(req.user!, req.params.id);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}
