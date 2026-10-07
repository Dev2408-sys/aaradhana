import { Router } from 'express';
import * as ticketController from '../controllers/ticket.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listTicketsSchema, ticketIdSchema } from '../validators/sale.validators';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.get('/stats', ticketController.stats);
router.get('/', validate(listTicketsSchema), ticketController.list);
router.get('/:id', validate(ticketIdSchema), ticketController.getById);

export default router;
