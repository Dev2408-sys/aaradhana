import { Router } from 'express';
import * as controller from '../controllers/upload.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { paymentProofUpload, upiQrUpload } from '../middleware/upload';

const router = Router();

router.use(requireAuth);

router.post(
  '/payment-proof',
  requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'),
  paymentProofUpload.single('file'),
  controller.uploadPaymentProof,
);

router.post(
  '/upi-qr',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  upiQrUpload.single('file'),
  controller.uploadUpiQr,
);

export default router;
