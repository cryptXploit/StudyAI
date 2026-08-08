import { Request, Response } from 'express';
import { MemoryService, ConversationTurn } from '../services/memory.service';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { connection as redis } from '../queue/connection';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js'; 
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';
import logger from '../core/logger';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

interface ChatRequest {
  userId?: string; fileId?: string; fileIds?: string[]; query: string;
  tier?: 'Free' | 'Student' | 'Pro'; conversationId?: string; language?: string;
  syllabusCourseName?: string; syllabusChapters?: string[]; syllabusTopics?: string[];
}

interface CacheEntry { answer: string; chunks: string[]; timestamp: number; ttl: number; }

const AI_BUSY_MESSAGE = 'Our AI study engine is handling high demand right now. Please try your question again in a few moments.';

export async function chatHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now(); let cacheHit = false; let retrievalTime = 0; let memoryTime = 0;

  try {
    const body = req.body as ChatRequest;
    const userId = (req as any).user?.id || body.userId;
    const tier = (req as any).user?.tier || body.tier || 'Free';
    const language = body.language || 'English';
    const { query } = body;
    
    const fileIdArray = body.fileIds && body.fileIds.length > 0 ? body.fileIds : (body.fileId ? [body.fileId] : []);
    const conversationId = body.conversationId || (fileIdArray.length > 0 ? fileIdArray.join('-') : 'default-chat');
    const safeQuery = query ? query.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

    if (!userId || !safeQuery) { res.status(400).json({ error: 'Missing required fields' }); return; }

    const memoryStart = Date.now();
    const memory = await MemoryService.buildMemoryContext(userId, conversationId);
    memoryTime = Date.now() - memoryStart;

    const lastUserMsg = memory.slice().reverse().find(m => m.role === 'user');
    const isRepeatQuestion = lastUserMsg && lastUserMsg.content.trim().toLowerCase() === safeQuery.trim().toLowerCase();
    const followUpKeywords = ['next', 'continue', 'more', 'then what', 'pore ki', 'tarpor', 'baki', 'explain more'];
    const isFollowUp = followUpKeywords.some(kw => safeQuery.toLowerCase().trim() === kw || safeQuery.toLowerCase().includes(kw));

    // SYLLABUS SAFE CACHE HASHING
    const syllabusKey = `${body.syllabusCourseName || ''}-${(body.syllabusChapters || []).join(',')}-${(body.syllabusTopics || []).join(',')}`;
    const fileSalt = fileIdArray.sort().join(',');
    const cacheKey = `chat:cache:v3:${userId}:${fileSalt}:${language}:${syllabusKey}:${hashQuery(safeQuery)}`;
    
    const skipCacheRead = isFollowUp || isRepeatQuestion;
    const skipCacheWrite = isFollowUp;

    if (!skipCacheRead) {
      const cached = await getCachedResponse(cacheKey);
      if (cached) {
        cacheHit = true;
        return serveSSEResponse(res, cached.answer, { userId, fileIds: fileIdArray, query: safeQuery, tier, cached: true, cacheAge: Date.now() - cached.timestamp, latency: Date.now() - startTime });
      }
    }

    const summaryKeywords = ['summarize', 'summary', 'overview', 'what is this document about', 'full document', 'entire file', 'sumarize', 'all documents'];
    const isSummaryRequest = summaryKeywords.some(keyword => safeQuery.toLowerCase().includes(keyword));

    const retrievalStart = Date.now();
    let chunks: any[] = []; let contextChunks = ""; let needFallbackRAG = false;

    try {
      if (fileIdArray.length > 0) {
        if (isSummaryRequest) {
          // ðŸŸ¢ ARCHITECTURE FIX: Fetching pre-computed summary from 'context_packs' instead of 'files'
          const { data: contextPacks } = await supabase
            .from('context_packs')
            .select('name, description, file_id')
            .in('file_id', fileIdArray); 
          
          const validSummaries = contextPacks?.filter(cp => cp.description && cp.description.trim().length > 20);
          
          if (validSummaries && validSummaries.length > 0) {
            contextChunks = validSummaries.map(cp => `--- Document Summary: ${cp.name} ---\n${cp.description}`).join('\n\n==========\n\n');
            if (validSummaries.length < fileIdArray.length) needFallbackRAG = true;
          } else { needFallbackRAG = true; }
        } else { needFallbackRAG = true; }

        if (needFallbackRAG) {
          const searchLimit = isSummaryRequest ? 3 : 2; 
          const retrievalPromises = fileIdArray.map(fId => RetrievalService.hybridSearch({ userId, fileId: fId, query: safeQuery, limit: searchLimit, vectorWeight: 0.6, keywordWeight: 0.4 }));
          const results = await Promise.all(retrievalPromises);
          chunks = results.flat().slice(0, isSummaryRequest ? 6 : 4); 
          const ragContext = chunks.map((c: any) => {
            const pageTag = c.page_number ? `[Page ${c.page_number}] ` : '';
            return `${pageTag}${c.text_content || c.content || c.text || ''}`;
          }).join('\n\n');
          contextChunks = contextChunks ? `${contextChunks}\n\n--- Additional Extracted Context ---\n${ragContext}` : ragContext;
          const maxChars = isSummaryRequest ? 300000 : 150000;
          if (contextChunks.length > maxChars) contextChunks = contextChunks.substring(0, maxChars) + '\n... [Context truncated to fit AI memory]';
        }
      }
      retrievalTime = Date.now() - retrievalStart;
    } catch (err) { chunks = []; }

    // ðŸŸ¢ ELITE SYSTEM PROMPT WITH SYLLABUS CONSTRAINT
    let syllabusConstraint = "";
    if (body.syllabusCourseName) {
      syllabusConstraint = `\n\nðŸŽ¯ STRICT SYLLABUS CONSTRAINT:\nThe user is exclusively studying the course/subject: "${body.syllabusCourseName}".\n`;
      if (body.syllabusChapters && body.syllabusChapters.length > 0) {
        syllabusConstraint += `They are strictly reviewing these specific chapters/modules: ${body.syllabusChapters.join(', ')}.\n`;
      }
      if (body.syllabusTopics && body.syllabusTopics.length > 0) {
        syllabusConstraint += `Specifically, target your explanations heavily around these topics: ${body.syllabusTopics.join(', ')}.\n`;
      }
      syllabusConstraint += `\nYou MUST limit your scope, examples, and complexity to be strictly relevant ONLY to these boundaries. Do NOT introduce advanced concepts or details outside this scope to avoid confusing the student.`;
    }

    let systemPrompt = buildSystemPrompt(tier, userId, language) + syllabusConstraint;
    
    if (isRepeatQuestion) systemPrompt += `\n\n[URGENT INSTRUCTION: The user asked this exact question again. They might be unsatisfied with the previous answer. Please explain it in a completely different, more detailed, and simpler way.]`;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }
    systemPrompt += strictLangInstruction;

    const userPrompt = buildUserPrompt(safeQuery, contextChunks, tier, isSummaryRequest);
    // Limit history memory to last 2 turns to prevent Token limit explosion
    const safeMemory = memory.slice(-2).map(m => ({ ...m, content: m.content.length > 300 ? m.content.substring(0, 300) + '...' : m.content }));

    const messages = [{ role: 'system' as const, content: systemPrompt }, ...safeMemory, { role: 'user' as const, content: userPrompt }];

    // Token Cost Check (Deduct later on success)
    if (tier.toLowerCase() !== 'pro' && !cacheHit) {
      const chatCost = TOKEN_COSTS.AI_CHAT;
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr) {
        console.error('[Chat] Token Check DB Error:', profileErr);
        res.status(500).json({ error: 'Database error while checking tokens' });
        return;
      }
      
      if (!userProfile || userProfile.tokens < chatCost) {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: chatCost });
        return;
      }
    }

    const router = new ModelRouter();
    const streamResponse = router.generateStream(messages, userId, tier);

    await streamSSEResponse(res, streamResponse, {
      userId, fileIds: fileIdArray, conversationId, query: safeQuery, tier, cached: false, chunksCount: chunks.length, rawChunks: chunks, retrievalTime, memoryTime, totalTime: Date.now() - startTime, cacheKey, skipCacheWrite, cost: TOKEN_COSTS.AI_CHAT
    });

  } catch (error) { handleStreamError(res, error); }
}

async function streamSSEResponse(res: Response, streamResponse: AsyncIterable<string>, metadata: Record<string, any>): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
  const flush = () => { if (typeof (res as any).flush === 'function') (res as any).flush(); };

  res.write(`event: metadata\ndata: ${JSON.stringify(metadata)}\n\n`);

  let fullResponse = ''; let eventId = 0; let receivedFirstChunk = false; let streamCompletedCleanly = false; let timeoutHandle: NodeJS.Timeout;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => { timeoutHandle = setTimeout(() => reject(new Error("AI Model Response Timeout")), 15000); }); timeoutPromise.catch(() => {}); 
    const iterator = streamResponse[Symbol.asyncIterator]();

    while (true) {
      const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), timeoutPromise]));
      if (result.done) { streamCompletedCleanly = true; break; }
      const chunk = result.value;
      if (chunk) {
        if (!receivedFirstChunk) { receivedFirstChunk = true; clearTimeout(timeoutHandle!); }
        if (chunk.startsWith('Error:') || chunk.startsWith('ðŸš¨')) throw new Error(chunk); 
        fullResponse += chunk;
        res.write(`event: message\nid: ${eventId++}\ndata: ${JSON.stringify({ content: chunk })}\n\n`); flush(); 
      }
      if (res.writableEnded) break;
    }
    clearTimeout(timeoutHandle!);

    res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete', length: fullResponse.length, timestamp: Date.now() })}\n\n`); flush();

    if (streamCompletedCleanly) {
      // ðŸŸ¢ DEDUCT TOKENS ONLY ON SUCCESS
      if (metadata.cost && metadata.tier?.toLowerCase() !== 'pro') {
        await applyCreditMutation({
          userId: metadata.userId,
          amount: -metadata.cost,
          reason: 'AI Chat Question',
          idempotencyKey: `chat:${metadata.userId}:${metadata.conversationId}:${Date.now()}`,
        });
      }

      const cacheKey = metadata.cacheKey;
      if (cacheKey && fullResponse && !metadata.skipCacheWrite && fullResponse.length > 20) {
        const ttl = getCacheTTL(metadata.tier);
        await setCachedResponse(metadata.cacheKey, fullResponse, metadata.rawChunks || [], ttl).catch(err => {});
      }

      if (metadata.userId && metadata.query && metadata.conversationId && fullResponse) {
        const userTurn: ConversationTurn = { id: `turn-${Date.now()}`, role: 'user', content: metadata.query, timestamp: Date.now() };
        const assistantTurn: ConversationTurn = { id: `turn-${Date.now() + 1}`, role: 'assistant', content: fullResponse, timestamp: Date.now() + 1 };
        
        // ðŸŸ¢ PERFORMANCE FIX: Fire all DB saves in parallel (Non-blocking)
        Promise.allSettled([
          MemoryService.storeShortTermMemory(metadata.userId, metadata.conversationId, userTurn),
          MemoryService.storeShortTermMemory(metadata.userId, metadata.conversationId, assistantTurn),
          supabase.from('chat_sessions').upsert({ id: metadata.conversationId, user_id: metadata.userId }, { onConflict: 'id' }),
          supabase.from('chat_messages').insert([
            { session_id: metadata.conversationId, user_id: metadata.userId, role: 'user', content: metadata.query }, 
            { session_id: metadata.conversationId, user_id: metadata.userId, role: 'assistant', content: fullResponse }
          ])
        ]).catch(() => {}); // Catch silent errors
      }
    }
    res.end();
  } catch (err) {
    clearTimeout(timeoutHandle!);
    logger.error('chat.stream.failed', {
      error: err instanceof Error ? err.message : String(err),
      userId: metadata.userId,
      fileIds: metadata.fileIds,
    });
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: AI_BUSY_MESSAGE, code: 'AI_TEMPORARILY_BUSY', status: 'failed', length: fullResponse.length })}\n\n`);
      flush();
    }
    res.end();
  }
}

async function serveSSEResponse(res: Response, cachedAnswer: string, metadata: Record<string, any>): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
  const flush = () => { if (typeof (res as any).flush === 'function') (res as any).flush(); };

  res.write(`event: metadata\ndata: ${JSON.stringify(metadata)}\n\n`); flush();
  const chunkSize = 50;
  for (let i = 0; i < cachedAnswer.length; i += chunkSize) {
    const chunk = cachedAnswer.substring(i, i + chunkSize);
    res.write(`event: message\nid: ${Math.floor(i / chunkSize)}\ndata: ${JSON.stringify({ content: chunk })}\n\n`); flush();
  }
  res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete', fromCache: true, length: cachedAnswer.length, timestamp: Date.now() })}\n\n`); flush(); res.end();
}

function handleStreamError(res: Response, error: any): void {
  logger.error('chat.request.failed', { error: error instanceof Error ? error.message : String(error) });
  if (!res.headersSent) { res.setHeader('Content-Type', 'text-event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders(); }
  res.write(`data: ${JSON.stringify({ error: AI_BUSY_MESSAGE, code: 'AI_TEMPORARILY_BUSY', status: 'failed', timestamp: Date.now() })}\n\n`);
  if (typeof (res as any).flush === 'function') (res as any).flush(); res.end();
}

function buildSystemPrompt(tier: string, userId: string, language: string): string {
  const basePrompt = `You are "Prepia", a world-class, professional, and friendly AI Tutor.
Your goal is to help students learn effectively and answer their questions with 100% accuracy.

CRITICAL FORMATTING RULES:
1. SPACING IS MANDATORY: You MUST put a space after every punctuation mark.
2. PARAGRAPHS: You MUST hit 'Enter' twice to create empty lines between paragraphs.
3. MATH: Use proper LaTeX ($ for inline, $$ for block).
4. CITATIONS: When using information from the provided context, you MUST cite the source page using the exact format: [Page X] (where X is the page number provided in the context tag). Put the citation at the end of the sentence.
5. MANDATORY LANGUAGE: You MUST generate your ENTIRE response fluently and accurately in ${language.toUpperCase()}.`;
  
  if (tier === 'Free') return basePrompt + `\n\nTier: Free\n- Keep explanations concise.`;
  if (tier === 'Student') return basePrompt + `\n\nTier: Student\n- Provide highly detailed, formatted explanations with examples.`;
  return basePrompt + `\n\nTier: Pro\n- Provide comprehensive, beautifully structured academic answers.`;
}

function buildUserPrompt(query: string, context: string, tier: string, isSummaryRequest: boolean = false): string {
  let prompt = '';
  if (context && context.trim()) prompt += `Based on the following context from the document:\n\n${context}\n\n`;
  if (isSummaryRequest) prompt += `Task: Please provide a well-structured, detailed summary of the context provided above. (Ignore broken queries: "${query}").\n\nWhen summarizing, focus on the main ideas.`;
  else prompt += `Task: Please answer the following question accurately:\nQuestion: ${query}`;

  if (tier === 'Pro') prompt += `\n\nProvide a comprehensive answer that includes:\n- Clear explanation\n- Relevant examples\n- Connections to related concepts`;
  else if (tier === 'Student') prompt += `\n\nProvide a detailed answer with at least one example.`;
  return prompt;
}

function getCacheTTL(tier: string): number { const ttls: Record<string, number> = { Free: 3600, Student: 7200, Pro: 86400 }; return ttls[tier] || 3600; }
function hashQuery(query: string): string { const normalized = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'); return Math.abs(normalized.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)).toString(); }

async function getCachedResponse(key: string): Promise<CacheEntry | null> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached); let pool: CacheEntry[] = [];
      if (Array.isArray(parsed)) pool = parsed; else if (parsed && parsed.answer) pool = [parsed];
      if (pool.length > 0) {
        const validEntries = pool.filter(entry => Date.now() - entry.timestamp < entry.ttl * 1000);
        if (validEntries.length > 0) return validEntries[Math.floor(Math.random() * validEntries.length)];
      }
    }
  } catch (err) {} return null;
}

async function setCachedResponse(key: string, answer: string, chunks: any[], ttl: number): Promise<void> {
  try {
    const newEntry: CacheEntry = { answer, chunks: chunks.map((c) => (typeof c === 'string' ? c : c.text_content || c.content || c.text || '')), timestamp: Date.now(), ttl };
    const existing = await redis.get(key); let pool: CacheEntry[] = [];
    if (existing) { try { const parsed = JSON.parse(existing); if (Array.isArray(parsed)) pool = parsed; else if (parsed && parsed.answer) pool = [parsed]; } catch (e) {} }
    pool.push(newEntry); if (pool.length > 10) pool.shift(); 
    await redis.setex(key, ttl, JSON.stringify(pool));
  } catch (err) {}
}

export function registerChatRoutes(app: any): void {
  app.post('/api/chat', requireAuth, async (req: Request, res: Response) => { await chatHandler(req, res); });
}
