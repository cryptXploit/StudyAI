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

export async function generateLabGraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { prompt, rawData, language = 'English' } = req.body;

    if (!userId || !rawData) {
      res.status(400).json({ error: 'Missing lab data' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Strict Input Limit to block Prompt Injection & Data Overflow
    const safePrompt = prompt ? prompt.substring(0, 300) : "";
    const safeRawData = rawData.substring(0, 5000); // Allow max ~5000 chars of data

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.LAB_GRAPH;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    // 🟢 Strict Prompt to structure raw lab data into standardized Recharts JSON
    const systemPrompt = `You are an Elite Data Scientist and Lab Report Analyzer.
Your task is to take the user's messy raw lab data and their prompt, and format it into a structured JSON for a 2D Cartesian Chart.

RULES:
1. Identify the X and Y axes based on the user's data and prompt.
2. Determine the best chartType: "scatter", "line", or "bar". (Use "scatter" or "line" for most physics/chemistry lab data).
3. Extract the numerical data points. Ensure 'x' and 'y' values are Numbers, not strings.
4. Output ONLY a valid JSON object. No markdown wrapping outside the JSON.
5. Translate axes labels and title to ${language.toUpperCase()} if requested.

JSON SCHEMA TO FOLLOW:
{
  "title": "Short descriptive title (e.g., Voltage vs Current)",
  "xAxisLabel": "Name of X axis with units (e.g., Voltage (V))",
  "yAxisLabel": "Name of Y axis with units (e.g., Current (A))",
  "chartType": "scatter", 
  "data": [
    {"x": 1.5, "y": 3.2},
    {"x": 2.0, "y": 4.1}
  ]
}`;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const userPrompt = `USER REQUEST: ${safePrompt}\n\nRAW LAB DATA:\n${safeRawData}${strictLangInstruction}`;

    const router = new ModelRouter();
    // 🟢 Lowered temp for strict JSON output
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

        const chartConfig = JSON.parse(cleanJson);
        
        if (!chartConfig.data || !Array.isArray(chartConfig.data)) {
          throw new Error("Missing data array");
        }

        // 🟢 FIXED: Awaiting DB save to retrieve 'savedId' so frontend logic stays perfectly synced
        let savedId = null;
        try {
          const { data: savedRow, error } = await supabase.from('lab_graphs_history').insert([{
            user_id: userId,
            title: chartConfig.title || "Lab Report Graph",
            chart_config: chartConfig
          }]).select('id').single();
          
          if (error) {
            console.error("LabGraph DB Save Error:", error.message);
          } else if (savedRow) {
            savedId = savedRow.id;
          }
        } catch (dbEx) {
          console.error("LabGraph DB Exception:", dbEx);
        }

        // Now 'savedId' is properly passed back to the frontend
        res.json({ valid: true, chartConfig, savedId });
      } else {
        throw new Error("No JSON payload detected");
      }
    } catch (parseError) {
      console.error("🔥 LabGraph Parse Error:", responseText);
      
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Lab Graph', idempotencyKey: `lab-graph:${userId}:${Date.now()}` });
      }
      
      res.json({ valid: false, error: "Failed to parse lab data. Ensure your numbers and columns are clear." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerLabGraphRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateLabGraphHandler(req, res); });
  app.use('/api/labgraph', router);
}
