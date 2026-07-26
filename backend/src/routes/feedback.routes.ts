import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { submitFeedbackHandler } from '../controllers/feedback.controller';

const router = Router();

// Secure route to submit feedback
router.post('/submit', requireAuth, submitFeedbackHandler);

export default router;
