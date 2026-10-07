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
    defaultRotateLimitAmount: z.number().positive().optional().nullable(),
  }),
});

const accountCreateSchema = z.object({
  body: z.object({
    eventId: z.string().uuid().optional(),
    label: z.string().trim().min(1).max(80),
    upiId: z.string().trim().min(3).max(80),
    payeeName: z.string().trim().min(1).max(120),
    qrImageUrl: z.string().trim().max(500).optional().nullable(),
    instructions: z.string().trim().max(500).optional().nullable(),
    rotateLimitAmount: z.number().positive().optional().nullable(),
    setAsMain: z.boolean().optional(),
  }),
});

const accountUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    label: z.string().trim().min(1).max(80).optional(),
    upiId: z.string().trim().min(3).max(80).optional(),
    payeeName: z.string().trim().min(1).max(120).optional(),
    qrImageUrl: z.string().trim().max(500).optional().nullable(),
    instructions: z.string().trim().max(500).optional().nullable(),
    rotateLimitAmount: z.number().positive().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
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

router.get(
  '/upi-stats',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  controller.stats,
);

router.post(
  '/accounts',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(accountCreateSchema),
  controller.createAccount,
);

router.patch(
  '/accounts/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(accountUpdateSchema),
  controller.updateAccount,
);

router.post(
  '/accounts/:id/set-main',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(idParamSchema),
  controller.setMain,
);

router.post(
  '/accounts/:id/set-receiving',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(idParamSchema),
  controller.setReceiving,
);

export default router;
