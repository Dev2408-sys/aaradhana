import { Router } from 'express';
import * as controller from '../controllers/accounting.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  customerIdParamSchema,
  listLedgerSchema,
  listSellerAccountingSchema,
  receivablesQuerySchema,
  saleIdParamSchema,
  sellerIdParamSchema,
} from '../validators/payment.validators';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.get(
  '/summary',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(receivablesQuerySchema),
  controller.summary,
);
router.get(
  '/receivables',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(receivablesQuerySchema),
  controller.receivables,
);
router.get(
  '/sellers',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(listSellerAccountingSchema),
  controller.sellers,
);
router.post('/backfill', requireRole('SUPER_ADMIN', 'ADMIN'), controller.backfill);

router.get(
  '/sellers/:sellerId/summary',
  validate(sellerIdParamSchema),
  controller.sellerSummary,
);
router.get('/sellers/:sellerId/ledger', validate(listLedgerSchema), controller.sellerLedger);
router.get(
  '/customers/:customerId/summary',
  validate(customerIdParamSchema),
  controller.customerSummary,
);
router.get('/sales/:saleId/summary', validate(saleIdParamSchema), controller.saleSummary);

export default router;
