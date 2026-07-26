import { createClient } from '@supabase/supabase-js';
import { FREE_TIER_TOKENS } from '../config/pricing.config';
import logger from '../core/logger';
import dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date().toISOString();
    
    // 1. Find all active subscriptions that have passed their end date
    const { data: expiredSubs, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .lte('current_period_end', now);

    if (error) throw error;
    if (!expiredSubs || expiredSubs.length === 0) return;

    logger.info(`Found ${expiredSubs.length} expired subscriptions. Downgrading...`);

    for (const sub of expiredSubs) {
      const userId = sub.user_id;

      // 2. Mark subscription as past_due
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'past_due' })
        .eq('user_id', userId);

      // 3. Reset user profile to Free and reset tokens
      await supabaseAdmin
        .from('profiles')
        .update({ 
          tier: 'Free',
          tokens: FREE_TIER_TOKENS
        })
        .eq('id', userId);

      // 4. Log the action
      await supabaseAdmin
        .from('reward_transactions')
        .insert([{ 
          user_id: userId, 
          amount: 0, 
          reason: 'Subscription Expired - Downgraded to Free' 
        }]);
    }
  } catch (error) {
    logger.error('Subscription Worker Error', { error: String(error) });
  }
};

// Run the check every 1 hour
setInterval(checkExpiredSubscriptions, 60 * 60 * 1000);

// Run immediately on boot
checkExpiredSubscriptions();
