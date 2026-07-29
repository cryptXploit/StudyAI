import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { modelRouter as aiServiceRouter } from '../services/modelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

// Multer config for receiving images directly in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for multiple images
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function purifyNotesHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const language = req.body.language || 'English';
    const files = req.files as Express.Multer.File[];

    if (!userId || !files || files.length === 0) {
      res.status(400).json({ error: 'Missing images for processing' });
      return;
    }

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.NOTES_PURIFIER;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    let rawText = "";
    try {
      // 🟢 MAGICAL FIX: Changed Promise.all to Sequential 'for...of' loop
      for (const file of files) {
        const extractedChunk = await aiServiceRouter.extractDocument(file.buffer, file.mimetype);
        rawText += extractedChunk + '\n\n';
        file.buffer = Buffer.alloc(0); 
      }
    } catch (ocrError) {
      files.forEach(f => f.buffer = Buffer.alloc(0));
      throw new Error("Failed to extract text from images. Ensure images are clear.");
    }

    if (!rawText.trim()) {
      throw new Error("Could not detect any readable text in the images.");
    }

    // 🟢 2. Send cheap text-tokens to AI for formatting and purifying
    const systemPrompt = `You are an Elite Academic Transcriber and Note Organizer.
I will provide you with raw, messy text extracted from handwritten notes via OCR. It contains typos, broken lines, and misspellings.
Your task is to PURIFY it into a beautifully formatted, highly readable study document.

RULES:
1. Fix all spelling and grammar mistakes caused by bad handwriting/OCR.
2. Organize the content using clear Headings (##), Bullet points, and Markdown Tables if data looks tabular.
3. Highlight key terms in **bold**.
4. Generate a short, relevant "title" for this document on the very first line starting with "TITLE: ".
5. Output fluently in ${language.toUpperCase()}.`;

    const userPrompt = `RAW OCR TEXT TO PURIFY:\n\n${rawText}`;

    const router = new ModelRouter();
    const responseText = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], 
      userId, tier, { temperature: 0.3 }
    );

    // Parse Title and Content
    let title = "Purified Class Notes";
    let finalContent = responseText;
    const titleMatch = responseText.match(/^TITLE:\s*(.+)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      finalContent = responseText.replace(/^TITLE:\s*(.+)/i, '').trim();
    }

    // 🟢 3. Save to Supabase (Zero-Cost Retrieval Later)
    let savedId = null;
    try {
      const { data: savedRow } = await supabase.from('purified_notes').insert([{
        user_id: userId,
        title: title,
        purified_text: finalContent
      }]).select().single();
      if (savedRow) savedId = savedRow.id;
    } catch (dbEx) {}

    // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
    if (tier.toLowerCase() !== 'pro') {
      await applyCreditMutation({ userId, amount: -cost, reason: 'Notes Purifier', idempotencyKey: `notes-purifier:${userId}:${savedId || Date.now()}`, tier });
    }
    
    res.json({ valid: true, title, content: finalContent, savedId });

  } catch (error: any) {
    // 🟢 গ্লোবাল ফলব্যাকেও যেন RAM রিলিজ হয়ে যায়
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(f => f.buffer = Buffer.alloc(0));
    }
    res.status(500).json({ error: error.message });
  }
}

export function registerPurifierRoutes(app: any): void {
  const router = Router();
  // Using multer middleware on this specific route
  router.post('/purify', requireAuth, upload.array('images', 5), async (req: Request, res: Response) => { await purifyNotesHandler(req, res); });
  app.use('/api/purifier', router);
}
