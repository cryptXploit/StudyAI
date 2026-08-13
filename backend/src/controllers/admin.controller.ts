import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { invalidateEmbeddingConfigCache } from '../services/modelRouter';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export function registerAdminRoutes(app: any): void {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get('/api-configurations', async (_req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('api_configurations')
      .select('id, provider_name, model_name, priority, is_active, task_type, updated_at, api_key')
      .order('priority', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: (data || []).map(({ api_key, ...row }: any) => ({ ...row, has_api_key: Boolean(api_key) })) });
  });

  router.put('/api-configurations', async (req: Request, res: Response) => {
    const configs = Array.isArray(req.body?.configs) ? req.body.configs : [];
    if (!configs.length) return res.status(400).json({ error: 'configs is required' });
    for (const config of configs) {
      const payload: any = {
        provider_name: config.provider_name,
        model_name: config.model_name || null,
        priority: Number(config.priority),
        is_active: Boolean(config.is_active),
        task_type: config.task_type || 'general',
        updated_at: new Date().toISOString(),
      };
      if (typeof config.api_key === 'string' && config.api_key.trim()) payload.api_key = config.api_key.trim();
      const query = config.id && !String(config.id).startsWith('temp-')
        ? supabase.from('api_configurations').update(payload).eq('id', config.id)
        : supabase.from('api_configurations').insert(payload);
      const { error } = await query;
      if (error) return res.status(400).json({ error: error.message });
    }
    invalidateEmbeddingConfigCache();
    res.json({ success: true });
  });

  router.get('/feature-mappings', async (_req: Request, res: Response) => {
    const { data, error } = await supabase.from('ai_feature_mappings').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
  });

  router.put('/feature-mappings', async (req: Request, res: Response) => {
    const mappings = req.body?.mappings;
    if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings array is required' });
    
    for (const mapping of mappings) {
      if (!mapping.tier) continue;
      const { error } = await supabase.from('ai_feature_mappings')
        .upsert({ tier: mapping.tier, features: mapping.features || [] });
      if (error) return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  router.get('/analytics', async (_req: Request, res: Response) => {
    const [costsResult, healthResult] = await Promise.all([
      supabase.from('api_cost_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('api_health_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (costsResult.error || healthResult.error) {
      res.status(500).json({ error: costsResult.error?.message || healthResult.error?.message });
      return;
    }
    res.json({ costs: costsResult.data || [], health: healthResult.data || [] });
  });

  router.post('/process-sms', processSmsHandler);

  app.use('/api/admin', router);
}

import { PRICING_TIERS } from '../config/pricing.config';
import { claimBdPaymentAndActivateFamilyPlan, claimBangladeshPayment } from '../services/creditLedger.service';

export const processSmsHandler = async (req: Request, res: Response): Promise<void> => {
  const messageText = String(req.body?.message || '');
  
  const trxMatch = messageText.match(/(?:TrxID|TxnID|TxnId)\s*[:\-]?\s*([A-Z0-9]+)/i);
  const amountMatch = messageText.match(/(?:Tk|টাকা|Tk\.|BDT)\s*[:\-]?\s*([\d.,]+)|([\d.,]+)\s*(?:Tk|টাকা|Tk\.|BDT)/i);
  const senderMatch = messageText.match(/(?:from|Sender|A\/C|থেকে|হতে)\s*[:\-]?\s*(\d{11})|(\d{11})\s*(?:থেকে|হতে)/i);

  const trxId = trxMatch?.[1]?.toUpperCase();
  const amountStr = amountMatch ? (amountMatch[1] || amountMatch[2]) : null;
  const senderNumber = senderMatch ? (senderMatch[1] || senderMatch[2]) : null;

  if (!trxId || !amountStr || !senderNumber) {
    res.status(400).json({ error: 'Could not parse SMS. Please ensure it contains TrxID, Amount, and Sender Number.' });
    return;
  }

  const amount = Number(amountStr.replace(/,/g, ''));

  try {
    // Look up the pending request submitted by the user
    const { data: requestRow, error: reqError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('trx_id', trxId)
      .eq('status', 'pending')
      .single();

    if (reqError || !requestRow) {
      res.status(404).json({ error: 'No pending payment request found from a user for this TrxID.' });
      return;
    }

    const tier = PRICING_TIERS[requestRow.plan_type];
    if (!tier) {
      res.status(400).json({ error: 'Invalid plan type in payment request.' });
      return;
    }

    if (amount < tier.bdPrice) {
      res.status(400).json({ error: `Amount mismatch. SMS amount is ${amount} but plan costs ${tier.bdPrice}.` });
      return;
    }

    // Process the payment
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + tier.durationDays);

    // INJECT INTO bd_transactions first so the RPC can claim it!
    const { error: insertError } = await supabase.from('bd_transactions').insert({
      trx_id: trxId,
      amount: amount,
      sender_number: senderNumber,
      status: 'pending'
    });

    // If it's already there (e.g. from an old MacroDroid attempt), we just proceed.
    if (insertError && insertError.code !== '23505') {
      throw new Error(`Failed to stage transaction: ${insertError.message}`);
    }

    if (tier.planKind === 'family') {
      await claimBdPaymentAndActivateFamilyPlan({
        userId: requestRow.user_id,
        transactionId: trxId,
        expectedAmount: tier.bdPrice,
        planType: tier.id,
        memberLimit: tier.memberLimit!,
        tokensPerMember: tier.tokensPerMember!,
        periodEnd: periodEnd.toISOString(),
      });
    } else {
      await claimBangladeshPayment({
        userId: requestRow.user_id,
        transactionId: trxId,
        expectedAmount: tier.bdPrice,
        credits: tier.tokens,
        planType: tier.id,
        periodEnd: periodEnd.toISOString(),
      });
    }

    // Mark request as completed
    await supabase.from('payment_requests').update({ status: 'completed' }).eq('id', requestRow.id);

    res.json({ success: true, message: `Payment verified. ${tier.title} activated for the user.` });
  } catch (error: any) {
    console.error('Process SMS error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment.' });
  }
};
