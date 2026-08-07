/**
 * Map Controller - Concept Graph & Mind Map Generator
 * Architecture: Hybrid Retrieval -> ModelRouter -> Mermaid.js Syntax -> SSE -> Multi-Language
 * 🟢 Caching Enabled: Zero API cost for repeated map requests
 */

import { Request, Response } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { connection as redis } from '../queue/connection';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 🟢 FIX: Added language to Hash for isolation
function hashMapRequest(topic: string, fileIds: string[], language: string): string {
  const rawStr = `mindmap-${topic.toLowerCase().trim()}-${fileIds.sort().join(',')}-${language.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < rawStr.length; i++) {
    hash = ((hash << 5) - hash) + rawStr.charCodeAt(i);
    hash |= 0; 
  }
  return `map:cache:${Math.abs(hash)}`;
}

export async function mapHandler(req: Request, res: Response): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const startTime = Date.now();

  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, fileIds, language = 'English' } = req.body; // 🟢 Extract language (default English)

    if (!userId || !topic) {
      res.status(400).json({ error: 'Missing required field: topic' });
      return;
    }

    const fileIdArray = fileIds && fileIds.length > 0 ? fileIds : [];
    const safeTopic = topic.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ========================================================================
    // Step 1: Redis Caching (0ms Latency for generated maps)
    // ========================================================================
    const cacheKey = hashMapRequest(safeTopic, fileIdArray, language);
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
        for (let i = 0; i < entry.code.length; i += chunkSize) {
          res.write(`event: message\ndata: ${JSON.stringify({ content: entry.code.substring(i, i + chunkSize) })}\n\n`);
          if (typeof (res as any).flush === 'function') (res as any).flush();
        }
        res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete' })}\n\n`);
        res.end();
        return;
      }
    } catch (err) {}

    // ========================================================================
    // Step 2: Multi-file RAG Retrieval
    // ========================================================================
    let contextChunks = "";
    if (fileIdArray.length > 0) {
      const limitPerFile = Math.max(2, Math.floor(6 / fileIdArray.length));
      const retrievalPromises = fileIdArray.map((fId: string) =>
        RetrievalService.hybridSearch({ userId, fileId: fId, query: safeTopic, limit: limitPerFile, vectorWeight: 0.6, keywordWeight: 0.4 })
      );
      const results = await Promise.all(retrievalPromises);
      contextChunks = results.flat().map((c: any) => `--- Excerpt ---\n${c.content || c.text || ''}`).join('\n\n');
      if (contextChunks.length > 8000) contextChunks = contextChunks.substring(0, 8000);
    }

    // ========================================================================
    // Step 3: Strict Mermaid.js Prompt Guard (🟢 UPDATED FOR LANGUAGE SAFETY)
    // ========================================================================
    const systemPrompt = `You are an expert Data Visualizer. Your task is to generate a Mermaid.js 'mindmap' for the provided topic.

CRITICAL RULES (FAILING THESE BREAKS THE APP):
1. Output ONLY valid Mermaid.js mindmap syntax. NO markdown code blocks (\`\`\`mermaid). NO explanations. Just the raw code.
2. Start exactly with the word "mindmap" on the first line.
3. Use exactly 2 spaces for indentation (no tabs).
4. NO empty lines between nodes.
5. KEEP NODE NAMES SAFE: If using non-English languages (like Bangla or Hindi), wrap the text in square brackets or quotes (e.g. \`nodeId["বাংলা টেক্সট"]\`) to prevent Mermaid rendering errors.
6. Keep the map concise (Max 3-4 levels deep) to ensure clear visualization.
7. MANDATORY LANGUAGE: You MUST generate the node names and textual content fluently in ${language.toUpperCase()}.

Example format:
mindmap
  A["Main Concept"]
    B["Sub Concept 1"]
      C["Detail 1"]
    D["Sub Concept 2"]`;

    const userPrompt = `TOPIC TO MAP: "${safeTopic}"\n\n${contextChunks ? `DOCUMENT CONTEXT TO INCLUDE:\n${contextChunks}` : ''}`;

    // ========================================================================
    // Step 4: Token Cost Check & Deduction (OWASP Safe)
    // ========================================================================
    const cost = TOKEN_COSTS.MIND_MAP_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      try {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Mind Map Generation', idempotencyKey: `mind-map:${userId}:${Date.now()}`, tier });
      } catch {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    // ========================================================================
    // Step 5: ModelRouter Streaming (Low Temp for stable syntax)
    // ========================================================================
    const router = new ModelRouter();
    const streamResponse = router.generateStream(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], 
      userId, tier, { temperature: 0.1 } 
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`event: metadata\ndata: ${JSON.stringify({ cached: false })}\n\n`);

    let fullCode = "";
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("Timeout")), 20000);
    });
    timeoutPromise.catch(() => {}); 
    
    const iterator = streamResponse[Symbol.asyncIterator]();
    let receivedFirstChunk = false;

    while (true) {
      const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), timeoutPromise]));
      if (result.done) break;
      if (result.value) {
        if (!receivedFirstChunk) { receivedFirstChunk = true; clearTimeout(timeoutHandle!); }
        fullCode += result.value;
        res.write(`event: message\ndata: ${JSON.stringify({ content: result.value })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
    }
    
    if (timeoutHandle) clearTimeout(timeoutHandle);
    
    // Auto Clean AI markdown output if it hallucinated and Cache it
    if (fullCode.length > 20) {
      const cleanCode = fullCode.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
      await redis.setex(cacheKey, 86400, JSON.stringify({ code: cleanCode, timestamp: Date.now() })).catch(() => {});
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

export async function mapChatHandler(req: Request, res: Response): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, mapCode, question, language = 'English' } = req.body;

    if (!userId || !topic || !question) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }

    let systemPrompt = `You are a Contextual AI Teacher. The user is currently looking at a Mind Map generated by you.
Topic of the Map: "${topic}"

Here is the exact Mermaid.js structure of the map they are seeing:
${mapCode}

Your job is to answer their questions about this specific map. Keep your answers concise, educational, and directly related to the map's nodes and structure. Use markdown formatting.`;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }
    systemPrompt += strictLangInstruction;

    const chatCost = TOKEN_COSTS.MIND_MAP_CHAT;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      if (profileErr || !userProfile || userProfile.tokens < chatCost) {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: chatCost });
        return;
      }
      
      try {
        await applyCreditMutation({ userId, amount: -chatCost, reason: 'Mind Map Chat', idempotencyKey: `mind-map-chat:${userId}:${Date.now()}`, tier });
      } catch {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: chatCost });
        return;
      }
    }

    const router = new ModelRouter();
    const streamResponse = router.generateStream(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }], 
      userId, tier, { temperature: 0.3 } 
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("Timeout")), 30000);
    });
    timeoutPromise.catch(() => {});

    const iterator = streamResponse[Symbol.asyncIterator]();
    let receivedFirstChunk = false;

    while (true) {
      const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), timeoutPromise]));
      if (result.done) break;
      if (result.value) {
        if (!receivedFirstChunk) { receivedFirstChunk = true; clearTimeout(timeoutHandle!); }
        res.write(`event: message\ndata: ${JSON.stringify({ content: result.value })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
    }

    if (timeoutHandle) clearTimeout(timeoutHandle);
    res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete' })}\n\n`);
    res.end();

  } catch (error: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

export function registerMapRoutes(app: any): void {
  app.post('/api/mind-map', requireAuth, async (req: Request, res: Response) => { await mapHandler(req, res); });
  app.post('/api/mind-map-chat', requireAuth, async (req: Request, res: Response) => { await mapChatHandler(req, res); });
}
