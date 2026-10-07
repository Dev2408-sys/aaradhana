import { Router } from 'express';
import * as controller from '../controllers/pricing.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const upsertSchema = z.object({
  body: z.object({
    eventId: z.string().uuid().optional(),
    rows: z
      .array(
        z.object({
          dayNumber: z.number().int().min(1).max(10),
          ticketTypeId: z.string().uuid(),
          basePrice: z.number().positive(),
          minimumSellingPrice: z.number().positive().optional().nullable(),
          suggestedSellingPrice: z.number().positive().optional().nullable(),
        }),
      )
      .min(1)
      .max(200),
  }),
});

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'));

router.get('/', controller.list);
router.put(
  '/',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(upsertSchema),
  controller.upsert,
);

export default router;
