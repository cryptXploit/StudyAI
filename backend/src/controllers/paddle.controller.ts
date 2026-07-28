import { Request, Response } from 'express';
import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';
import { PRICING_TIERS } from '../config/pricing.config';
import { grantPaidEntitlement, activateFamilyPlan } from '../services/creditLedger.service';

const paddle = new Paddle(process.env.PADDLE_API_KEY || '', {
  environment: process.env.PADDLE_ENV === 'sandbox' ? Environment.sandbox : Environment.production,
  logLevel: LogLevel.warn,
});

/**
 * The raw request body is verified before reading any custom data. Credit
 * grants are idempotent by provider transaction ID, so provider retries are safe.
 */
export const handlePaddleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = String(req.headers['paddle-signature'] || '');
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || '';

  if (!webhookSecret) {
    console.error('Paddle webhook secret is not configured');
    res.status(503).send('Webhook is not configured');
    return;
  }

  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
    const event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature) as any;

    if (event.eventType !== 'transaction.completed') {
      res.status(200).send('Ignored event');
      return;
    }

    const transaction = event.data;
    const customData = transaction.customData || transaction.custom_data || {};
    const userId = customData.userId || customData.user_id;
    const tierId = customData.tierId || customData.tier_id;
    const tier = PRICING_TIERS[tierId];

    if (!userId || !tier || !transaction.id) {
      res.status(400).send('Missing or invalid payment entitlement data');
      return;
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + tier.durationDays);

    if (tier.planKind === 'family') {
      await activateFamilyPlan({
        ownerId: userId,
        planType: tier.id,
        memberLimit: tier.memberLimit!,
        tokensPerMember: tier.tokensPerMember!,
        periodEnd: periodEnd.toISOString(),
        idempotencyKey: `paddle-transaction:${transaction.id}`,
        reason: `Purchased ${tier.title} via Paddle (TXN: ${transaction.id})`,
      });
    } else {
      await grantPaidEntitlement({
        userId,
        credits: tier.tokens,
        planType: tier.id,
        periodEnd: periodEnd.toISOString(),
        idempotencyKey: `paddle-transaction:${transaction.id}`,
        reason: `Purchased ${tier.title} via Paddle (TXN: ${transaction.id})`,
      });
    }

    res.status(200).send('Webhook processed');
  } catch (error: any) {
    console.error('Paddle webhook verification failed:', error?.message || error);
    res.status(400).send('Invalid webhook signature or payment payload');
  }
};
