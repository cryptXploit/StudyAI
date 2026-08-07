import { Request, Response } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

// Initialize Supabase safely
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function moleculeInsightHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { compoundName, language = 'English' } = req.body;

    if (!userId || !compoundName) {
      res.status(400).json({ error: 'Missing compoundName' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Limit compound name to prevent prompt injection or token explosion
    const safeCompoundName = compoundName.substring(0, 100).trim();
    const cacheKey = safeCompoundName.toLowerCase();

    // 🟢 1. DATABASE CACHE CHECK
    let cachedData = null;
    try {
      const result = await supabase
        .from('molecule_insights')
        .select('insight')
        .eq('compound_name', cacheKey)
        .eq('language', language)
        .maybeSingle();
      cachedData = result.data;
    } catch (dbErr) {
      console.warn("🛡️ Database Cache Table missed or not ready. Flowing directly to LLM.");
    }

    if (cachedData && cachedData.insight) {
      res.json({ insight: cachedData.insight });
      return;
    }

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected - Only if generating fresh)
    const cost = TOKEN_COSTS.MOLECULE_INSIGHT;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    // 🟢 2. GENERATE NEW INSIGHT
    let systemPrompt = `You are a brilliant Chemistry Lab Assistant.
Provide a fascinating, easy-to-understand summary about the chemical compound "${safeCompoundName}".
Include:
1. Common medical, industrial, or daily uses.
2. A fun fact or historical discovery context.
3. Basic safety or hazard warnings (if applicable).
Keep it under 100 words, use bullet points with emojis.
MANDATORY LANGUAGE: You MUST generate the ENTIRE response fluently in ${language.toUpperCase()}.`;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }
    systemPrompt += strictLangInstruction;

    const router = new ModelRouter();
    const responseText = await router.generate([{ role: 'system', content: systemPrompt }], userId, tier, { temperature: 0.4 });

    // 🟢 3. SAVE TO CACHE (Non-blocking)
    void (async () => {
      try {
        const { error } = await supabase.from('molecule_insights').insert([{
          compound_name: cacheKey,
          language: language,
          insight: responseText,
          created_by: userId
        }]);
        if (error) console.error("Insight Cache Save Error:", error.message);
      } catch {
        // Cache writes are best-effort.
      }
    })();

    // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
    if (tier.toLowerCase() !== 'pro') {
      await applyCreditMutation({ userId, amount: -cost, reason: 'Molecule Insight Generator', idempotencyKey: `molecule:${userId}:${Date.now()}`, tier });
    }

    res.json({ insight: responseText });

  } catch (error: any) {
    console.error("🔥 Critical Molecule Handler Failure:", error.message);
    res.status(500).json({ error: error.message });
  }
}

export function registerMoleculeRoutes(app: any): void {
  app.post('/api/molecule/insight', requireAuth, async (req: Request, res: Response) => { await moleculeInsightHandler(req, res); });
}
