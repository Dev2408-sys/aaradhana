import { Router } from 'express';
import * as controller from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    unreadOnly: z.string().optional(),
  }),
});

const idSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const router = Router();

router.use(requireAuth);

router.get('/badges', controller.badges);
router.get('/', validate(listSchema), controller.list);
router.post('/read-all', controller.markAllRead);
router.post('/:id/read', validate(idSchema), controller.markRead);

export default router;
