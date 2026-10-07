import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as sellerController from '../controllers/seller.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createSellerSchema,
  listSellersSchema,
  referralCodeParamSchema,
  registerSellerSchema,
  sellerIdParamSchema,
  updateMyProfileSchema,
  updateSellerParentSchema,
  updateSellerSchema,
  updateSellerStatusSchema,
} from '../validators/seller.validators';

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
    code: 'RATE_LIMITED',
  },
});

// Public
router.get(
  '/referral/:sellerCode',
  validate(referralCodeParamSchema),
  sellerController.getReferral,
);
router.post(
  '/register',
  registerLimiter,
  validate(registerSellerSchema),
  sellerController.register,
);

// Authenticated seller self
router.get(
  '/me',
  requireAuth,
  requireRole('MASTER_SELLER', 'SELLER'),
  sellerController.me,
);
router.patch(
  '/me',
  requireAuth,
  requireRole('MASTER_SELLER', 'SELLER'),
  validate(updateMyProfileSchema),
  sellerController.updateMe,
);

// Authenticated list/create
router.get(
  '/',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'),
  validate(listSellersSchema),
  sellerController.list,
);
router.post(
  '/',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(createSellerSchema),
  sellerController.create,
);

// Authenticated by id
router.get(
  '/:id',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'),
  validate(sellerIdParamSchema),
  sellerController.getById,
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(updateSellerSchema),
  sellerController.update,
);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(updateSellerStatusSchema),
  sellerController.updateStatus,
);
router.patch(
  '/:id/parent',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(updateSellerParentSchema),
  sellerController.updateParent,
);
router.get(
  '/:id/team',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'),
  validate(sellerIdParamSchema),
  sellerController.getTeam,
);
router.get(
  '/:id/referral-link',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MASTER_SELLER', 'SELLER'),
  validate(sellerIdParamSchema),
  sellerController.referralLink,
);

export default router;
