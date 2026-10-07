import { NextFunction, Request, Response } from 'express';
import * as legacy from '../services/dashboard.service';
import * as adminDashboard from '../services/dashboard/admin.service';
import * as sellerDashboard from '../services/dashboard/seller.service';
import { sendSuccess } from '../utils/apiResponse';

export async function salesSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await legacy.getSalesSummary(req.user!);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

function q(req: Request) {
  return req.query as Record<string, unknown>;
}

export async function adminSummary(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminSummary(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminDailyPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminDailyPerformance(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminTopSellers(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminTopSellers(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminTopMasters(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminTopMasters(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminSellerPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminSellerPerformance(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminPaymentSummary(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminPaymentSummary(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminSettlementSummary(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminSettlementSummary(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminRecentSales(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminRecentSales(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminRecentPayments(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminRecentPayments(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminEventPulse(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminEventPulse(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminTargetProgress(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminTargetProgress(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminTicketMix(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminTicketMix(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminOutstandingAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminOutstandingAlerts(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function adminEventHealth(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await adminDashboard.getAdminEventHealth(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function sellerSummary(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await sellerDashboard.getSellerSummary(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function sellerDailyPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await sellerDashboard.getSellerDailyPerformance(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function sellerTicketMix(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await sellerDashboard.getSellerTicketMix(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function sellerRecentSales(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await sellerDashboard.getSellerRecentSales(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function sellerFinance(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await sellerDashboard.getSellerFinance(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function masterSummary(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await sellerDashboard.getMasterSummary(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}

export async function masterTeamPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await sellerDashboard.getMasterTeamPerformance(req.user!, q(req)));
  } catch (e) {
    next(e);
  }
}
