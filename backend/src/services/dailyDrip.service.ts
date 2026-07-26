import { createClient } from '@supabase/supabase-js';
import { REWARDS } from '../config/tokenCosts';
import { GamificationService } from './gamification.service';
import { applyCreditMutation } from './creditLedger.service';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export class DailyDripService {
  /**
   * Lazy Evaluation: চেক করবে ইউজার আজকে লগইন বোনাস পেয়েছে কিনা।
   * না পেলে ডেইলি ড্রিপ এবং স্ট্রিক ক্যালকুলেট করে রিওয়ার্ড দেবে।
   */
  static async processDailyLogin(userId: string): Promise<{ success: boolean; tokensAdded: number; newStreak: number; message: string } | null> {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('last_login_date, streak_count, tokens, id')
        .eq('id', userId)
        .single();

      if (error || !user) return null;

      const today = new Date();
      // YYYY-MM-DD ফরম্যাটে আজকের তারিখ
      const todayStr = today.toISOString().split('T')[0]; 
      // ইউজারের সর্বশেষ লগইন তারিখ
      const lastLoginDateStr = user.last_login_date ? new Date(user.last_login_date).toISOString().split('T')[0] : null;

      // ১. যদি আজকে অলরেডি লগইন করে থাকে, তাহলে কিছুই করবে না
      if (lastLoginDateStr === todayStr) {
        return { success: true, tokensAdded: 0, newStreak: user.streak_count || 0, message: 'Already claimed today' };
      }

      let newStreak = 1; // ডিফল্ট স্ট্রিক (যদি স্ট্রিক ব্রেক হয়ে থাকে)
      let tokensToAdd = REWARDS.DAILY_DRIP || 30; // প্রতিদিনের বেস টোকেন
      let isStreakMaintained = false;

      // ২. স্ট্রিক ক্যালকুলেশন (Streak Logic)
      if (lastLoginDateStr) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // যদি গতকালও লগইন করে থাকে, তবে স্ট্রিক বাড়বে
        if (lastLoginDateStr === yesterdayStr) {
          newStreak = (user.streak_count || 0) + 1;
          isStreakMaintained = true;
        }
      }

      // ৩. ডাটাবেস আপডেট করা (স্ট্রিক, ডেট এবং টোকেন)
      await supabaseAdmin
        .from('profiles')
        .update({
          streak_count: newStreak,
          last_login_date: new Date().toISOString(),
        })
        .eq('id', userId);

      // ৪. ট্রানজেকশন হিস্ট্রি সেভ করা
      await applyCreditMutation({
        userId,
        amount: tokensToAdd,
        reason: 'Daily Login Reward',
        idempotencyKey: `daily-drip:${userId}:${todayStr}`,
      });

      // ৫. স্ট্রিক বোনাস চেক করা (যদি স্ট্রিক মেইনটেইন করে থাকে)
      let streakBonus = 0;
      if (isStreakMaintained) {
        streakBonus = await GamificationService.calculateStreakBonus(userId, newStreak);
      }

      return {
        success: true,
        tokensAdded: tokensToAdd + streakBonus,
        newStreak: newStreak,
        message: 'Daily drip processed successfully'
      };

    } catch (error: any) {
      console.error('[DailyDripService] processDailyLogin Error:', error);
      return null;
    }
  }
}
