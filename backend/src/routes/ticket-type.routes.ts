import { Router } from 'express';
import * as ticketTypeController from '../controllers/ticket-type.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'),
  ticketTypeController.list,
);

export default router;
