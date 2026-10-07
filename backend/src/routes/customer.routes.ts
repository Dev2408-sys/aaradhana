import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createCustomerSchema,
  customerIdSchema,
  listCustomersSchema,
  searchCustomersSchema,
  updateCustomerSchema,
} from '../validators/customer.validators';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.get('/search', validate(searchCustomersSchema), customerController.search);
router.get('/', validate(listCustomersSchema), customerController.list);
router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/:id', validate(customerIdSchema), customerController.getById);
router.patch('/:id', validate(updateCustomerSchema), customerController.update);

export default router;
