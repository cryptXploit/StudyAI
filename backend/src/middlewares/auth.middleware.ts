import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Load Supabase keys (Ensure these are in your backend .env)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check if token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
      return;
    }

    // Fetch the single source of truth from profiles to prevent stale metadata issues
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, tenant_id')
      .eq('id', user.id)
      .single();

    // Attach verified user to request object (Matches your chat.controller logic)
    (req as any).user = {
      id: user.id,
      email: user.email,
      tier: profile?.tier || user.user_metadata?.tier || 'Free',
      tenantId: profile?.tenant_id || user.user_metadata?.tenant_id,
    };

    next();
  } catch (error: any) {
    // 🟢 NEW: Handle network errors gracefully without breaking the terminal
    if (error?.message?.includes('fetch failed') || error?.code === 'ECONNRESET') {
      console.warn('[AuthMiddleware] Network Error: Unable to reach authentication server.');
      res.status(503).json({ error: 'Service temporarily unavailable. Please check your internet connection.' });
      return;
    }
    
    console.error('[AuthMiddleware] Error:', error.message || error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
