import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { PRICING_TIERS } from '../config/pricing.config';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { claimBangladeshPayment } from '../services/creditLedger.service';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

const smsSecret = process.env.SMS_SECRET_HEADER || '';

export const getPricingConfigHandler = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    status: 'success',
    data: Object.values(PRICING_TIERS),
    tokenCosts: TOKEN_COSTS,
  });
};

/**
 * This endpoint only records an incoming payment notification. It never grants
 * credits; a signed-in user must later claim an exact matching transaction.
 */
export const smsWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  if (!smsSecret || req.headers['x-sms-secret'] !== smsSecret) {
    res.status(401).json({ detail: 'Unauthorized' });
    return;
  }

  try {
    const messageText = String(req.body?.message || '');
    const trxMatch = messageText.match(/TrxID\s+([A-Z0-9]+)/i);
    const amountMatch = messageText.match(/Tk\s+([\d.]+)/i);
    const senderMatch = messageText.match(/from\s+(\d{11})/i);

    if (!trxMatch || !amountMatch || !senderMatch) {
      res.status(400).json({ detail: 'Payment notification could not be parsed' });
      return;
    }

    const { error } = await supabaseAdmin.from('bd_transactions').insert({
      trx_id: trxMatch[1].toUpperCase(),
      amount: Number(amountMatch[1]),
      sender_number: senderMatch[1],
      status: 'pending',
    });

    // A duplicate provider notification is safe and expected on retries.
    if (error && error.code !== '23505') throw error;
    res.status(200).json({ status: 'processed' });
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export const verifyBdPaymentHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  const transactionId = String(req.body?.trx_id || '').trim().toUpperCase();
  const tierId = String(req.body?.tier_id || '').trim();
  const tier = PRICING_TIERS[tierId];

  if (!userId || !transactionId || !tier) {
    res.status(400).json({ detail: 'Valid transaction ID and pricing tier are required' });
    return;
  }

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + tier.durationDays);

  try {
    await claimBangladeshPayment({
      userId,
      transactionId,
      expectedAmount: tier.bdPrice,
      credits: tier.tokens,
      planType: tier.id,
      periodEnd: periodEnd.toISOString(),
    });

    res.status(200).json({ status: 'success', message: `${tier.title} activated successfully.` });
  } catch (error: any) {
    const message = error?.message || 'Payment verification failed';
    const status = /INVALID_OR_CLAIMED|PAYMENT_AMOUNT_MISMATCH/.test(message) ? 400 : 500;
    res.status(status).json({ detail: status === 400 ? 'Invalid, already claimed, or incorrectly priced transaction.' : message });
  }
};
