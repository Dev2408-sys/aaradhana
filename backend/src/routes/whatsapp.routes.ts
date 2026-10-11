import { Router } from 'express';
import * as controller from '../controllers/whatsapp.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { whatsappImageUpload } from '../middleware/upload';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/status', controller.status);
router.post('/bulk', whatsappImageUpload.single('image'), controller.bulkSend);

export default router;
