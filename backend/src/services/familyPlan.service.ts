import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { FREE_TIER_TOKENS, PRICING_TIERS, PricingTier } from '../config/pricing.config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

export type FamilyTier = PricingTier & {
  planKind: 'family';
  memberLimit: 3 | 5;
  tokensPerMember: number;
};

export function isFamilyTier(tier: PricingTier | undefined): tier is FamilyTier {
  return Boolean(
    tier
    && tier.planKind === 'family'
    && (tier.memberLimit === 3 || tier.memberLimit === 5)
    && Number.isInteger(tier.tokensPerMember)
    && (tier.tokensPerMember as number) > 0
  );
}

function requireInvitePepper(): string {
  const pepper = process.env.FAMILY_INVITE_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error('FAMILY_INVITE_PEPPER is not securely configured');
  }
  return pepper;
}

function hashInviteCode(code: string): string {
  return crypto.createHash('sha256').update(`${code}:${requireInvitePepper()}`).digest('hex');
}

function newInviteCode(): string {
  return `FAM-${crypto.randomBytes(24).toString('base64url')}`;
}

function familyTierOrThrow(tierId: string): FamilyTier {
  const tier = PRICING_TIERS[tierId];
  if (!isFamilyTier(tier)) throw new Error('INVALID_FAMILY_TIER');
  return tier;
}

export async function activateFamilyPlan(input: {
  ownerId: string;
  tierId: string;
  periodEnd: string;
  idempotencyKey: string;
  reason: string;
}): Promise<{ groupId: string; periodEnd: string; replayed: boolean }> {
  const tier = familyTierOrThrow(input.tierId);
  const { data, error } = await supabaseAdmin.rpc('activate_family_plan', {
    p_owner_id: input.ownerId,
    p_plan_type: tier.id,
    p_member_limit: tier.memberLimit,
    p_tokens_per_member: tier.tokensPerMember,
    p_period_end: input.periodEnd,
    p_idempotency_key: input.idempotencyKey,
    p_reason: input.reason,
  });

  if (error) throw new Error(`Family activation failed: ${error.message}`);
  return {
    groupId: String(data.group_id),
    periodEnd: String(data.period_end),
    replayed: Boolean(data.replayed),
  };
}

export async function claimBangladeshFamilyPayment(input: {
  userId: string;
  transactionId: string;
  tierId: string;
  periodEnd: string;
}): Promise<{ groupId: string; periodEnd: string; replayed: boolean }> {
  const tier = familyTierOrThrow(input.tierId);
  const { data, error } = await supabaseAdmin.rpc('claim_bd_payment_and_activate_family_plan', {
    p_user_id: input.userId,
    p_transaction_id: input.transactionId,
    p_expected_amount: tier.bdPrice,
    p_plan_type: tier.id,
    p_member_limit: tier.memberLimit,
    p_tokens_per_member: tier.tokensPerMember,
    p_period_end: input.periodEnd,
  });

  if (error) throw new Error(`Family Bangladesh payment failed: ${error.message}`);
  return {
    groupId: String(data.group_id),
    periodEnd: String(data.period_end),
    replayed: Boolean(data.replayed),
  };
}

export async function rotateFamilyInvite(input: {
  ownerId: string;
  groupId: string;
  slotNumber: number;
}): Promise<{ code: string; link: string; expiresAt: string }> {
  if (!Number.isInteger(input.slotNumber) || input.slotNumber < 1 || input.slotNumber > 4) {
    throw new Error('INVALID_INVITE_SLOT');
  }

  const code = newInviteCode();
  const { data: group, error: groupError } = await supabaseAdmin
    .from('family_groups')
    .select('current_period_end')
    .eq('id', input.groupId)
    .eq('owner_id', input.ownerId)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .single();

  if (groupError || !group) throw new Error('FAMILY_GROUP_NOT_FOUND');

  const { error } = await supabaseAdmin.rpc('rotate_family_invite', {
    p_owner_id: input.ownerId,
    p_group_id: input.groupId,
    p_slot_number: input.slotNumber,
    p_invite_token_hash: hashInviteCode(code),
  });
  if (error) throw new Error(`Invite rotation failed: ${error.message}`);

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return {
    code,
    link: `${frontendUrl}/settings/family?invite=${encodeURIComponent(code)}`,
    expiresAt: String(group.current_period_end),
  };
}

export async function consumeFamilyInvite(userId: string, code: string): Promise<{ groupId: string; ownerId: string; periodEnd: string }> {
  if (!/^FAM-[A-Za-z0-9_-]{20,}$/.test(code)) throw new Error('INVALID_INVITE');

  const { data, error } = await supabaseAdmin.rpc('consume_family_invite', {
    p_user_id: userId,
    p_invite_token_hash: hashInviteCode(code),
  });
  if (error) throw new Error(`Invite consumption failed: ${error.message}`);

  return {
    groupId: String(data.group_id),
    ownerId: String(data.owner_id),
    periodEnd: String(data.period_end),
  };
}

export async function getFamilyGroupForUser(userId: string): Promise<any | null> {
  const now = new Date().toISOString();
  let group: any = null;
  let isOwner = false;

  const { data: ownedGroup } = await supabaseAdmin
    .from('family_groups')
    .select('*')
    .eq('owner_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', now)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ownedGroup) {
    group = ownedGroup;
    isOwner = true;
  } else {
    const { data: membership } = await supabaseAdmin
      .from('family_group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!membership) return null;
    const { data: joinedGroup } = await supabaseAdmin
      .from('family_groups')
      .select('*')
      .eq('id', membership.group_id)
      .eq('status', 'active')
      .gt('current_period_end', now)
      .maybeSingle();
    if (!joinedGroup) return null;
    group = joinedGroup;
  }

  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', group.owner_id)
    .maybeSingle();

  const { data: members } = await supabaseAdmin
    .from('family_group_members')
    .select('user_id, status, joined_at, revoked_at')
    .eq('group_id', group.id)
    .order('joined_at', { ascending: true });

  const memberIds = (members || []).map((member: any) => member.user_id);
  const { data: memberProfiles } = memberIds.length
    ? await supabaseAdmin.from('profiles').select('id, full_name, avatar_url').in('id', memberIds)
    : { data: [] as any[] };
  const profilesById = new Map((memberProfiles || []).map((profile: any) => [profile.id, profile]));

  const result: any = {
    id: group.id,
    planType: group.plan_type,
    memberLimit: group.member_limit,
    tokensPerMember: group.tokens_per_member,
    periodEnd: group.current_period_end,
    owner: owner || { id: group.owner_id, full_name: null, avatar_url: null },
    isOwner,
    members: (members || []).map((member: any) => ({
      ...member,
      profile: profilesById.get(member.user_id) || null,
    })),
  };

  if (isOwner) {
    const { data: invites } = await supabaseAdmin
      .from('family_group_invites')
      .select('id, slot_number, status, expires_at, consumed_at')
      .eq('group_id', group.id)
      .order('slot_number', { ascending: true });
    result.invites = invites || [];
  }

  return result;
}

export async function revokeFamilyMember(input: { ownerId: string; groupId: string; memberUserId: string }): Promise<void> {
  const { error } = await supabaseAdmin.rpc('revoke_family_member', {
    p_owner_id: input.ownerId,
    p_group_id: input.groupId,
    p_member_user_id: input.memberUserId,
    p_free_tokens: FREE_TIER_TOKENS,
  });
  if (error) throw new Error(`Family member revoke failed: ${error.message}`);
}
