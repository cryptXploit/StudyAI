import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

export interface CreditMutation {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  tier?: 'Free' | 'Student' | 'Pro' | 'PRO';
}

/**
 * The only supported path for new token grants/deductions. The database RPC
 * locks the profile row and records an immutable ledger entry in one
 * transaction, so retries and concurrent requests cannot double-spend credits.
 */
export async function applyCreditMutation(mutation: CreditMutation): Promise<number> {
  if (!mutation.idempotencyKey || mutation.idempotencyKey.length < 8) {
    throw new Error('A stable idempotency key is required for every credit mutation.');
  }

  const { data, error } = await supabaseAdmin.rpc('apply_credit_mutation', {
    p_user_id: mutation.userId,
    p_amount: mutation.amount,
    p_reason: mutation.reason,
    p_idempotency_key: mutation.idempotencyKey,
    p_tier: mutation.tier || null,
  });

  if (error) throw new Error(`Credit mutation failed: ${error.message}`);
  return Number(data);
}

export interface PaidEntitlement {
  userId: string;
  credits: number;
  planType: string;
  periodEnd: string;
  idempotencyKey: string;
  reason: string;
}

/** Atomically grants paid credits and stores the active subscription entitlement. */
export async function grantPaidEntitlement(entitlement: PaidEntitlement): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('grant_paid_entitlement', {
    p_user_id: entitlement.userId,
    p_credits: entitlement.credits,
    p_plan_type: entitlement.planType,
    p_period_end: entitlement.periodEnd,
    p_idempotency_key: entitlement.idempotencyKey,
    p_reason: entitlement.reason,
  });

  if (error) throw new Error(`Paid entitlement failed: ${error.message}`);
  return Number(data);
}

export async function claimBangladeshPayment(input: {
  userId: string;
  transactionId: string;
  expectedAmount: number;
  credits: number;
  planType: string;
  periodEnd: string;
}): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('claim_bd_payment_and_grant_entitlement', {
    p_user_id: input.userId,
    p_transaction_id: input.transactionId,
    p_expected_amount: input.expectedAmount,
    p_credits: input.credits,
    p_plan_type: input.planType,
    p_period_end: input.periodEnd,
  });

  if (error) throw new Error(`Bangladesh payment verification failed: ${error.message}`);
  return Number(data);
}
