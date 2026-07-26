import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function generateRoutineHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, days, language = 'English' } = req.body;

    if (!userId || !topic || !days) {
      res.status(400).json({ error: 'Missing topic or days' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Limit topic length to prevent prompt injection & token explosion
    const safeTopic = topic.substring(0, 300);

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.CALENDAR_SYNC;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    // 🟢 Strict Prompt to generate JSON Routine Checklist
    const systemPrompt = `You are an Elite Academic Study Planner.
The user wants to master the topic "${safeTopic}" in exactly ${days} days.
Create a highly practical, day-by-day study routine.

RULES:
1. Break the topic into ${days} logical daily milestones.
2. For each day, provide a short "title" and an array of 2-3 actionable "tasks".
3. ONLY output a valid JSON object. No markdown wrapping outside the JSON, no extra text.
4. Translate all titles and tasks fluently into ${language.toUpperCase()}.
5. NEVER use unescaped newlines or double quotes inside string values.

JSON SCHEMA TO FOLLOW EXACTLY:
{
  "routine": [
    {
      "day": 1,
      "title": "Introduction to the topic",
      "tasks": [
        {"id": "d1-t1", "task": "Read chapter 1", "completed": false},
        {"id": "d1-t2", "task": "Take a 10 min quiz", "completed": false}
      ]
    }
  ]
}`;

    const router = new ModelRouter();
    // 🟢 Temperature lowered to 0.1 for maximum JSON structural rigidity
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }], 
      userId, tier, { temperature: 0.1 }
    );

    try {
      // 🟢 BULLETPROOF JSON EXTRACTION & CLEANING
      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        
        // Clean hidden control characters that break JSON.parse
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " ");
        
        const result = JSON.parse(cleanJson);
        
        if (!result.routine || !Array.isArray(result.routine)) {
          throw new Error("Missing 'routine' array in JSON.");
        }
        
        
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Study Planner Generator', idempotencyKey: `planner:${userId}:${Date.now()}` });
      }
      
      res.json({ valid: true, routineData: result });
      } else {
        throw new Error("No JSON payload detected");
      }
    } catch (parseError) {
      console.error("🔥 Routine Parse Error:", responseText);
      res.status(500).json({ valid: false, error: "Failed to parse AI Routine. Please try again." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 🟢 Register the Planner routes
export function registerPlannerRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateRoutineHandler(req, res); });
  app.use('/api/planner', router);
}
