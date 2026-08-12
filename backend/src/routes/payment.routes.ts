import { Router } from 'express';
import {
  smsWebhookHandler,
  verifyBdPaymentHandler,
  submitBdPaymentHandler,
  getPricingConfigHandler
} from '../controllers/payment.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Get Pricing configuration (Public API for frontend)
router.get('/pricing-config', getPricingConfigHandler);

// Paddle is intentionally mounted separately at /api/payments/paddle/webhook,
// where raw-body signature verification is enforced.

// Webhook for Automated SMS Forwarding (Bangladesh bKash/Nagad) - Protected by custom header in controller
router.post('/webhook/sms-forwarder', smsWebhookHandler);

// Verification API called by frontend (Requires authentication)
router.post('/verify-bd-trx', requireAuth, verifyBdPaymentHandler);

// Submission API called by frontend to record user payment requests (Requires authentication)
router.post('/submit-bd-trx', requireAuth, submitBdPaymentHandler);

export default router;
