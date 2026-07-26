import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

// ?? SECURITY: Using Admin client to bypass RLS for server-side trusted operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function createBattleHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { quizData, hostScore } = req.body;

    if (!userId || !quizData || !Array.isArray(quizData)) {
      res.status(400).json({ error: 'Invalid quiz data' }); return;
    }

    // ?? 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.BATTLE_ARENA_HOST;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabaseAdmin.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    // ?? FIXED: Fast, Cryptographically Secure Room Code Generation
    const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // ?? SECURITY: Exactly 1 Hour Expiration Time
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); 

    const { data, error } = await supabaseAdmin.from('quiz_battles').insert([{
      host_id: userId,
      room_code: roomCode,
      quiz_data: quizData,
      host_score: hostScore || 0,
      expires_at: expiresAt
    }]).select().single();

    if (error) throw error;

    // ?? DEDUCT TOKENS ONLY ON SUCCESS
    if (tier.toLowerCase() !== 'pro') {
      await applyCreditMutation({ userId, amount: -cost, reason: 'Hosted Battle Arena', idempotencyKey: `battle-host:${userId}:${data.id}` });
    }

    res.json({ success: true, roomCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getBattleHandler(req: Request, res: Response): Promise<void> {
  try {
    const { roomCode } = req.params;
    const { data, error } = await supabaseAdmin.from('quiz_battles').select('*').eq('room_code', roomCode.toUpperCase()).single();
    
    if (error || !data) {
      res.status(404).json({ success: false, error: 'Battle room not found' }); return;
    }

    // ?? SECURITY: Check if 1 hour has passed
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      res.json({ success: false, expired: true, error: 'This battle room has expired (1 hour limit).' }); return;
    }

    res.json({ success: true, battle: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerBattleRoutes2(app: any): void {
  const router = Router();
  router.post('/create', requireAuth, async (req: Request, res: Response) => { await createBattleHandler(req, res); });
  router.get('/:roomCode', async (req: Request, res: Response) => { await getBattleHandler(req, res); });
  app.use('/api/battle2', router);
}
