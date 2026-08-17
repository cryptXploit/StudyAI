import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';

export async function extractEquationHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { problem } = req.body;

    if (!userId || !problem) {
      res.status(400).json({ error: 'Missing problem statement' });
      return;
    }

    const cacheKey = problem.toLowerCase().trim();

    // 🟢 Dynamic Multi-Tool Extractor Prompt
    const systemPrompt = `You are an Elite Mathematical & Logical Data Extractor.
Analyze the user's problem and determine if it belongs to one of these categories: Curve/Graph, Matrix, Statistics, or Logic Gates.
Output ONLY a valid JSON object. No markdown wrapping outside JSON, no conversational text.

JSON Schema to follow strictly:
1. For Graph/Curve:
{"valid": true, "type": "graph", "equation": "sin(x) * x"}

2. For Matrix/Linear Algebra (extract raw matrix array):
{"valid": true, "type": "matrix", "matrix": [[1, 2], [3, 4]]}

3. For Statistics (extract raw X and Y numeric arrays):
{"valid": true, "type": "stats", "dataX": [1, 2, 3], "dataY": [2, 4, 5]}

4. For Logic Gates / Boolean (extract logical expression):
{"valid": true, "type": "logic", "expression": "A AND (B OR NOT C)"}

5. If none match:
{"valid": false}`;

    const router = new ModelRouter();
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: problem }], 
      userId, tier, { temperature: 0.1 }
    );

    try {
      let cleanText = responseText;
      const thinkMatch = cleanText.match(/<think>[\s\S]*?<\/think>/);
      if (thinkMatch) {
        cleanText = cleanText.replace(thinkMatch[0], '');
      }

      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const cleanJson = cleanText.substring(startIdx, endIdx + 1);
        const result = JSON.parse(cleanJson);
        res.json(result);
      } else {
        res.json({ valid: false });
      }
    } catch (e) {
      res.json({ valid: false });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerCurveRoutes(app: any): void {
  const router = Router();
  router.post('/extract', requireAuth, async (req: Request, res: Response) => { await extractEquationHandler(req, res); });
  app.use('/api/curve', router);
}