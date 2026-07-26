import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS, getFeatureCost } from '../config/tokenCosts';

// 🟢 Using Admin Client to securely check database bypassing RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Middleware Factory: Checks and deducts tokens based on the requested feature.
 * @param featureName - The exact key from TOKEN_COSTS
 */
export const requireTokens = (featureName: keyof typeof TOKEN_COSTS) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const cost = getFeatureCost(featureName);

      // 1. If the feature is completely free, just proceed!
      if (cost === 0) {
        return next();
      }

      // 2. Fetch user's current tokens and tier
      const { data: user, error } = await supabaseAdmin
        .from('profiles') // The correct table name for Supabase public schema
        .select('tokens, tier')
        .eq('id', userId)
        .single();

      if (error || !user) {
        res.status(500).json({ error: 'Failed to verify token balance.' });
        return;
      }

      // 3. PRO Users get unlimited access (No token deduction)
      if (user.tier === 'PRO') {
        return next();
      }

      // 4. FREE Users: Check if they have enough tokens
      if (user.tokens < cost) {
        res.status(402).json({ 
          error: 'OUT_OF_TOKENS', 
          message: `Not enough brain juice! This action requires ${cost} tokens, but you have ${user.tokens}.`,
          requiredTokens: cost,
          currentBalance: user.tokens
        });
        return;
      }

      // 5. Deduct tokens (Non-blocking: We don't await this so the user response isn't delayed!)
      supabaseAdmin.from('profiles')
        .update({ tokens: user.tokens - cost })
        .eq('id', userId)
        .then(({ error: updateError }) => {
          if (updateError) console.error("Token Deduction Error:", updateError.message);
        });

      // Pass the updated token balance to the next function just in case we need to return it to the frontend
      (req as any).user.tokens = user.tokens - cost;
      
      next();

    } catch (error) {
      console.error("Token Guard Error:", error);
      res.status(500).json({ error: 'Internal server error during token validation.' });
    }
  };
};