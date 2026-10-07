import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
} from '../validators/auth.validators';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', requireAuth, validate(logoutSchema), authController.logout);
router.get('/me', requireAuth, authController.me);
router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
