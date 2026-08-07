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

export async function generateUniverseHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, language = 'English' } = req.body;

    if (!userId || !topic) {
      res.status(400).json({ error: 'Missing universe topic' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Limit user input to prevent token explosion or prompt injection
    const safeTopic = topic.substring(0, 300);

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.UNIVERSE_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    const systemPrompt = `You are an Elite Knowledge Architect. 
Your job is to break down the user's broad topic into a 3D network graph (Nodes and Links).

RULES:
1. Generate between 12 to 25 highly relevant sub-topics (Nodes).
2. The main topic MUST be the central node.
3. Establish logical connections (Links) between these nodes to show how they relate.
4. Each node must have a short "description" (2-3 sentences explaining it).
5. Output EXACTLY a valid JSON object matching the schema below. No markdown wrapping outside the JSON.
6. Translate node names and descriptions to ${language.toUpperCase()}.

JSON SCHEMA:
{
  "nodes": [
    {"id": "Machine Learning", "name": "Machine Learning", "group": 1, "val": 10, "description": "A branch of AI focusing on data-driven algorithms."},
    {"id": "Neural Networks", "name": "Neural Networks", "group": 2, "val": 6, "description": "Computing systems inspired by biological brains."}
  ],
  "links": [
    {"source": "Machine Learning", "target": "Neural Networks"}
  ]
}
Note: 'val' determines the 3D node size (Main node should have highest val like 10, sub-nodes 4-6).`;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const router = new ModelRouter();
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt + strictLangInstruction }, { role: 'user', content: `TOPIC TO MAP: ${safeTopic}` }], 
      userId, tier, { temperature: 0.2 }
    );
    try {
      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        const graphData = JSON.parse(cleanJson);
        
        if (!graphData.nodes || !graphData.links) throw new Error("Missing graph structures");

        let savedId = null;
        try {
          const { data: savedRow } = await supabase.from('knowledge_universes').insert([{
            user_id: userId,
            topic: safeTopic,
            graph_data: graphData
          }]).select().single();
          if (savedRow) savedId = savedRow.id;
        } catch (dbEx) {}

        res.json({ valid: true, graphData, savedId });
      } else {
        throw new Error("No JSON payload detected");
      }
    } catch (parseError) {
      
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Universe Generator', idempotencyKey: `universe:${userId}:${Date.now()}` });
      }
      
      res.json({ valid: false, error: "Failed to map out the universe. Try a different topic." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerUniverseRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generateUniverseHandler(req, res); });
  app.use('/api/universe', router);
}
