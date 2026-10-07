import { Router } from 'express';
import * as controller from '../controllers/customer-payment.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createCustomerPaymentSchema,
  idParamSchema,
  listCustomerPaymentsSchema,
} from '../validators/payment.validators';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.get('/', validate(listCustomerPaymentsSchema), controller.list);
router.post('/', validate(createCustomerPaymentSchema), controller.create);
router.get('/:id', validate(idParamSchema), controller.getById);
router.post('/:id/reverse', validate(idParamSchema), controller.reverse);

export default router;
