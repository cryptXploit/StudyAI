/**
 * Flashcard Controller - Spaced Repetition Deck Generator
 * Architecture: Hybrid Retrieval -> ModelRouter -> JSON Stream -> Redis Cache -> Multi-Language
 */

import { Request, Response, Router } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { connection as redis } from '../queue/connection';
import { requireAuth } from '../middlewares/auth.middleware';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { createClient } from '@supabase/supabase-js';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 🟢 FIX: Added 'language' to the cache hash to prevent translation collisions
function hashFlashcardRequest(topic: string, fileIds: string[], language: string): string {
  const rawStr = `flashcard-${topic.toLowerCase().trim()}-${fileIds.sort().join(',')}-${language.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < rawStr.length; i++) {
    hash = ((hash << 5) - hash) + rawStr.charCodeAt(i);
    hash |= 0; 
  }
  return `flashcards:cache:${Math.abs(hash)}`;
}

export async function flashcardHandler(req: Request, res: Response): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const startTime = Date.now();

  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, fileIds, language = 'English' } = req.body; 

    if (!userId) {
      res.status(400).json({ error: 'Missing user ID' });
      return;
    }

    const fileIdArray = fileIds && fileIds.length > 0 ? fileIds : [];
    
    // 🟢 API TOKEN PROTECTOR: Strict Input Limit to block Prompt Injection
    const safeTopic = topic ? topic.substring(0, 300).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

    // ========================================================================
    // Step 1: Redis Caching ($0 API Cost for repeated decks)
    // ========================================================================
    const cacheKey = hashFlashcardRequest(safeTopic, fileIdArray, language);
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        
        const entry = JSON.parse(cachedData);
        res.write(`event: metadata\ndata: ${JSON.stringify({ cached: true, latency: Date.now() - startTime })}\n\n`);
        
        const chunkSize = 50;
        for (let i = 0; i < entry.cards.length; i += chunkSize) {
          res.write(`event: message\ndata: ${JSON.stringify({ content: entry.cards.substring(i, i + chunkSize) })}\n\n`);
          if (typeof (res as any).flush === 'function') (res as any).flush();
        }

        res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete' })}\n\n`);
        res.end();
        return;
      }
    } catch (err) {}

    // ========================================================================
    // Step 2: High-Speed Retrieval (🟢 RAM & DB PROTECTOR: Sequential Loop)
    // ========================================================================
    let contextChunks = "";
    if (fileIdArray.length > 0) {
      const limitPerFile = Math.max(2, Math.floor(6 / fileIdArray.length));
      
      // 🟢 Replaced Promise.all with sequential DB calls to prevent connection limit exhaustion
      for (const fId of fileIdArray) {
        const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: safeTopic || 'summary core concepts', limit: limitPerFile, vectorWeight: 0.6, keywordWeight: 0.4 });
        contextChunks += results.map((c: any) => `--- Excerpt ---\n${c.text_content || c.content || c.text || ''}`).join('\n\n') + '\n\n';
      }
      
      if (contextChunks.length > 8000) contextChunks = contextChunks.substring(0, 8000);
    }

    // ========================================================================
    // Step 2.5: Token Verification (Since we are generating fresh)
    // ========================================================================
    const cost = TOKEN_COSTS.FLASHCARDS;
    if (tier.toLowerCase() !== 'pro') {
      try {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Flashcard Generator', idempotencyKey: `flashcards:${userId}:${Date.now()}` });
      } catch (error: any) {
        res.setHeader('Content-Type', 'text/event-stream');
        const insufficient = String(error?.message || '').includes('INSUFFICIENT_TOKENS');
        res.write(`event: error\ndata: ${JSON.stringify({ error: insufficient ? 'INSUFFICIENT_TOKENS' : 'Failed to process transaction', required: cost })}\n\n`);
        res.end();
        return;
      }
    }

    // ========================================================================
    // Step 3: Strict JSON Array Prompt (🟢 UPDATED FOR LANGUAGE SAFETY)
    // ========================================================================
    const systemPrompt = `You are an expert Educational Flashcard Generator.
Your job is to extract the 10 most critical concepts from the text and create high-yield "Anki-style" flashcards.

CRITICAL RULES:
1. Output ONLY a raw, valid JSON object. No markdown blocks (\`\`\`json). No conversational text.
2. The JSON MUST exactly follow this structure. The keys ("cards", "q", "a", "glossary") MUST remain in English: 
{
  "cards": [
    {"q": "Question or Term here", "a": "Short, memorable answer with **bold** key terms"}
  ],
  "glossary": {
    "Bold Term 1": "1-sentence definition",
    "Bold Term 2": "1-sentence definition"
  }
}
3. Keep answers concise (max 2 sentences). Use **bold** for difficult terms in the answer ("a" field) and define them in the glossary using the exact same translated string as the key.
4. If equations are needed, use LaTeX without the $ symbol inside the string.
5. MANDATORY LANGUAGE: You MUST generate the actual content (questions, answers, definitions, and bold terms) fluently in ${language.toUpperCase()}. NEVER translate the JSON structure keys.`;

    const userPrompt = `TOPIC: "${safeTopic || 'General Overview'}"\n\n${contextChunks ? `DOCUMENT CONTEXT:\n${contextChunks}` : 'Use general knowledge to generate 10 flashcards.'}`;

    // ========================================================================
    // Step 4: ModelRouter Streaming
    // ========================================================================
    const router = new ModelRouter();
    const streamResponse = router.generateStream(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], 
      userId, tier, { temperature: 0.3 }
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`event: metadata\ndata: ${JSON.stringify({ cached: false })}\n\n`);

    let fullJSON = "";
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("Timeout")), 25000);
    });
    timeoutPromise.catch(() => {}); 
    
    const iterator = streamResponse[Symbol.asyncIterator]();
    let receivedFirstChunk = false;

    while (true) {
      const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), timeoutPromise]));
      if (result.done) break;
      if (result.value) {
        if (!receivedFirstChunk) { receivedFirstChunk = true; clearTimeout(timeoutHandle!); }
        fullJSON += result.value;
        res.write(`event: message\ndata: ${JSON.stringify({ content: result.value })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
    }
    
    if (timeoutHandle) clearTimeout(timeoutHandle);
    
    // Auto Clean AI output & Cache
    if (fullJSON.length > 20) {
      const cleanJSON = fullJSON.replace(/```json/gi, '').replace(/```/g, '').replace(/,\s*([\]}])/g, '$1').trim();
      await redis.setex(cacheKey, 86400, JSON.stringify({ cards: cleanJSON, timestamp: Date.now() })).catch(() => {});
    }

    res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete' })}\n\n`);
    res.end();

  } catch (error: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

export function registerFlashcardRoutes(app: any): void {
  const router = Router();
  router.post('/', requireAuth, async (req: Request, res: Response) => { await flashcardHandler(req, res); });
  app.use('/api/flashcards', router);
}
