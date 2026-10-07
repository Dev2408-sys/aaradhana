import { Router } from 'express';
import * as controller from '../controllers/payment-settings.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const updateSchema = z.object({
  body: z.object({
    eventId: z.string().uuid().optional(),
    upiId: z.string().trim().max(80).optional().nullable(),
    upiPayeeName: z.string().trim().max(120).optional().nullable(),
    upiInstructions: z.string().trim().max(500).optional().nullable(),
    upiQrImageUrl: z.string().trim().max(500).optional().nullable(),
    supportWhatsapp: z.string().trim().max(20).optional().nullable(),
    requireUtrForUpi: z.boolean().optional(),
  }),
});

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.get('/', controller.get);
router.put(
  '/',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(updateSchema),
  controller.update,
);

export default router;
