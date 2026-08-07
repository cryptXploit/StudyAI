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

export async function generateScheduleHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, examDate, language = 'English' } = req.body;

    if (!userId || !topic || !examDate) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Strict Input Limit to block Prompt Injection
    const safeTopic = topic.substring(0, 300).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.CALENDAR_SYNC;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const systemPrompt = `You are an Elite Academic Planner. Create a highly effective daily study schedule leading up to the exam date.
RULES:
1. Output ONLY a valid JSON object. No markdown wrapping outside the JSON, no conversational text.
2. NEVER use unescaped double quotes or line breaks inside string values.
3. Output strictly in ${language.toUpperCase()}.

JSON SCHEMA TO FOLLOW:
{
  "routine": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "task": "Chapter or Topic name",
      "description": "1 sentence study goal without line breaks."
    }
  ]
}${strictLangInstruction}`;

    const router = new ModelRouter();
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Topic: ${safeTopic}\nExam Date: ${examDate}` }], 
      userId, tier, { temperature: 0.1 } 
    );

    try {
      // 🟢 BULLETPROOF JSON EXTRACTION & CLEANING
      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " "); 

        const schedule = JSON.parse(cleanJson);

        if (!schedule.routine || !Array.isArray(schedule.routine)) {
          throw new Error("Invalid routine array");
        }

        // 🟢 Non-Blocking DB Save (Zero Latency impact on user response)
        void (async () => {
          try {
            const { error } = await supabase.from('calendar_routines').insert([{
              user_id: userId,
              topic: safeTopic,
              exam_date: examDate,
              schedule_data: schedule
            }]).select('id').single();
            if (error) console.error("Calendar DB Save Error:", error.message);
          } catch {
            // Best-effort history write.
          }
        })();

        // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
        if (tier.toLowerCase() !== 'pro') {
          await applyCreditMutation({ userId, amount: -cost, reason: 'Calendar Sync', idempotencyKey: `calendar-sync:${userId}:${Date.now()}` });
        }
        
        res.json({ valid: true, schedule, savedId: null });
      } else {
        throw new Error("No JSON format detected");
      }
    } catch (parseError: any) {
      console.error("Calendar JSON Parse Error:", responseText);
      res.status(500).json({ error: "AI produced invalid schedule format. Please try again." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerCalendarRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateScheduleHandler(req, res); });
  app.use('/api/calendar-sync', router);
}
