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

export async function generateTimelineHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, language = 'English' } = req.body;

    if (!userId || !topic) {
      res.status(400).json({ error: 'Missing timeline topic' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Limit user input to prevent token explosion or prompt injection
    const safeTopic = topic.substring(0, 300);

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.TIMELINE_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    // 🟢 SUPER STRICT PROMPT: Prevent unescaped characters & markdown bugs
    const systemPrompt = `You are an Elite Historian and Data Architect.
Extract 7 to 12 major milestones for the topic chronologically (oldest to newest).

CRITICAL JSON RULES:
1. Output ONLY a valid JSON object. No conversational text, no markdown blocks.
2. NEVER use actual line breaks (newlines) inside the JSON string values. Use a single space instead.
3. Do NOT use unescaped double quotes inside strings. Use single quotes if necessary.
4. Translate all titles and texts to ${language.toUpperCase()}.

EXPECTED EXACT JSON SCHEMA:
{
  "title": "Timeline of [Topic]",
  "items": [
    {
      "title": "Year/Date",
      "cardTitle": "Short Event Name",
      "cardSubtitle": "One sentence summary",
      "cardDetailedText": "A detailed 2-3 sentence explanation. STRICTLY NO LINE BREAKS OR DOUBLE QUOTES HERE."
    }
  ]
}`;

    const router = new ModelRouter();
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: `TOPIC TO MAP: ${safeTopic}` }], 
      userId, tier, { temperature: 0.1 } // 🟢 Lowered temp to force strict JSON formatting
    );

    try {
      // 🟢 BULLETPROOF JSON EXTRACTION & CLEANING
      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        
        // Remove hidden control characters or accidental newlines that break JSON.parse
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " ");

        const timelineData = JSON.parse(cleanJson);
        
        if (!timelineData.items || !Array.isArray(timelineData.items)) {
          throw new Error("Missing items array in JSON");
        }

        // 🟢 Save to Supabase Safely
        let savedId = null;
        try {
          const { data: savedRow } = await supabase.from('timelines_history').insert([{
            user_id: userId,
            topic: safeTopic,
            timeline_data: timelineData
          }]).select().single();
          if (savedRow) savedId = savedRow.id;
        } catch (dbEx) {
          console.error("Timeline DB Save Error:", dbEx);
        }

        res.json({ valid: true, timelineData, savedId });
      } else {
        throw new Error("No JSON payload detected");
      }
    } catch (parseError: any) {
      console.error("🔥 Timeline Parsing Failed! Raw AI Output:", responseText);
      
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Timeline Generator', idempotencyKey: `timeline:${userId}:${Date.now()}` });
      }
      
      res.json({ valid: false, error: "Failed to map chronological data. Try a more specific historical topic." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerTimelineRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateTimelineHandler(req, res); });
  app.use('/api/timeline', router);
}
