/**
 * Quiz Controller - Realtime & LaTeX Exam Generator
 * Architecture: Supabase RPC Hybrid Search + ModelRouter (Free Tier)
 * 🟢 FIX: Caching strictly DISABLED for Quizzes to ensure 100% dynamic & fresh questions.
 * 🟢 i18n SUPPORT: Multi-language aware generation for both Interactive JSON and LaTeX.
 */

import { Request, Response } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export async function quizHandler(req: Request, res: Response): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, numQuestions, types, mode, fileIds, language = 'English' } = req.body;

    if (!userId || !topic || !mode) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // ========================================================================
    // Step 1: Hybrid Data Retrieval (🟢 RAM & DB PROTECTOR: Sequential Loop)
    // ========================================================================
    let contextChunks = "";
    if (fileIds && fileIds.length > 0) {
      for (const fId of fileIds) {
        const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: topic, limit: 3, vectorWeight: 0.6, keywordWeight: 0.4 });
        contextChunks += results.map((c: any) => c.text_content || c.content || c.text || '').join('\n\n') + '\n\n';
      }
      
      // 🟢 API TOKEN SAVER: Prevent LLM input overflow
      if (contextChunks.length > 6000) {
        contextChunks = contextChunks.substring(0, 6000) + '\n... [Context truncated to fit AI memory]';
      }
    }

    // ========================================================================
    // Step 2: AI Prompt Construction (Strict Metadata Guards & Language)
    // ========================================================================
    let systemPrompt = "";
    let userPrompt = `TOPIC: ${topic}\nNUMBER OF QUESTIONS: ${numQuestions}\nQUESTION TYPES: ${types.join(', ')}\n\n`;
    
    if (contextChunks) {
      userPrompt += `DOCUMENT CONTEXT:\n${contextChunks}\n\n`;
    }

    userPrompt += `
CRITICAL RULES FOR QUESTION GENERATION:
1. DO NOT INCLUDE METADATA: Absolutely NO questions about University Names, Course Codes, Exam Years, Full Marks, Time Duration, or Teacher Names.
2. FOCUS ON CORE CONCEPTS: Base all questions ONLY on the actual educational theories, concepts, definitions, and subject matter inside the text.
3. BE DYNAMIC & CREATIVE: Generate a COMPLETELY NEW, RANDOMIZED set of questions.`;

    // 🟢 FIXED: Ultra-Strict Prompt Engineering to STOP JSON Hallucinations
    if (mode === 'interactive') {
      systemPrompt = `You are a strict JSON Generator Machine. 
You MUST output ONLY a valid, raw JSON array of objects.
CRITICAL JSON RULES (FAILURE IS NOT AN OPTION):
1. Start your response EXACTLY with [ and end EXACTLY with ].
2. Every key ("type", "question", "options", "correctAnswer", "explanation") MUST be enclosed in double quotes.
3. Every string value MUST be enclosed in double quotes.
4. You MUST separate every key-value pair with a comma (,).
5. The "options" key MUST contain an array of exactly 4 string items.
6. DO NOT include any text outside the JSON array. DO NOT use markdown blocks (\`\`\`json).

LANGUAGE RULE: Generate the content (questions, options, correct answers, explanations) fluently in ${language.toUpperCase()}. Keep the JSON keys in English.

EXAMPLE OF PERFECT OUTPUT:
[
  { "type": "MCQ", "question": "What is 2+2?", "options": ["1", "2", "3", "4"], "correctAnswer": "4", "explanation": "Math rule." }
]`;
    } else if (mode === 'latex') {
      systemPrompt = `You are an expert LaTeX Document Generator.
Create a professional Quiz/Exam paper using ONLY valid pdflatex code. 
Include \\documentclass{article}, \\begin{document}, a title, the questions, and an Answer Key at the end.
Do NOT use markdown blocks (\`\`\`latex). Output ONLY the raw LaTeX string.
MANDATORY LANGUAGE: You MUST generate the questions, instructions, and text in ${language.toUpperCase()}. Use proper LaTeX packages (like 'polyglossia' or 'babel') if necessary to support the requested language characters.`;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    // ========================================================================
    // Step 3: ModelRouter Streaming execution
    // ========================================================================
    const router = new ModelRouter();
    
    // 🟢 FIXED: Temperature reduced to 0.1 to FORCE structural rigidity (No crazy hallucinated JSON)
    const streamResponse = router.generateStream(messages, userId, tier, { temperature: 0.1 });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 🟢 Token Cost Check & Deduction (OWASP Safe)
    const cost = TOKEN_COSTS.QUIZ_GEN;
    if (tier.toLowerCase() !== 'pro') {
      try {
        await applyCreditMutation({
          userId,
          amount: -cost,
          reason: 'Quiz Generation',
          idempotencyKey: `quiz:${userId}:${Date.now()}`,
        });
      } catch (error: any) {
        const insufficient = String(error?.message || '').includes('INSUFFICIENT_TOKENS');
        res.write(`data: ${JSON.stringify({ error: insufficient ? 'INSUFFICIENT_TOKENS' : 'Failed to process transaction', required: cost })}\n\n`); res.end();
        return;
      }
    }

    const flush = () => { if (typeof (res as any).flush === 'function') (res as any).flush(); };

    let fullAIResponse = "";

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("AI Model Response Timeout")), 25000);
    });
    timeoutPromise.catch(() => {}); 
    
    const iterator = streamResponse[Symbol.asyncIterator]();
    let receivedFirstChunk = false;

    while (true) {
      const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), timeoutPromise]));
      if (result.done) break;
      
      const chunk = result.value;
      if (chunk) {
        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          if (timeoutHandle) clearTimeout(timeoutHandle); 
        }
        fullAIResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        flush(); 
      }
    }
    
    if (timeoutHandle) clearTimeout(timeoutHandle);
    
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

export function registerQuizRoutes(app: any): void {
  app.post('/api/quiz', requireAuth, async (req: Request, res: Response) => {
    await quizHandler(req, res);
  });
}
