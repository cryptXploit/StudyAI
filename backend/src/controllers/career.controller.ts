/**
 * Career Hacker Controller - Cold Email & CV Tailor
 * Architecture: RetrievalService -> ModelRouter -> Strict JSON -> Redis Cache -> DB History
 */

import { Request, Response, Router } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { connection as redis } from '../queue/connection';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireTokens } from '../middlewares/tokenGuard.middleware'; // 👈 Import it
import { requireProTier } from '../middlewares/proGuard.middleware'; // 👈 Import it (if needed)
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 🟢 FIX: Added language to the hash to prevent cross-language cache collisions
function hashCareerQuery(cvText: string, targetDesc: string, fileIds: string[], language: string): string {
  const rawStr = `career_${cvText.substring(0, 100)}_${targetDesc.substring(0, 100)}_${fileIds.sort().join(',')}_${language}`;
  return crypto.createHash('md5').update(rawStr.toLowerCase().trim()).digest('hex');
}

export async function careerTailorHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { cvText, targetDesc, fileIds, language = 'English' } = req.body;

    if (!userId || !targetDesc) {
      res.status(400).json({ error: 'Missing required fields: target description.' });
      return;
    }

    // 🟢 API TOKEN PROTECTOR: Strict Input Limit to block Prompt Injection
    const safeTargetDesc = targetDesc.substring(0, 1500).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeCvText = cvText ? cvText.substring(0, 6000) : ""; // Max 6000 chars for CV

    const fileIdArray = fileIds && fileIds.length > 0 ? fileIds : [];

    // 1. Check Redis Cache
    const cacheKey = hashCareerQuery(safeCvText, safeTargetDesc, fileIdArray, language);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json({ success: true, data: JSON.parse(cached), cached: true });
        return;
      }
    } catch (e) {}

    // 2. Fetch RAG Context (🟢 RAM & DB PROTECTOR: Sequential Loop instead of Promise.all)
    let contextChunks = "";
    if (fileIdArray.length > 0) {
      const limitPerFile = Math.max(2, Math.floor(6 / fileIdArray.length));
      
      for (const fId of fileIdArray) {
        const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: "skills experience projects education", limit: limitPerFile, vectorWeight: 0.7, keywordWeight: 0.3 });
        contextChunks += results.map((c: any) => c.text_content || c.content || c.text || '').join('\n\n') + '\n\n';
      }
      
      // 🟢 API TOKEN SAVER: Hard limit on extracted context
      if (contextChunks.length > 8000) contextChunks = contextChunks.substring(0, 8000);
    }

    const finalCvContext = `
      ${safeCvText ? `USER PROVIDED CV TEXT:\n${safeCvText}\n\n` : ''}
      ${contextChunks ? `EXTRACTED CV/PORTFOLIO CONTEXT:\n${contextChunks}\n\n` : ''}
    `;

    // 3. System Prompt for Elite Career Coach
    const systemPrompt = `You are an Elite Career Coach, Thesis Advisor, and Cold Email Strategist.
Your goal is to help a university student secure an internship, job, or thesis supervisor position.

CRITICAL RULES:
1. Output MUST be ONLY valid, parseable JSON. No markdown blocks outside JSON, no conversational text.
2. The cold email must be highly professional, persuasive, and directly map the student's skills to the target description.
3. Keep the email concise (max 3-4 short paragraphs).
4. Provide exactly 2 to 3 critical, actionable suggestions on how the student should tweak their CV/Resume to increase their chances.

JSON SCHEMA TO FOLLOW:
{
  "email_draft": "Subject: [Compelling Subject Line]\n\nDear [Name/Professor/Hiring Manager],\n\n[Email Body]\n\nBest regards,\n[Student Name]",
  "cv_suggestions": [
    "Suggestion 1 in ${language}",
    "Suggestion 2 in ${language}",
    "Suggestion 3 in ${language}"
  ]
}

LANGUAGE REQUIREMENT: Generate the 'email_draft' in fluent, professional English (as cold emails are standardly in English). Generate the 'cv_suggestions' in fluent ${language.toUpperCase()}.`;

    const userPrompt = `TARGET COMPANY/PROFESSOR DESCRIPTION:\n"${safeTargetDesc}"\n\nSTUDENT BACKGROUND/CV:\n"${finalCvContext || 'No specific background provided. Provide general best practices based on the target.'}"`;

    // 4. AI Generation
    const router = new ModelRouter();
    const aiResponse = await router.generate(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      userId, tier, { temperature: 0.3 }
    );

    try {
      // 5. Parse & Clean JSON Safely
      let cleanJson = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        cleanJson = cleanJson.replace(/[\u0000-\u001F]+/g, " "); // Strip hidden control characters
        
        const parsedData = JSON.parse(cleanJson);

        // 6. Cache & Save History (🟢 Non-blocking Save for 0ms DB Latency)
        redis.setex(cacheKey, 86400 * 7, JSON.stringify(parsedData)).catch(() => {});
        
        supabaseAdmin.from('career_history').insert([{
          user_id: userId,
          target_desc: safeTargetDesc,
          email_draft: parsedData.email_draft,
          cv_suggestions: parsedData.cv_suggestions
        }]).select('id').single().then(({ error }) => {
          if (error) console.error("Career Hacker DB Save Error:", error.message);
        });

        res.json({ success: true, data: parsedData, cached: false });
      } else {
        throw new Error("No JSON format detected");
      }
    } catch (parseError) {
      console.error('[CareerHacker] Parse Error:', aiResponse);
      res.status(500).json({ error: 'AI failed to generate a valid strategy structure. Please try again.' });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCareerHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { data, error } = await supabaseAdmin.from('career_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, history: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCareerHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('career_history').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerCareerRoutes(app: any): void {
  const router = Router();
  router.post('/tailor', requireAuth, requireTokens('CAREER_HACKER'), async (req: Request, res: Response) => { await careerTailorHandler(req, res); });
  router.get('/history', requireAuth, async (req: Request, res: Response) => { await getCareerHistoryHandler(req, res); });
  router.delete('/history/:id', requireAuth, async (req: Request, res: Response) => { await deleteCareerHistoryHandler(req, res); });
  app.use('/api/career', router);
}