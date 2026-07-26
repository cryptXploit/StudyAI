import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const requireProTier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single();

    if (error || !user) {
      res.status(500).json({ error: 'Failed to verify account tier.' });
      return;
    }

    if (user.tier === 'PRO') {
      next();
    } else {
      res.status(403).json({ 
        error: 'PRO_REQUIRED', 
        message: 'This is a PRO tier exclusive feature. Upgrade your account to unlock this superpower!' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during tier validation.' });
  }
};
