import { Router } from 'express';
import * as controller from '../controllers/seller-payment.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createSellerPaymentSchema,
  idParamSchema,
  listSellerPaymentsSchema,
} from '../validators/payment.validators';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.get('/', validate(listSellerPaymentsSchema), controller.list);
router.post('/', validate(createSellerPaymentSchema), controller.create);
router.get('/:id', validate(idParamSchema), controller.getById);
router.post('/:id/reverse', validate(idParamSchema), controller.reverse);

export default router;
