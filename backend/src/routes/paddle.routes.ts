import { Router } from 'express';
import express from 'express';
import { handlePaddleWebhook } from '../controllers/paddle.controller';

const router = Router();

// Paddle webhook verification requires the RAW body string.
// We must parse it with express.raw before our general express.json() can intercept it (or we can just parse it here).
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handlePaddleWebhook
);

export default router;
