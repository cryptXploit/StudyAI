import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

// 🟢 SECURITY: Admin client for server-side trusted operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function generateBattleHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { conceptA, conceptB, language = 'English' } = req.body;

    if (!userId || !conceptA || !conceptB) {
      res.status(400).json({ error: 'Missing concepts' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Strict Input Limit to block Prompt Injection
    const safeConceptA = conceptA.substring(0, 100).trim();
    const safeConceptB = conceptB.substring(0, 100).trim();

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.CONCEPT_BATTLE;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabaseAdmin.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    // 🟢 Strict Prompt to structure the versus data
    const systemPrompt = `You are an Elite Academic Concept Analyzer.
Compare the two concepts provided by the user. 
Output ONLY a valid JSON object. No markdown wrapping outside the JSON.
Translate the ENTIRE output (headers, table content, pros, cons) into ${language.toUpperCase()}.

JSON SCHEMA TO FOLLOW:
{
  "conceptA": "Name of first concept",
  "conceptB": "Name of second concept",
  "comparisonTable": [
    {"feature": "Basis of Comparison (e.g., Speed/Cost/Type)", "valA": "Concept A Value", "valB": "Concept B Value"}
  ],
  "prosConsA": {
    "pros": ["Pro 1", "Pro 2"],
    "cons": ["Con 1", "Con 2"]
  },
  "prosConsB": {
    "pros": ["Pro 1", "Pro 2"],
    "cons": ["Con 1", "Con 2"]
  },
  "whenToUseA": "Short description of when to use Concept A.",
  "whenToUseB": "Short description of when to use Concept B."
}`;

    const userPrompt = `COMPARE: "${safeConceptA}" vs "${safeConceptB}"`;

    const router = new ModelRouter();
    // Your ModelRouter will natively hit Redis Cache if this exact prompt was searched before!
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], 
      userId, tier, { temperature: 0.1 }
    );

    try {
      // 🟢 BULLETPROOF JSON EXTRACTION & CLEANING
      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " "); // Strip hidden line breaks

        const battleData = JSON.parse(cleanJson);
        
        if (!battleData.comparisonTable || !Array.isArray(battleData.comparisonTable)) {
          throw new Error("Missing comparison matrix");
        }

        // 🟢 Save strictly to Supabase History and retrieve ID for frontend highlighting
        let savedId = null;
        try {
          const { data: savedRow, error: dbError } = await supabaseAdmin.from('concept_battles').insert([{
            user_id: userId,
            concept_a: safeConceptA,
            concept_b: safeConceptB,
            battle_data: battleData
          }]).select('id').single();
          
          if (dbError) {
            console.error("Battle DB Save Error:", dbError.message);
          } else if (savedRow) {
            savedId = savedRow.id;
          }
        } catch (dbEx) {}

        
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Concept Battle', idempotencyKey: `concept-battle:${userId}:${savedId || Date.now()}` });
      }
      
      res.json({ valid: true, battleData, savedId });
      } else {
        throw new Error("No JSON format detected");
      }
    } catch (parseError) {
      console.error(parseError);
      res.status(500).json({ error: "Failed to parse battle data. Ensure concepts are clear." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerBattleRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateBattleHandler(req, res); });
  app.use('/api/concept-battle', router);
}
