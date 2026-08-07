import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

// 🟢 SECURITY: Admin client for server-side trusted operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function saveBionicTextHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { text, language } = req.body;

    if (!userId || !text) {
      res.status(400).json({ error: 'Missing text content' });
      return;
    }

    // 🟢 PAYLOAD PROTECTOR: Strict Input Limit to block memory overflow attacks (Max ~50,000 chars)
    const safeText = text.substring(0, 50000);

    const tier = (req as any).user?.tier || 'Free';

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.BIONIC_READER;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabaseAdmin.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    // Generate a short title from the text safely
    const titleSnippet = safeText.trim().substring(0, 30) + "...";

    // 🟢 Save securely to Supabase using Admin Auth
    const { data: savedRow, error } = await supabaseAdmin.from('bionic_texts').insert([{
      user_id: userId,
      title: titleSnippet,
      content_text: safeText
    }]).select('id').single();

    if (error) {
      console.error("🔥 Bionic DB Save Error:", error.message);
      throw new Error("Database save failed");
    }

    
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Bionic Reader', idempotencyKey: `bionic:${userId}:${Date.now()}` });
      }
      
      res.json({ success: true, savedId: savedRow.id });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerBionicRoutes(app: any): void {
  const router = Router();
  router.post('/save', requireAuth, async (req: Request, res: Response) => { await saveBionicTextHandler(req, res); });
  app.use('/api/bionic', router);
}
