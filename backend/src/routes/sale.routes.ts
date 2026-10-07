import { Router } from 'express';
import * as saleController from '../controllers/sale.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  approveSaleSchema,
  createSaleSchema,
  listSalesSchema,
  rejectSaleSchema,
  saleIdSchema,
} from '../validators/sale.validators';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.post('/', validate(createSaleSchema), saleController.create);
router.get('/', validate(listSalesSchema), saleController.list);
router.get('/:id/slip', validate(saleIdSchema), saleController.slip);
router.post(
  '/:id/approve',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(approveSaleSchema),
  saleController.approve,
);
router.post(
  '/:id/reject',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(rejectSaleSchema),
  saleController.reject,
);
router.post(
  '/:id/mark-whatsapp-sent',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(saleIdSchema),
  saleController.markWhatsAppSent,
);
router.get('/:id', validate(saleIdSchema), saleController.getById);

export default router;
