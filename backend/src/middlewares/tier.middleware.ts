import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { connection as redis } from '../queue/connection';
import { addJob } from '../queue/producer';

// Ensure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export type UserTier = 'Free' | 'Student' | 'Pro';

declare global {
  namespace Express {
    interface Request {
      userTier?: UserTier;
      aiRouting?: {
        tier: 'standard' | 'premium';
        budget: 'low' | 'high';
      };
      logTokenUsage?: (tokens: number) => Promise<void>;
      user?: any; // Assuming auth middleware sets this
    }
  }
}

const TIER_TOKEN_LIMITS: Record<UserTier, number> = {
  Free: 10000,     // 10k tokens per day
  Student: 100000, // 100k tokens per day
  Pro: 500000,     // 500k tokens per day
};

export const tierMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id']; // Fallback to header if auth middleware isn't present
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID missing' });
    }

    // 1. Check user's tier from Supabase
    const { data: userData, error } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[TierMiddleware] Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const tier: UserTier = userData?.tier || 'Free';
    req.userTier = tier;

    // 2. Set API Routing Rules based on Tier
    if (tier === 'Pro') {
      req.aiRouting = { tier: 'premium', budget: 'high' }; // e.g. Gemini 1.5 Pro
    } else if (tier === 'Student') {
      req.aiRouting = { tier: 'premium', budget: 'low' }; // e.g. DeepSeek Chat
    } else {
      req.aiRouting = { tier: 'standard', budget: 'low' }; // e.g. Gemini 1.5 Flash 8B
    }

    // 3. Apply token limits
    // We'll use Redis to track daily token usage
    const today = new Date().toISOString().split('T')[0];
    const redisKey = `usage:tokens:${userId}:${today}`;
    const currentUsageStr = await redis.get(redisKey);
    const currentUsage = currentUsageStr ? parseInt(currentUsageStr, 10) : 0;

    const limit = TIER_TOKEN_LIMITS[tier];

    if (tier === 'Free' && currentUsage >= limit) {
      return res.status(429).json({ error: 'Rate limit exceeded. Free tier limit reached.' });
    }

    // Optional: hard limit for Student/Pro too
    if (currentUsage >= limit) {
      return res.status(429).json({ error: `Rate limit exceeded. ${tier} tier limit reached.` });
    }

    // 4. Expose async token logging using BullMQ
    req.logTokenUsage = async (tokens: number) => {
      // Optimistically increment in Redis to enforce limits in real-time
      await redis.incrby(redisKey, tokens);
      // Set expiry if it's the first time
      if (!currentUsageStr) {
        await redis.expire(redisKey, 86400); // 24 hours
      }

      // Log usage asynchronously to DB via BullMQ
      await addJob('token-usage-queue', 'log-tokens', {
        userId,
        tier,
        tokens,
        timestamp: new Date().toISOString(),
      });
    };

    next();
  } catch (err) {
    console.error('[TierMiddleware] Unexpected error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
