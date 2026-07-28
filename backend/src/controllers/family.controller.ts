import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { 
  consumeFamilyInvite, 
  rotateFamilyInvite, 
  revokeFamilyMember 
} from '../services/creditLedger.service';
import { FREE_TIER_TOKENS } from '../config/pricing.config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

// High-entropy invite code generation
function generateSecureCode(): string {
  // e.g., FAM-ABCD-1234-XYZ9
  const buf = crypto.randomBytes(6);
  return 'FAM-' + buf.toString('hex').toUpperCase();
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const getFamilyGroupHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ detail: 'Unauthorized' });
    return;
  }

  try {
    // Determine if the user is an owner or a member
    const { data: ownedGroup } = await supabaseAdmin
      .from('family_groups')
      .select(`
        id, plan_type, member_limit, tokens_per_member, current_period_end, status,
        members:family_group_members(user_id, status, joined_at, profiles!inner(name, email, avatar_url)),
        invites:family_group_invites(slot_number, status, expires_at, consumed_by, consumed_at)
      `)
      .eq('owner_id', userId)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownedGroup) {
      res.status(200).json({ status: 'success', role: 'owner', group: ownedGroup });
      return;
    }

    const { data: memberShip } = await supabaseAdmin
      .from('family_group_members')
      .select(`
        group_id, status, joined_at,
        family_groups!inner(id, owner_id, plan_type, current_period_end, status, profiles!inner(name, email, avatar_url))
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (memberShip) {
      res.status(200).json({ status: 'success', role: 'member', group: memberShip });
      return;
    }

    res.status(200).json({ status: 'success', role: 'none', group: null });
  } catch (error: any) {
    console.error('getFamilyGroupHandler error:', error);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
};

export const generateInviteHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  const groupId = req.body?.group_id;
  const slotNumber = parseInt(req.body?.slot_number, 10);

  if (!userId || !groupId || !slotNumber) {
    res.status(400).json({ detail: 'Valid group_id and slot_number are required' });
    return;
  }

  try {
    const rawCode = generateSecureCode();
    const tokenHash = hashToken(rawCode);

    await rotateFamilyInvite({
      ownerId: userId,
      groupId,
      slotNumber,
      inviteTokenHash: tokenHash,
    });

    res.status(200).json({ status: 'success', invite_code: rawCode });
  } catch (error: any) {
    res.status(400).json({ detail: error.message || 'Failed to generate invite code' });
  }
};

export const consumeInviteHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  const rawCode = String(req.body?.invite_code || '').trim();

  if (!userId || !rawCode) {
    res.status(400).json({ detail: 'Valid invite_code is required' });
    return;
  }

  try {
    const tokenHash = hashToken(rawCode);
    const result = await consumeFamilyInvite({
      userId,
      inviteTokenHash: tokenHash,
    });

    res.status(200).json({ status: 'success', data: result, message: 'Successfully joined the Family Plan!' });
  } catch (error: any) {
    res.status(400).json({ detail: error.message || 'Invalid or expired invite code' });
  }
};

export const revokeMemberHandler = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.id;
  const groupId = req.body?.group_id;
  const memberUserId = req.body?.member_user_id;

  if (!userId || !groupId || !memberUserId) {
    res.status(400).json({ detail: 'Valid group_id and member_user_id are required' });
    return;
  }

  try {
    await revokeFamilyMember({
      ownerId: userId,
      groupId,
      memberUserId,
      freeTokens: FREE_TIER_TOKENS,
    });

    res.status(200).json({ status: 'success', message: 'Member revoked successfully' });
  } catch (error: any) {
    res.status(400).json({ detail: error.message || 'Failed to revoke member' });
  }
};
