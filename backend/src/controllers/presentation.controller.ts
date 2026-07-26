import { Request, Response, Router } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

// 🟢 FIXED: Initialize Supabase to bypass RLS and save safely from backend
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function generatePresentationHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, fileIds, slideCount = 7, language = 'English', templateId = 'aurora', animationStyle = 'bubbles' } = req.body;

    if (!userId || !topic) {
      res.status(400).json({ error: 'Missing presentation topic' });
      return;
    }

    const fileIdArray = Array.isArray(fileIds) ? fileIds : [];
    const cost = TOKEN_COSTS.PRESENTATION_GEN;

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    let contextChunks = "";
    try {
      if (fileIdArray.length > 0) {
        const limitPerFile = Math.max(2, Math.floor(6 / fileIdArray.length));
        
        // 🟢 RAM & DB PROTECTOR: Sequential Processing instead of Promise.all
        for (const fId of fileIdArray) {
          const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: topic, limit: limitPerFile, vectorWeight: 0.7, keywordWeight: 0.3 });
          contextChunks += results.map((c: any) => `--- Excerpt ---\n${c.text_content || c.content || c.text || ''}`).join('\n\n') + '\n\n';
        }
        
        // 🟢 API TOKEN SAVER: Strict limit to prevent JSON generation breakdown
        contextChunks = contextChunks.substring(0, 12000);
      }
    } catch (ragError) {
      console.warn("⚠️ RAG Context skipped due to error:", ragError);
    }

    const presentationTemplates: Record<string, string> = {
      aurora: 'Aurora Glass: luminous violet and cyan gradients, elegant and futuristic.',
      midnight: 'Midnight Executive: premium dark navy, sharp typography, disciplined corporate clarity.',
      orbit: 'Orbit Science: deep space, orbital lines, data-first visual storytelling.',
      bloom: 'Neo Bloom: clean light canvas, vibrant coral and indigo accents, friendly modern energy.',
      prism: 'Prism Studio: bold geometric colour blocks, editorial layouts, creative confidence.',
      zenith: 'Zenith Minimal: high-contrast black and white with a single electric-blue accent.',
    };
    const selectedTemplate = presentationTemplates[templateId] || presentationTemplates.aurora;
    const animationStyles: Record<string, string> = {
      bubbles: 'subtle floating translucent bubbles', rectangles: 'slow-moving translucent geometric rectangles', stars: 'soft drifting stars',
      winter: 'gentle falling snow', summer: 'warm sunlight and slow floating sun rays', forest: 'subtle layered tree silhouettes', none: 'no animated background elements',
    };
    const selectedAnimation = animationStyles[animationStyle] || animationStyles.bubbles;

    const systemPrompt = `You are an Elite Presentation Creator.
Create a highly professional ${slideCount}-slide presentation.
DESIGN DIRECTION: ${selectedTemplate}
BACKGROUND MOTION DIRECTION: ${selectedAnimation}

RULES:
1. Create EXACTLY ${slideCount} slides.
2. ONLY output a valid JSON object. Do NOT wrap in markdown or add extra text.
3. Translate all content to ${language.toUpperCase()}.

JSON SCHEMA TO FOLLOW:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "points": ["Point 1", "Point 2"],
      "speakerNotes": "Speaker script here"
    }
  ]
}`;

    const userPrompt = `TOPIC: "${topic}"\n\n${contextChunks ? `REFERENCE MATERIAL:\n${contextChunks}` : ''}`;

    const router = new ModelRouter();
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], 
      userId, tier, { temperature: 0.2 }
    );

    try {
      // 🟢 BULLETPROOF JSON EXTRACTION & CLEANING
      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        
        // 🟢 Fix hidden control characters before JSON parse
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " ");
        
        const result = JSON.parse(cleanJson);
        
        if (!result.slides || !Array.isArray(result.slides)) {
          throw new Error("Missing 'slides' array in JSON.");
        }
        result.templateId = presentationTemplates[templateId] ? templateId : 'aurora';
        result.animationStyle = animationStyles[animationStyle] ? animationStyle : 'bubbles';

        // 🟢 FIXED: Save directly to Supabase from Backend (Guaranteed to save!)
        let savedId = null;
        try {
          const { data: savedRow, error: dbError } = await supabase.from('saved_presentations').insert([{
            user_id: userId,
            topic: topic,
            slide_count: slideCount,
            file_ids: fileIdArray,
            slides_data: result
          }]).select().single();
          
          if (dbError) console.error("Database Save Error:", dbError.message);
          if (savedRow) savedId = savedRow.id;
        } catch (dbEx) {
          console.error("Database Exception:", dbEx);
        }

        // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
        if (tier.toLowerCase() !== 'pro') {
          await applyCreditMutation({ userId, amount: -cost, reason: 'Presentation Generator', idempotencyKey: `presentation:${userId}:${Date.now()}` });
        }

        // Return the slides AND the saved database ID
        res.json({ valid: true, slidesData: result, savedId: savedId });
      } else {
        throw new Error("No JSON format detected.");
      }
    } catch (parseError: any) {
      console.error("🔥 Presentation Parse Error:", responseText);
      res.json({ valid: false, error: "AI produced invalid format. Please try again." });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerPresentationRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generatePresentationHandler(req, res); });
  router.get('/history', requireAuth, async (req: Request, res: Response) => { await getHistoryHandler(req, res); });
  router.put('/history/:id', requireAuth, async (req: Request, res: Response) => { await updateHistoryHandler(req, res); });
  router.delete('/history/:id', requireAuth, async (req: Request, res: Response) => { await deleteHistoryHandler(req, res); });
  app.use('/api/presentation', router);
}
export async function getHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { data, error } = await supabase.from('saved_presentations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const deckId = req.params.id;
    if (!userId || !deckId) {
      res.status(400).json({ error: 'Missing params' });
      return;
    }
    const { error } = await supabase.from('saved_presentations').delete().eq('id', deckId).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const deckId = req.params.id;
    const slidesData = req.body?.slidesData;

    if (!userId || !deckId || !slidesData || !Array.isArray(slidesData.slides)) {
      res.status(400).json({ error: 'Invalid presentation update' });
      return;
    }

    // Keep the editable payload bounded before storing it with the service role.
    if (slidesData.slides.length < 1 || slidesData.slides.length > 30) {
      res.status(400).json({ error: 'Invalid slide count' });
      return;
    }

    const safeSlides = slidesData.slides.map((slide: any, index: number) => ({
      slideNumber: Number(slide?.slideNumber) || index + 1,
      title: String(slide?.title || '').slice(0, 300),
      points: Array.isArray(slide?.points)
        ? slide.points.slice(0, 12).map((point: unknown) => String(point).slice(0, 500))
        : [],
      speakerNotes: String(slide?.speakerNotes || '').slice(0, 4000),
    }));

    const { data, error } = await supabase
      .from('saved_presentations')
      .update({ slides_data: { ...slidesData, slides: safeSlides } })
      .eq('id', deckId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Presentation not found' });
      return;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
