import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const admin = ['SUPER_ADMIN', 'ADMIN'] as const;
const seller = ['MASTER_SELLER', 'SELLER'] as const;
const master = ['MASTER_SELLER'] as const;
const all = ['SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'] as const;

router.get(
  '/sales-summary',
  requireAuth,
  requireRole(...all),
  dashboardController.salesSummary,
);

router.get('/admin/summary', requireAuth, requireRole(...admin), dashboardController.adminSummary);
router.get(
  '/admin/daily-performance',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminDailyPerformance,
);
router.get(
  '/admin/top-sellers',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminTopSellers,
);
router.get(
  '/admin/top-masters',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminTopMasters,
);
router.get(
  '/admin/seller-performance',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminSellerPerformance,
);
router.get(
  '/admin/payment-summary',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminPaymentSummary,
);
router.get(
  '/admin/settlement-summary',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminSettlementSummary,
);
router.get(
  '/admin/recent-sales',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminRecentSales,
);
router.get(
  '/admin/recent-payments',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminRecentPayments,
);
router.get(
  '/admin/event-pulse',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminEventPulse,
);
router.get(
  '/admin/target-progress',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminTargetProgress,
);
router.get(
  '/admin/ticket-mix',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminTicketMix,
);
router.get(
  '/admin/outstanding-alerts',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminOutstandingAlerts,
);
router.get(
  '/admin/event-health',
  requireAuth,
  requireRole(...admin),
  dashboardController.adminEventHealth,
);

router.get(
  '/seller/summary',
  requireAuth,
  requireRole(...seller),
  dashboardController.sellerSummary,
);
router.get(
  '/seller/daily-performance',
  requireAuth,
  requireRole(...seller),
  dashboardController.sellerDailyPerformance,
);
router.get(
  '/seller/ticket-mix',
  requireAuth,
  requireRole(...seller),
  dashboardController.sellerTicketMix,
);
router.get(
  '/seller/recent-sales',
  requireAuth,
  requireRole(...seller),
  dashboardController.sellerRecentSales,
);
router.get(
  '/seller/finance',
  requireAuth,
  requireRole(...seller),
  dashboardController.sellerFinance,
);

router.get(
  '/master/summary',
  requireAuth,
  requireRole(...master),
  dashboardController.masterSummary,
);
router.get(
  '/master/team-performance',
  requireAuth,
  requireRole(...master),
  dashboardController.masterTeamPerformance,
);

export default router;
