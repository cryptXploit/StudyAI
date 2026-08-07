import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { ModelRouter } from '../ai/ModelRouter';
import multer from 'multer';
import * as pdfParse from 'pdf-parse';
import crypto from 'crypto';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabaseAdmin = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export async function createSyllabusHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { courseName, chapters } = req.body;
    if (!userId || !courseName || !chapters || !Array.isArray(chapters)) { res.status(400).json({ error: 'Invalid payload.' }); return; }

    const { data: course, error: courseErr } = await supabaseAdmin.from('syllabuses').insert([{ user_id: userId, course_name: courseName }]).select().single();
    if (courseErr) throw courseErr;

    const chapterInserts = chapters.map((chap: any, index: number) => ({ syllabus_id: course.id, title: chap.chapterName, topics: chap.topics || [], order_index: index, is_completed: false }));
    const { data: insertedChapters, error: chapErr } = await supabaseAdmin.from('syllabus_chapters').insert(chapterInserts).select();
    if (chapErr) throw chapErr;

    res.json({ success: true, course: { ...course, chapters: insertedChapters || [] } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

export async function updateSyllabusHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { courseName, chapters } = req.body;
    
    if (!userId || !id || !courseName || !chapters || !Array.isArray(chapters)) { 
      res.status(400).json({ error: 'Invalid payload.' }); 
      return; 
    }

    // Update Course Name
    const { error: courseErr } = await supabaseAdmin.from('syllabuses').update({ course_name: courseName }).eq('id', id).eq('user_id', userId);
    if (courseErr) throw courseErr;

    // Delete existing chapters
    const { error: delErr } = await supabaseAdmin.from('syllabus_chapters').delete().eq('syllabus_id', id);
    if (delErr) throw delErr;

    // Insert updated chapters
    const chapterInserts = chapters.map((chap: any, index: number) => ({ 
      syllabus_id: id, 
      title: chap.chapterName || chap.title, 
      topics: chap.topics || [], 
      order_index: index, 
      is_completed: false 
    }));
    
    const { data: insertedChapters, error: chapErr } = await supabaseAdmin.from('syllabus_chapters').insert(chapterInserts).select();
    if (chapErr) throw chapErr;

    res.json({ success: true, chapters: insertedChapters || [] });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

export async function getSyllabusesHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { data, error } = await supabaseAdmin.from('syllabuses').select(`*, chapters:syllabus_chapters(*)`).eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    data?.forEach(course => course.chapters?.sort((a: any, b: any) => a.order_index - b.order_index));
    res.json({ success: true, syllabuses: data });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

export async function completeChapterHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { chapterId, isCompleted } = req.body;
    const { error } = await supabaseAdmin.from('syllabus_chapters').update({ is_completed: isCompleted }).eq('id', chapterId);
    if (error) throw error;

    let earnedAura = 0;
    if (isCompleted) {
      const reasonText = `Quest Completed: Syllabus Chapter - ${chapterId}`;
      const { data: existingReward } = await supabaseAdmin.from('reward_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('reason', reasonText)
        .maybeSingle();

      if (!existingReward) {
        earnedAura = 10;
        await supabaseAdmin.rpc('increment_aura', { user_id_param: userId, amount_param: earnedAura });
        await supabaseAdmin.from('reward_transactions').insert([{ user_id: userId, amount: earnedAura, reason: reasonText }]);
      }
    }
    res.json({ success: true, earnedAura });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

export async function deleteSyllabusHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id; const { id } = req.params;
    if (!userId || !id) { res.status(400).json({ error: 'Invalid request.' }); return; }
    const { error } = await supabaseAdmin.from('syllabuses').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

// 🟢 REQUIRED FOR DASHBOARD PRO FEATURE
export async function extractPdfHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id; const userTier = (req as any).user?.tier || 'Free';
    const { fileId, language } = req.body;

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    if (userTier.toLowerCase() !== 'pro') {
      const cost = TOKEN_COSTS.SYLLABUS_GEN;
      const { data: userProfile, error: profileErr } = await supabaseAdmin.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    let rawText = ""; let fileHash = "";

    if (fileId) {
      const { data: fileRow } = await supabaseAdmin.from('files').select('*').eq('id', fileId).single();
      if (!fileRow) { res.status(444).json({ error: 'File not found' }); return; }
      fileHash = fileRow.file_hash || crypto.createHash('md5').update(fileRow.file_name || String(Date.now())).digest('hex');
      rawText = fileRow.extracted_text || fileRow.content || `Syllabus Name: ${fileRow.file_name}`;
    } else if (req.file) {
      const fileBuffer = req.file.buffer; fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      const { data: cachedData } = await supabaseAdmin.from('global_syllabus_cache').select('*').eq('pdf_hash', fileHash).maybeSingle();
      const { PDFParse } = require('pdf-parse');
      const u8 = new Uint8Array(fileBuffer);
      const parser = new PDFParse(u8);
      await parser.load();
      rawText = await parser.getText();
    } else { res.status(400).json({ error: 'Missing PDF' }); return; }

    const cleanRawText = rawText.replace(/\s+/g, ' ').substring(0, 8000);
    
    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }
    
    const systemPrompt = `You are an Elite Academic Data Extractor. Extract Syllabus. Format strictly as JSON: {"course_name": "Name", "chapters": ["Ch 1", "Ch 2"]}. Max 20 chapters.` + strictLangInstruction;
    
    const router = new ModelRouter();
    const aiResponse = await router.generate([{ role: 'system', content: systemPrompt }, { role: 'user', content: cleanRawText }], userId, userTier, { temperature: 0.1 });

    let cleanJson = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    cleanJson = cleanJson.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
    const parsedData = JSON.parse(cleanJson);

    // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
    if (userTier.toLowerCase() !== 'pro') {
      await applyCreditMutation({ userId, amount: -TOKEN_COSTS.SYLLABUS_GEN, reason: 'AI Syllabus Generation', idempotencyKey: `syllabus:${userId}:${fileHash}`, tier: userTier });
    }
    
    res.json({ success: true, courseName: parsedData.course_name, chapters: parsedData.chapters, cached: false });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

export function registerSyllabusRoutes(app: any): void {
  const router = Router();
  router.post('/create', requireAuth, async (req: Request, res: Response) => { await createSyllabusHandler(req, res); });
  router.get('/list', requireAuth, async (req: Request, res: Response) => { await getSyllabusesHandler(req, res); });
  router.post('/complete', requireAuth, async (req: Request, res: Response) => { await completeChapterHandler(req, res); });
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => { await deleteSyllabusHandler(req, res); });
  router.put('/:id', requireAuth, async (req: Request, res: Response) => { await updateSyllabusHandler(req, res); });
  router.post('/extract', requireAuth, upload.single('syllabusPdf'), async (req: Request, res: Response) => { await extractPdfHandler(req, res); });
  app.use('/api/syllabus', router);
}
