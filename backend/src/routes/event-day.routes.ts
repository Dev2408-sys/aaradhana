import { Router } from 'express';
import * as controller from '../controllers/event-day.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));
router.get('/', controller.list);

export default router;
