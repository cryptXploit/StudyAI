import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  getFamilyGroupHandler,
  generateInviteHandler,
  consumeInviteHandler,
  revokeMemberHandler
} from '../controllers/family.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getFamilyGroupHandler);
router.post('/generate-invite', generateInviteHandler);
router.post('/consume-invite', consumeInviteHandler);
router.post('/revoke-member', revokeMemberHandler);

export default router;
