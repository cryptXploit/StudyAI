/**
 * Night Before Exam Controller
 * i18n SUPPORT: Multi-language aware caching and generation.
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

function hashNightRequest(action: string, topic: string, fileIds: string[], language: string, sylCourses: string[], sylChaps: string[], sylTopics: string[]): string {
  const rawStr = `${action}-${topic.toLowerCase().trim()}-${fileIds.sort().join(',')}-${language.toLowerCase()}-${sylCourses.sort().join(',')}-${sylChaps.sort().join(',')}-${sylTopics.sort().join(',')}`;
  let hash = 0;
  for (let i = 0; i < rawStr.length; i++) {
    hash = ((hash << 5) - hash) + rawStr.charCodeAt(i);
    hash |= 0;
  }
  return `night:cache:${Math.abs(hash)}`;
}

export async function nightHandler(req: Request, res: Response): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const startTime = Date.now();
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { action, topic, fileIds, language = 'English', syllabusCourseNames = [], syllabusChapters = [], syllabusTopics = [] } = req.body;
    if (!userId || !action) { res.status(400).json({ error: 'Missing required fields' }); return; }
    const fileIdArray = fileIds && fileIds.length > 0 ? fileIds : [];
    const safeTopic = topic ? topic.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const cacheKey = hashNightRequest(action, safeTopic, fileIdArray, language, syllabusCourseNames, syllabusChapters, syllabusTopics);
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const entry = JSON.parse(cachedData);
        res.write(`event: metadata\n`);
        res.write(`data: ${JSON.stringify({ cached: true, latency: Date.now() - startTime })}\n\n`);
        const chunkSize = 50;
        for (let i = 0; i < entry.answer.length; i += chunkSize) {
          const chunk = entry.answer.substring(i, i + chunkSize);
          res.write(`event: message\n`);
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          if (typeof (res as any).flush === 'function') (res as any).flush();
        }
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({ status: 'complete' })}\n\n`);
        res.end();
        return;
      }
    } catch (cacheErr) {}
    let contextChunks = '';
    if (fileIdArray.length > 0) {
      if (!safeTopic) {
        const { data: fileRecords } = await supabase.from('files').select('name, global_summary').in('id', fileIdArray);
        const validSummaries = fileRecords?.filter((f: any) => f.global_summary && f.global_summary.trim().length > 20);
        if (validSummaries && validSummaries.length > 0) {
          contextChunks = validSummaries.map((f: any) => `--- Document: ${f.name} ---\n${f.global_summary}`).join('\n\n==========\n\n');
        }
      }
      if (!contextChunks || safeTopic) {
        const limitPerFile = Math.max(2, Math.floor(6 / fileIdArray.length));
        for (const fId of fileIdArray) {
          const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: safeTopic || action, limit: limitPerFile, vectorWeight: 0.6, keywordWeight: 0.4 });
          contextChunks += results.map((c: any) => `--- Excerpt --- \n${c.text_content || c.content || c.text || ''}`).join('\n\n') + '\n\n';
        }
      }
      const maxChars = Math.min(8000, fileIdArray.length * 3500);
      if (contextChunks.length > maxChars) {
        contextChunks = contextChunks.substring(0, maxChars) + '\n... [Context truncated to fit memory limit]';
      }
    }
    let syllabusConstraint = '';
    if (syllabusCourseNames && syllabusCourseNames.length > 0) {
      syllabusConstraint = `\n\n\u{1F3AF} STRICT SYLLABUS CONSTRAINT:\nThe student is focusing exclusively on these courses/subjects: ${syllabusCourseNames.join(', ')}.\n`;
      if (syllabusChapters && syllabusChapters.length > 0) {
        syllabusConstraint += `They are strictly reviewing these specific chapters/modules: ${syllabusChapters.join(', ')}.\n`;
      }
    }
    const systemPrompt = `You are a caring, expert exam mentor. Use LaTeX for all math formulas. Be concise, accurate and supportive.${syllabusConstraint}`;
    let userPrompt = safeTopic ? `STUDENT TOPIC/QUESTION: ${safeTopic}\n\n` : '';
    if (contextChunks) { userPrompt += `PROVIDED DOCUMENT CONTEXT (Synthesize from ALL parts):\n${contextChunks}\n\n`; }
    if (!safeTopic && !contextChunks) { userPrompt += 'Please provide general guidance based on your knowledge.\n\n'; }
    if (action === 'roadmap') { userPrompt += 'ACTION: Create a fast-track Study Roadmap. Highlight High-Priority, Medium-Priority, and Low-Priority areas.';
    } else if (action === 'real_life') { userPrompt += "ACTION: Explain using ONLY simple, real-life analogies (Explain Like I'm 5).";
    } else if (action === 'cheat_sheet') { userPrompt += 'ACTION: Generate a dense Cheat Sheet. Include key definitions, formulas (LaTeX), rules, bullet points.';
    } else if (action === 'top_questions') { userPrompt += 'ACTION: Generate the Top 5 most probable exam questions with brief, accurate answers.';
    } else { userPrompt += 'ACTION: Give a highly condensed 5-minute summary of the entire provided context.'; }
    let strictLangInstruction = '';
    if (language === 'Bangla') { strictLangInstruction = '\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.'; }
    else if (language === 'Hindi') { strictLangInstruction = '\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.'; }
    const messages = [
      { role: 'system' as const, content: systemPrompt + strictLangInstruction },
      { role: 'user' as const, content: userPrompt }
    ];
    const router = new ModelRouter();
    const streamResponse = router.generateStream(messages, userId, tier, { temperature: 0.5 });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const cost = TOKEN_COSTS.NIGHT_BEFORE;
    if (tier.toLowerCase() !== 'pro') {
      try {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Night Before Study', idempotencyKey: `night-before:${userId}:${Date.now()}` });
      } catch (error: any) {
        res.write(`event: error\n`);
        const insufficient = String(error?.message || '').includes('INSUFFICIENT_TOKENS');
        res.write(`data: ${JSON.stringify({ error: insufficient ? 'INSUFFICIENT_TOKENS' : 'Failed to process transaction', required: cost })}\n\n`);
        res.end(); return;
      }
    }
    const flush = () => { if (typeof (res as any).flush === 'function') (res as any).flush(); };
    res.write(`event: metadata\n`);
    res.write(`data: ${JSON.stringify({ cached: false, action })}\n\n`);
    let fullAIResponse = '';
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('AI Model Response Timeout')), 25000);
    });
    timeoutPromise.catch(() => {});
    const iterator = streamResponse[Symbol.asyncIterator]();
    let receivedFirstChunk = false;
    while (true) {
      const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), timeoutPromise]));
      if (result.done) break;
      const chunk = result.value;
      if (chunk) {
        if (!receivedFirstChunk) { receivedFirstChunk = true; if (timeoutHandle) clearTimeout(timeoutHandle); }
        fullAIResponse += chunk;
        res.write(`event: message\n`);
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        flush();
      }
    }
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (fullAIResponse.length > 50) {
      await redis.setex(cacheKey, 86400, JSON.stringify({ answer: fullAIResponse, timestamp: Date.now() })).catch(() => {});
    }
    res.write(`event: done\n`);
    res.write(`data: ${JSON.stringify({ status: 'complete' })}\n\n`);
    res.end();
  } catch (error: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (!res.headersSent) { res.setHeader('Content-Type', 'text/event-stream'); }
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

export function registerNightRoutes(app: any): void {
  app.post('/api/night-before', requireAuth, async (req: Request, res: Response) => {
    await nightHandler(req, res);
  });
}
