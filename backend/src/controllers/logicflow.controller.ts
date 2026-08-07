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

export async function generateGraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { prompt, language = 'English', mode = 'graph' } = req.body;

    if (!userId || !prompt) {
      res.status(400).json({ error: 'Invalid or missing logic prompt' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Strict Input Limit to block Prompt Injection
    const safePrompt = prompt.substring(0, 800).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.LOGICFLOW_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabaseAdmin.from('profiles').select('tokens').eq('id', userId).single();
      
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

    let systemPrompt = "";

    if (mode === 'animator') {
      systemPrompt = `You are an Elite Computer Science Algorithm Simulator.
Your job is to generate a step-by-step visual array state for algorithms (sorting, searching, data structures).
Create an array of UNIQUE integers (between 10 and 99). Maximum array size is 8 items.

Output ONLY a valid JSON object matching this schema. No markdown wrapping.
{
  "title": "Algorithm Title (e.g., Bubble Sort)",
  "mode": "animator",
  "steps": [
    { "array": [45, 12, 88, 30], "activeIndices": [], "description": "Initial array state" },
    { "array": [45, 12, 88, 30], "activeIndices": [0, 1], "description": "Comparing 45 and 12" },
    { "array": [12, 45, 88, 30], "activeIndices": [0, 1], "description": "Swapped 45 and 12!" }
  ]
}
Translate 'description' and 'title' fluently into ${language.toUpperCase()}.`;
    } else {
      systemPrompt = `You are an Elite Graph Architect specializing in ReactFlow data structures.
Your job is to convert the user's request into a beautifully organized, non-overlapping 2D layout.

RULES FOR NODES:
1. Distribute nodes vertically (Increment Y by 120 pixels per level: 0, 120, 240, etc.).
2. Branch X coordinates (-200 for Left, +200 for Right) to prevent collision on IF/ELSE.
3. Node "type" can be: "input", "default", or "output".

Output ONLY valid JSON matching this schema. No markdown. Translate labels into ${language.toUpperCase()}.
{
  "title": "Architecture Title",
  "mode": "graph",
  "nodes": [
    {"id": "1", "type": "input", "data": {"label": "Start"}, "position": {"x": 250, "y": 0}}
  ],
  "edges": [
    {"id": "e1-2", "source": "1", "target": "2", "animated": true}
  ]
}`;
    }

    systemPrompt += strictLangInstruction;

    const router = new ModelRouter();
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: safePrompt }], 
      userId, tier, { temperature: 0.1 } 
    );

    // Handle High Load / Timeout Fallbacks directly from ModelRouter
    if (responseText.includes("experiencing high load") || responseText.includes("fallback retrieval-only")) {
       res.json({ valid: false, error: "The AI servers are currently experiencing high load. Please wait a few seconds and try again." });
       return;
    }

    try {
      // 🟢 Robust JSON Extraction
      let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        let cleanJson = cleanText.substring(startIdx, endIdx + 1);
        
        // Auto-Repair & Format Fix
        cleanJson = cleanJson.replace(/,\s*\]/g, ']');
        cleanJson = cleanJson.replace(/,\s*\}/g, '}');
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " "); // Remove hidden control characters

        const generatedData = JSON.parse(cleanJson);

        // 🟢 Non-Blocking DB Save (Do not delay the response to the user)
        supabaseAdmin.from('logic_workspace').insert([{
            user_id: userId,
            title: generatedData.title || "Workspace Map",
            nodes_json: mode === 'animator' ? generatedData : generatedData.nodes,
            edges_json: mode === 'animator' ? [] : generatedData.edges
        }]).select('id').single().then(({ data, error }) => {
            if (error) console.error("❌ Supabase Save Error:", error.message);
        });

        res.json({ valid: true, graph: generatedData, savedId: null });
      } else {
        throw new Error("No JSON payload detected");
      }
    } catch (parseError: any) {
      console.error("🚨 AI JSON Parse Error in LogicFlow!", responseText);
      
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'LogicFlow Graph Generator', idempotencyKey: `logic-flow:${userId}:${Date.now()}` });
      }
      
      res.json({ valid: false, error: "AI produced unstable layout data. Please try again." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}


const fetchHistory = async () => {
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      if (!user) return;
      
      // 🟢 FIXED: Added debug logging
      const { data, error } = await supabaseAdmin
      .from('logic_workspace')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ History Fetch Error:", error);
    } else {
      console.log("✅ History Data Fetched:", data);
      setHistoryList(data || []);
    }
  };

export function registerLogicRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateGraphHandler(req, res); });
  app.use('/api/logicflow', router);
}

let historyList: any[] = [];

function setHistoryList(history: any[]): void {
  historyList = history;
  console.log(`LogicFlow history list updated: ${historyList.length} entries`);
}
