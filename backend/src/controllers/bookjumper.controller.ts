/**
 * Book Jumper Controller - Heatmap Generator
 * Architecture: RetrievalService (Vector Search) -> Extract Page Numbers -> Zero LLM Cost
 */

import { Request, Response, Router } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to robustly extract a valid page number from various metadata formats
const extractPageNum = (val: any): number | null => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const match = val.match(/\d+/); // Extracts digits even if the string says "Page 14"
    if (match) return parseInt(match[0], 10);
  }
  return null;
};

export async function generateHeatmapHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { fileId, query } = req.body;

    if (!userId || !fileId || !query) {
      res.status(400).json({ success: false, error: 'Missing required fields: fileId or query' });
      return;
    }

    // 0. 🟢 TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const tier = (req as any).user?.tier || 'Free';
    const cost = TOKEN_COSTS.BOOK_JUMPER;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabaseAdmin.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    // 1. 🚀 ZERO-COST VECTOR SEARCH (No LLM called)
    const results: any = await RetrievalService.hybridSearch({
      userId,
      fileId,
      query,
      limit: 50, 
      vectorWeight: 0.6,
      keywordWeight: 0.4
    });

    // Ensure we are iterating over an array safely (Handles different Vector DB response formats)
    const searchItems = Array.isArray(results) ? results : (results?.data || results?.results || results?.documents || []);

    if (!searchItems || searchItems.length === 0) {
        res.json({ success: true, hitPages: [], historyId: null });
        return;
    }

    // 2. Extract Page Numbers, Snippets, and Tags
    let hitPages: number[] = [];
    let snippets: { [key: number]: string } = {};
    let allText = "";
    
    searchItems.forEach((chunk: any) => {
      let meta = chunk.metadata || chunk.meta || chunk;
      
      // Handle cases where metadata is stored as a JSON string
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch(e) {}
      }

      // Check all common key variations
      const rawPage = meta?.pageNumber 
        || meta?.page_number 
        || meta?.page 
        || meta?.loc?.pageNumber 
        || meta?.loc?.page_number
        || chunk?.pageNumber
        || chunk?.page_number
        || chunk?.page;

      const pageNum = extractPageNum(rawPage);
      
      const content = chunk.pageContent || chunk.content || chunk.text || meta?.text || "";
      allText += " " + content;

      if (pageNum !== null) {
        hitPages.push(pageNum);
        // Only keep the first (highest scored) snippet per page
        if (!snippets[pageNum] && content) {
          snippets[pageNum] = content.substring(0, 300) + (content.length > 300 ? "..." : "");
        }
      }
    });

    // Remove duplicates & Sort
    hitPages = [...new Set(hitPages)].sort((a, b) => a - b);

    // Fallback: If metadata doesn't have page numbers, simulate heat based on chunk index
    if (hitPages.length === 0 && searchItems.length > 0) {
      searchItems.forEach((r: any, idx: number) => {
        let meta = r.metadata || r.meta || r;
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch(e) {}
        }
        const cIndex = meta?.chunk_index || meta?.chunkIndex;
        const val = extractPageNum(cIndex) ?? (idx + 1);
        hitPages.push(val);
        const content = r.pageContent || r.content || r.text || meta?.text || "";
        if (!snippets[val] && content) {
          snippets[val] = content.substring(0, 300) + "...";
        }
      });
      hitPages = [...new Set(hitPages)].sort((a, b) => a - b);
    }

    // Extract Tags (very basic frequency count of 5+ char words, ignoring basic stopwords)
    const words = allText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const stopwords = new Set(["their", "there", "about", "which", "would", "these", "could", "other", "where"]);
    const wordCounts: { [key: string]: number } = {};
    for (const w of words) {
      if (w.length > 5 && !stopwords.has(w)) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }
    const relatedTags = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(entry => entry[0]);

    // 3. Save to History (Wrapped in try-catch to prevent main function failure)
    let historyId = null;
    try {
      const { data: historyRecord, error: historyError } = await supabaseAdmin.from('book_jumper_history').insert([{
        user_id: userId,
        file_id: fileId,
        query: query,
        hit_pages: hitPages
      }]).select().single();

      if (historyError) {
        console.warn('[BookJumper History] Failed to save history:', historyError.message);
      } else {
        historyId = historyRecord?.id;
      }
    } catch (histErr) {
      console.warn('[BookJumper History] Exception while saving history:', histErr);
    }

    res.json({ success: true, hitPages, snippets, relatedTags, historyId });

  } catch (error: any) {
    console.error('[BookJumper Core] Heatmap Generation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate heatmap due to an internal server error.' });
  }
}

export async function getJumperHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const cost = TOKEN_COSTS.BOOK_JUMPER;
    
    if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }

    // 1. Fetch History without the PostgREST relation join to avoid Foreign Key errors
    const { data: historyData, error: historyError } = await supabaseAdmin
        .from('book_jumper_history')
        .select('*') 
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (historyError) {
        console.error('[BookJumper History] DB Fetch Error:', historyError);
        throw historyError;
    }

    let finalHistory = historyData || [];

    // 2. Safe Manual Join for File Names (Fixes the 500 error)
    if (finalHistory.length > 0) {
      const fileIds = [...new Set(finalHistory.map(h => h.file_id))];
      
      try {
        const { data: filesData } = await supabaseAdmin
            .from('files')
            .select('id, name')
            .in('id', fileIds);

        if (filesData) {
            const fileMap = filesData.reduce((acc: any, f: any) => {
              acc[f.id] = f.name;
              return acc;
            }, {});

            // Attach the file name exactly as frontend expects it (h.files.name)
            finalHistory = finalHistory.map(h => ({
              ...h,
              files: { name: fileMap[h.file_id] || 'Unknown Book' }
            }));
        }
      } catch (fileFetchErr) {
          console.warn('[BookJumper History] Could not map file names:', fileFetchErr);
      }
    }

      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Smart Book Indexer Search', idempotencyKey: `book-jumper-search:${userId}:${Date.now()}` });
      }
      
      res.json({ success: true, history: finalHistory });

  } catch (error: any) {
    console.error('[BookJumper Core] History Fetch Exception:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error while fetching history.' });
  }
}

export async function explainSnippetHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { snippet, query, language } = req.body;
    if (!userId || !snippet) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const tier = (req as any).user?.tier || 'Free';
    const cost = 2; // Hardcoded explain cost to bypass missing TOKEN_COSTS type error
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile } = await supabaseAdmin.from('profiles').select('tokens').eq('id', userId).single();
      if (!userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      await applyCreditMutation({ userId, amount: -cost, reason: 'Explain Snippet AI', idempotencyKey: `book-jumper-explain:${userId}:${Date.now()}` });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let prompt = `You are a helpful study assistant. Explain the following snippet of a book simply and concisely in 2-3 sentences. Context query: "${query || 'General'}". Snippet: "${snippet}"`;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }
    prompt += strictLangInstruction;

    const result = await model.generateContent(prompt);
    const explanation = result.response.text();

    res.json({ success: true, explanation });
  } catch (error: any) {
    console.error('[BookJumper] Explain Snippet Error:', error);
    res.status(500).json({ success: false, error: 'Failed to explain snippet' });
  }
}

export async function getSharedTimebombHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single();
    if (profile?.tier?.toLowerCase() !== 'pro') {
      res.status(403).json({ error: 'PRO_REQUIRED' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('shared_timebombs')
      .select('id, file_id, query, hit_pages, expires_at, signed_url, referrer_name')
      .eq('id', id)
      .gt('expires_at', new Date().toISOString())
      .single();
    if (error || !data) {
      res.status(404).json({ error: 'LINK_EXPIRED_OR_UNAVAILABLE' });
      return;
    }
    res.json({ data });
  } catch {
    res.status(500).json({ error: 'Failed to load shared document' });
  }
}

export function registerBookJumperRoutes(app: any): void {
  const router = Router();
  router.post('/heatmap', requireAuth, async (req: Request, res: Response) => { await generateHeatmapHandler(req, res); });
  router.post('/explain', requireAuth, async (req: Request, res: Response) => { await explainSnippetHandler(req, res); });
  router.get('/history', requireAuth, async (req: Request, res: Response) => { await getJumperHistoryHandler(req, res); });
  router.get('/timebomb/:id', requireAuth, async (req: Request, res: Response) => { await getSharedTimebombHandler(req, res); });
  app.use('/api/bookjumper', router);
}
