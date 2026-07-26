import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { REWARDS, TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabaseAdmin = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function rewardUserTokens(userId: string, amount: number, reason: string) {
  try {
    const { data: rewardData } = await supabaseAdmin.from('user_rewards').select('total_tokens').eq('user_id', userId).maybeSingle();
    const currentTokens = rewardData?.total_tokens || 0;
    
    await supabaseAdmin.from('user_rewards').upsert(
      { user_id: userId, total_tokens: currentTokens + amount }, 
      { onConflict: 'user_id' }
    );
    await supabaseAdmin.from('reward_transactions').insert([{ user_id: userId, amount, reason }]);
  } catch (error) { throw error; }
}

export async function claimDailyDripHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?.sub;
  try {
    const { data: user, error: fetchError } = await supabaseAdmin.from('profiles').select('last_login_date, streak_count, tokens').eq('id', userId).maybeSingle();
    if (fetchError) throw new Error(fetchError.message);

    const today = new Date().toISOString().split('T')[0];
    const dbLastLogin = user?.last_login_date ? new Date(user.last_login_date).toISOString().split('T')[0] : null;

    if (dbLastLogin === today) {
      res.status(400).json({ success: false, error: "Already claimed today!" }); return;
    }

    let yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = (dbLastLogin === yesterday) ? (user?.streak_count || 0) + 1 : 1;
    let rewardTokens = REWARDS.DAILY_DRIP;
    if (newStreak % 7 === 0) rewardTokens += REWARDS.STREAK_BONUS_7_DAYS;

    const { error: updateError } = await supabaseAdmin.from('profiles').upsert({ 
      id: userId,
      last_login_date: today, 
      streak_count: newStreak
    }, { onConflict: 'id' });

    if (updateError) throw new Error("Database update failed: " + updateError.message);
    
    await applyCreditMutation({ userId, amount: rewardTokens, reason: 'Daily Login Drip', idempotencyKey: `daily-drip:${userId}:${today}` });
    res.json({ success: true, tokensAdded: rewardTokens, newStreak });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function claimProfileBountyHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?.sub;
  try {
    const { data: user } = await supabaseAdmin.from('profiles')
      .select('is_profile_optimized, full_name, university, country, session_year, dob, tokens')
      .eq('id', userId)
      .maybeSingle();
    
    if (user?.is_profile_optimized) {
      res.status(400).json({ success: false, error: "Bounty already claimed!" }); return;
    }

    if (!user?.full_name || !user?.university || !user?.country || !user?.session_year || !user?.dob) {
      res.status(400).json({ success: false, error: "Profile is not 100% complete! Fill all fields first." }); return;
    }

    const { error: updateError } = await supabaseAdmin.from('profiles').upsert({ 
      id: userId,
      is_profile_optimized: true
    }, { onConflict: 'id' });

    if (updateError) throw new Error("Failed to update profile: " + updateError.message);
    
    await applyCreditMutation({ userId, amount: REWARDS.PROFILE_COMPLETED, reason: 'Profile Completion Bounty', idempotencyKey: `profile-bounty:${userId}` });
    res.json({ success: true, tokensAdded: REWARDS.PROFILE_COMPLETED });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

// 🟢 NEW: "Zero-Cost" Heatmap Aggregation API
export async function getHeatmapDataHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?.sub;
  try {
    // Fetch only `created_at` to keep payload size under 1KB
    const { data, error } = await supabaseAdmin
      .from('reward_transactions')
      .select('created_at')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Aggregate counts by Date in Node.js (Lightning fast)
    const heatmap: Record<string, number> = {};
    if (data) {
      data.forEach((tx: any) => {
        const dateStr = new Date(tx.created_at).toISOString().split('T')[0];
        heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
      });
    }

    res.json({ success: true, heatmap });
  } catch (error: any) { 
    res.status(500).json({ success: false, error: error.message }); 
  }
}

// 🟢 NEW: Unlock Panic Mode using AI Tokens
export async function unlockPanicModeHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?.sub;
  const tier = (req as any).user?.tier || 'Free';
  
  try {
    const cost = TOKEN_COSTS.PANIC_MODE_UNLOCK;
    
    if (tier.toLowerCase() !== 'pro') {
      await applyCreditMutation({ userId, amount: -cost, reason: 'Panic Mode Instant Unlock', idempotencyKey: `panic-unlock:${userId}` });
    }

    // Set panic_referral_count to 3 to unlock the kit securely
    const { error: unlockErr } = await supabaseAdmin.from('profiles').update({ panic_referral_count: 3 }).eq('id', userId);
    if (unlockErr) throw new Error("Failed to unlock kit");

    res.json({ success: true, message: 'Panic Mode Unlocked successfully' });
  } catch (error: any) { 
    res.status(500).json({ success: false, error: error.message }); 
  }
}

export function registerGamificationRoutes(app: any): void {
  const router = Router();
  router.post('/daily-drip', requireAuth, async (req: Request, res: Response) => { await claimDailyDripHandler(req, res); });
  router.post('/claim-profile', requireAuth, async (req: Request, res: Response) => { await claimProfileBountyHandler(req, res); });
  router.post('/unlock-panic', requireAuth, async (req: Request, res: Response) => { await unlockPanicModeHandler(req, res); });
  // 🟢 NEW: Expose Heatmap Route
  router.get('/heatmap', requireAuth, async (req: Request, res: Response) => { await getHeatmapDataHandler(req, res); });
  app.use('/api/quests', router);
}
