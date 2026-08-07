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

export async function generateFlowchartHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { code, language = 'English' } = req.body;

    if (!userId || !code) {
      res.status(400).json({ error: 'Missing code snippet' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Strict Input Limit to block Prompt Injection
    const safeCode = code.substring(0, 3000); // Allow max 3000 chars of code

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.FLOWCHART_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    // 🟢 Strict Prompt to generate JSON containing Mermaid Code
    let systemPrompt = `You are an Elite Software Architect and Code Visualizer.
Your task is to analyze the provided source code and generate a logic flowchart using Mermaid.js syntax.

RULES:
1. Understand the core logic, loops, conditions, and data flow of the code.
2. Generate a Mermaid flowchart (graph TD or graph LR). Use nice node shapes and clear labels.
3. Generate a short, descriptive title for the code snippet.
4. Output EXACTLY as a JSON object. No markdown wrapping outside the JSON.
5. Translate the node explanations and title to ${language.toUpperCase()} if requested.

JSON SCHEMA TO FOLLOW STRICTLY:
{
  "title": "Short descriptive title (e.g., QuickSort Algorithm Logic)",
  "mermaid": "graph TD\\n A[Start] --> B{Is x > 0?}\\n B -- Yes --> C[Do something]\\n B -- No --> D[End]"
}`;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }
    
    systemPrompt += strictLangInstruction;

    const userPrompt = `CODE TO ANALYZE:\n\n${safeCode}`;

    const router = new ModelRouter();
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
        
        // Clean hidden control characters that break JSON.parse
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " ");
        
        const result = JSON.parse(cleanJson);
        
        if (!result.mermaid) throw new Error("Missing Mermaid code");

        // 🟢 FIXED: Await DB save to retrieve 'savedId' so frontend highlighting syncs perfectly
        let savedId = null;
        try {
          const { data: savedRow, error: dbError } = await supabase.from('code_flowcharts').insert([{
            user_id: userId,
            title: result.title || "Code Logic Flowchart",
            code_snippet: code,
            mermaid_data: result.mermaid
          }]).select('id').single();
          
          if (dbError) {
            console.error("Flowchart DB Save Error:", dbError.message);
          } else if (savedRow) {
            savedId = savedRow.id;
          }
        } catch (dbEx) {}

        res.json({ valid: true, flowchart: result, savedId: savedId });
      } else {
        throw new Error("No JSON format detected.");
      }
    } catch (parseError: any) {
      console.error("🔥 Flowchart Parse Error:", responseText);
      
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Flowchart Generator', idempotencyKey: `flowchart:${userId}:${Date.now()}` });
      }
      
      res.json({ valid: false, error: "AI failed to generate flowchart format. Try again." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerFlowchartRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateFlowchartHandler(req, res); });
  app.use('/api/flowchart', router);
}
