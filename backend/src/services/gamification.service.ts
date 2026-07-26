import { createClient } from '@supabase/supabase-js';
import { REWARDS } from '../config/tokenCosts'; // আপনার কনফিগ ফাইল

import { applyCreditMutation } from './creditLedger.service';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export class GamificationService {
  /**
   * 1. Profile Bounty Claim: ১০০% প্রোফাইল কমপ্লিট করলে রিওয়ার্ড দেওয়া
   */
  static async claimProfileBounty(userId: string): Promise<{ success: boolean; tokens: number; message: string }> {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('is_profile_optimized, tokens')
        .eq('id', userId)
        .single();

      if (error || !user) throw new Error('User not found.');
      if (user.is_profile_optimized) {
        return { success: false, tokens: 0, message: 'Profile bounty already claimed.' };
      }

      const bountyAmount = REWARDS.PROFILE_COMPLETED || 100;

      // Atomic Update: Mark as optimized and add tokens
      await supabaseAdmin
        .from('profiles')
        .update({ is_profile_optimized: true })
        .eq('id', userId);

      await applyCreditMutation({
        userId,
        amount: bountyAmount,
        reason: 'Quest Completed: 100% Profile Optimization',
        idempotencyKey: `profile-bounty:${userId}`,
      });

      return { success: true, tokens: bountyAmount, message: 'Profile optimized successfully! 100 Tokens added.' };
    } catch (error: any) {
      console.error('[GamificationService] claimProfileBounty Error:', error);
      throw error;
    }
  }

  /**
   * 2. Calculate Streak Bonus: ৩ দিন বা ৭ দিনের স্ট্রিক পূর্ণ হলে এক্সট্রা বোনাস
   */
  static async calculateStreakBonus(userId: string, streakCount: number): Promise<number> {
    let bonusAmount = 0;
    let reason = '';

    if (streakCount === 3) {
      bonusAmount = REWARDS.STREAK_BONUS_3_DAYS || 50;
      reason = 'Milestone Reached: 3-Day Study Streak! 🔥';
    } else if (streakCount === 7) {
      bonusAmount = REWARDS.STREAK_BONUS_7_DAYS || 150;
      reason = 'Epic Milestone: 7-Day Study Streak! 👑';
    }

    if (bonusAmount > 0) {
      // Add bonus tokens securely
      await applyCreditMutation({
        userId,
        amount: bonusAmount,
        reason,
        idempotencyKey: `streak-bonus:${userId}:${streakCount}`,
      });
      
      return bonusAmount;
    }
    
    return 0; // No bonus for other days
  }
}
