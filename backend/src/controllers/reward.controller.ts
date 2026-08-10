import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { DailyDripService } from '../services/dailyDrip.service';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function: Dynamic Config লোড করার জন্য (Privilege Escalation Protection)
const getReferralConfig = () => {
  try {
    const configPath = path.join(__dirname, '../config/referralConfig.json');
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(rawConfig).referral;
  } catch (error) {
    console.warn("Missing referralConfig.json, falling back to defaults.");
    return { senderReward: 100, receiverReward: 50 }; // Default Fallback
  }
};

// [EXISTING CLAIM HANDLER INTACT]
export async function claimRewardHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  const { roomCode, score } = req.body;

  try {
    const { data: battle } = await supabaseAdmin.from('quiz_battles').select('*').eq('room_code', roomCode).single();
    if (!battle) { res.status(404).json({ error: 'Battle room not found' }); return; }

    const { error: insertError } = await supabaseAdmin.from('reward_claims').insert([{ user_id: userId, room_code: roomCode }]);
    
    if (insertError) {
      if (insertError.code === '23505') {
         res.json({ success: true, alreadyClaimed: true }); return;
      }
      throw insertError;
    }

    const maxPossibleScore = battle.quiz_data.length * 150;
    const validScore = Math.min(Number(score) || 0, maxPossibleScore);

    let awardedTokens = 0;

    if (userId === battle.host_id) {
      awardedTokens = 20 + (battle.host_score * 5); 
      await rewardUser(userId, awardedTokens, `Creator Bonus: Hosted Battle Room ${roomCode}`);
    } else {
      awardedTokens = Math.max(5, Math.floor(validScore / 25));
      await rewardUser(userId, awardedTokens, `Completed Battle Room ${roomCode}`);

      const hostReferralTokens = Math.floor(awardedTokens * 0.30);
      if (hostReferralTokens > 0 && battle.host_id) {
        await rewardUser(battle.host_id, hostReferralTokens, `Referral Bonus: Friend completed Room ${roomCode}`);
      }

      await supabaseAdmin.from('quiz_results').insert([{
        user_id: userId,
        topic: `Friend's Shared Quiz (${roomCode})`,
        total_questions: battle.quiz_data.length,
        correct_answers: Math.max(0, Math.floor(validScore / 150)), 
        score_percentage: Math.min(100, (validScore / maxPossibleScore) * 100),
      }]);
    }

    res.json({ success: true, tokens: awardedTokens, alreadyClaimed: false });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

async function rewardUser(userId: string, amount: number, reason: string) {
  await applyCreditMutation({
    userId,
    amount,
    reason,
    // Every reward reason includes its domain event (room code/referral code),
    // so retried requests cannot issue the same reward twice.
    idempotencyKey: `reward:${userId}:${reason}`,
  });
}

// ============================================================================
// 🟢 HACK-PROOF REFERRAL SYSTEM (Role, IDOR & Double-Claim Protected)
// ============================================================================

export async function getReferralDataHandler(req: Request, res: Response): Promise<void> {
  // IDOR Protection: ID comes securely from decoded JWT token
  const userId = (req as any).user?.id;
  try {
    let { data: user } = await supabaseAdmin.from('profiles').select('referral_code, neural_referral_count, neural_unlocked_until').eq('id', userId).single();
    
    // Auto-generate code if doesn't exist
    if (!user || !user.referral_code) {
      const newCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g., A7B8C9D0
      await supabaseAdmin.from('profiles').update({ referral_code: newCode }).eq('id', userId);
      user = { referral_code: newCode, neural_referral_count: 0, neural_unlocked_until: null };
    }

    // Count successful referrals
    const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.referral_code);

    res.json({ 
      success: true, 
      referralCode: user.referral_code, 
      totalReferred: count || 0,
      neuralReferralCount: user.neural_referral_count || 0,
      neuralUnlockedUntil: user.neural_unlocked_until || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function applyReferralHandler(req: Request, res: Response): Promise<void> {
  // IDOR Protection: The user getting the reward is explicitly the logged-in user
  const newUserId = (req as any).user?.id;
  const { referralCode, context } = req.body;

  if (!referralCode) {
    res.status(400).json({ error: 'Missing referral code' }); return;
  }

  try {
    const code = String(referralCode).toUpperCase().trim();

    // 1. Fetch the owner of the referral code (The Sender)
    const { data: sender } = await supabaseAdmin.from('profiles').select('id, referral_code, panic_referral_count, neural_referral_count, neural_unlocked_until').eq('referral_code', code).single();
    if (!sender) {
      res.status(404).json({ error: 'Invalid referral code.' }); return;
    }

    // 2. Prevent Self-Referral Hack (Account Takeover / Abuse Protection)
    if (sender.id === newUserId) {
      res.status(400).json({ error: 'You cannot use your own referral code.' }); return;
    }

    // 3. ATOMIC UPDATE: Check if already referred to prevent "Double Claim" exploit
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ referred_by: code })
      .eq('id', newUserId)
      .is('referred_by', null) // 🔥 ATOMIC LOCK: Only updates if they haven't been referred yet!
      .select()
      .single();

    if (updateError || !updatedUser) {
      res.status(400).json({ error: 'Referral already claimed or invalid account status.' }); return;
    }

    // 🔴 4. CONTEXT AWARE LOGIC: Panic Mode vs Global Referral vs Arena Invite
    if (context === 'panic_mode') {
      // ক) সেন্ডারের শুধু প্যানিক কাউন্টার বাড়বে (কোনো টোকেন পাবে না)
      await supabaseAdmin.from('profiles').update({ panic_referral_count: (sender.panic_referral_count || 0) + 1 }).eq('id', sender.id);
      
      // খ) রিসিভারকে ফিক্সড 20 টোকেন রিওয়ার্ড দেওয়া হলো
      await rewardUser(newUserId, 20, `Welcome Bonus: Joined via emergency link`);
      
      // গ) ফ্রন্টএন্ড মডালের জন্য রেসপন্স মেসেজে 20 পাঠানো হলো
      res.json({ success: true, message: `Emergency unlock progress updated! You earned 20 Tokens.` });
    } else if (context === 'arena_invite') {
      // 🟢 Arena Invite Referral Reward
      await rewardUser(sender.id, 20, `Arena Guild Bonus: Your recruit joined the fight!`);
      await rewardUser(newUserId, 20, `Welcome Bonus: Drafted into the Arena`);

      res.json({ success: true, message: `Drafted into the Arena! You earned 20 Tokens as a signing bonus.` });
    } else if (context === 'neural_feed') {
      // 🟢 Neural Feed Referral Unlock (3 Friends = 30 days)
      const currentCount = sender.neural_referral_count || 0;
      const newCount = currentCount + 1;
      
      let updates: any = { neural_referral_count: newCount };
      let rewardMessage = `Friend unlocked Neural Feed via your link! (${newCount}/3)`;
      
      if (newCount >= 3) {
        updates.neural_referral_count = 0; // reset
        const unlockDate = new Date();
        unlockDate.setDate(unlockDate.getDate() + 30);
        updates.neural_unlocked_until = unlockDate.toISOString();
        rewardMessage = `Congratulations! You unlocked Neural Feed Pro for 30 days!`;
      }
      
      await supabaseAdmin.from('profiles').update(updates).eq('id', sender.id);
      
      // Reward the new user with some tokens as a welcome bonus
      await rewardUser(newUserId, 20, `Welcome Bonus: Joined via Neural Feed Invite`);
      
      res.json({ success: true, message: `Neural Feed Invite progress updated! You earned 20 Tokens.` });
    } else {
      // 🟢 গ্লোবাল রেফারেল রিওয়ার্ড (আগের মতোই থাকবে)
      const config = getReferralConfig();
      await rewardUser(sender.id, config.senderReward, `Referral Bonus: A new friend joined using your code!`);
      await rewardUser(newUserId, config.receiverReward, `Welcome Bonus: Joined via referral code ${code}`);

      res.json({ success: true, message: `Referral applied successfully! You earned ${config.receiverReward} Tokens.` });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 🟢 NEW: Daily Drip Handler
export async function checkDailyDripHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  try {
    const result = await DailyDripService.processDailyLogin(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 🟢 NEW: Adsterra Rewarded Ad Handlers
import { REWARD_CONFIG } from '../config/rewardConfig';
import jwt from 'jsonwebtoken';

const AD_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'fallback_secret_for_ads_123';

export async function getAdStatusHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  try {
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('daily_ad_claims, last_ad_claim_date, tokens')
      .eq('id', userId)
      .single();

    if (error || !user) throw new Error('User not found');

    const todayStr = new Date().toISOString().split('T')[0];
    const lastClaimStr = user.last_ad_claim_date ? new Date(user.last_ad_claim_date).toISOString().split('T')[0] : null;

    let currentClaims = user.daily_ad_claims || 0;
    
    // Reset if it's a new day
    if (lastClaimStr !== todayStr) {
      currentClaims = 0;
    }

    res.json({
      success: true,
      maxAds: REWARD_CONFIG.MAX_DAILY_ADS,
      claimsToday: currentClaims,
      tokensPerAd: REWARD_CONFIG.TOKENS_PER_AD,
      timerSeconds: REWARD_CONFIG.AD_TIMER_SECONDS,
      adShowThreshold: REWARD_CONFIG.AD_SHOW_THRESHOLD,
      smartlinkUrl: REWARD_CONFIG.SMARTLINK_URL,
      currentTokens: user.tokens
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function startAdRewardHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  try {
    // Generate a cryptographic ticket that the user started the ad NOW
    const ticket = jwt.sign(
      { userId, startTime: Date.now() }, 
      AD_SECRET, 
      { expiresIn: '5m' } // Ticket expires in 5 minutes
    );

    res.json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function claimAdRewardHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id;
  const { ticket } = req.body;

  try {
    if (!ticket) {
      res.status(400).json({ error: 'Missing ad verification ticket' }); return;
    }

    // 1. Verify the cryptographic ticket and Timer
    let decoded: any;
    try {
      decoded = jwt.verify(ticket, AD_SECRET);
    } catch (err) {
      res.status(400).json({ error: 'Invalid or expired ad ticket. Please watch the ad again.' }); return;
    }

    if (decoded.userId !== userId) {
      res.status(403).json({ error: 'Ticket user mismatch' }); return;
    }

    const elapsedSeconds = (Date.now() - decoded.startTime) / 1000;
    
    // Add a strict backend enforcement! (If they claim before the config timer finishes)
    if (elapsedSeconds < REWARD_CONFIG.AD_TIMER_SECONDS) {
      res.status(400).json({ error: `You claimed too early! You must wait at least ${REWARD_CONFIG.AD_TIMER_SECONDS} seconds.` }); return;
    }

    // 2. Fetch user status
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('daily_ad_claims, last_ad_claim_date')
      .eq('id', userId)
      .single();

    if (fetchError || !user) throw new Error('User not found');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastClaimStr = user.last_ad_claim_date ? new Date(user.last_ad_claim_date).toISOString().split('T')[0] : null;

    let currentClaims = user.daily_ad_claims || 0;
    
    // Reset if it's a new day
    if (lastClaimStr !== todayStr) {
      currentClaims = 0;
    }

    // 3. Enforce limits
    if (currentClaims >= REWARD_CONFIG.MAX_DAILY_ADS) {
      res.status(400).json({ error: 'Daily ad limit reached' }); return;
    }

    // 4. ATOMIC UPDATE limit in profiles
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        daily_ad_claims: currentClaims + 1,
        last_ad_claim_date: today.toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 5. Award Tokens
    // We use the ticket's signature as part of the idempotency key to prevent replay attacks!
    const uniqueId = crypto.randomBytes(4).toString('hex');
    await applyCreditMutation({
      userId,
      amount: REWARD_CONFIG.TOKENS_PER_AD,
      reason: 'Watched Adsterra Rewarded Ad',
      idempotencyKey: `adsterra-reward:${userId}:${todayStr}:${currentClaims + 1}:${ticket.substring(ticket.length - 10)}`,
    });

    res.json({ 
      success: true, 
      tokens: REWARD_CONFIG.TOKENS_PER_AD, 
      claimsToday: currentClaims + 1,
      message: `Reward claimed! +${REWARD_CONFIG.TOKENS_PER_AD} Tokens` 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerRewardRoutes(app: any): void {
  const router = Router();
  // Role Protection: requireAuth middleware guarantees only valid users can trigger these
  router.post('/claim', requireAuth, async (req: Request, res: Response) => { await claimRewardHandler(req, res); });
  router.get('/referral', requireAuth, async (req: Request, res: Response) => { await getReferralDataHandler(req, res); });
  router.post('/referral/apply', requireAuth, async (req: Request, res: Response) => { await applyReferralHandler(req, res); });
  router.post('/daily-drip', requireAuth, async (req: Request, res: Response) => { await checkDailyDripHandler(req, res); });
  
  // Rewarded Ads Endpoints
  router.get('/ad-status', requireAuth, async (req: Request, res: Response) => { await getAdStatusHandler(req, res); });
  router.post('/start-ad', requireAuth, async (req: Request, res: Response) => { await startAdRewardHandler(req, res); });
  router.post('/claim-ad', requireAuth, async (req: Request, res: Response) => { await claimAdRewardHandler(req, res); });
  
  app.use('/api/rewards', router);
}
