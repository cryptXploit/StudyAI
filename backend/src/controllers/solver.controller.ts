import { Request, Response } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { connection as redis } from '../queue/connection';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

function hashSolverRequest(problem: string, fileIds: string[], language: string, sylCourse: string, sylChap: string, sylTopics: string[], hasImage: boolean): string {
  const rawStr = `solver-${problem.toLowerCase()}-${fileIds.sort().join(',')}-${language}-${sylCourse}-${sylChap}-${sylTopics.sort().join(',')}-${hasImage}`;
  let hash = 0;
  for (let i = 0; i < rawStr.length; i++) { hash = ((hash << 5) - hash) + rawStr.charCodeAt(i); hash |= 0; }
  return `solver:cache:${Math.abs(hash)}`;
}

export async function solveProblemHandler(req: Request, res: Response): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  const startTime = Date.now();

  try {
    const userId = (req as any).user?.id || req.body.userId;
    const tier = (req as any).user?.tier || req.body.tier || 'Free';
    // image যুক্ত করা হয়েছে
    const { problem, image, fileIds, language = 'English', syllabusCourseName = '', syllabusChapter = '', syllabusTopics = [] } = req.body;

    if (!userId || (!problem && !image)) { res.status(400).json({ error: 'Missing required fields' }); return; }

    const fileIdArray = fileIds && fileIds.length > 0 ? fileIds : [];
    const safeProblem = problem ? problem.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "Please extract the math/problem from the attached image and solve it step-by-step.";

    const cacheKey = hashSolverRequest(safeProblem, fileIdArray, language, syllabusCourseName, syllabusChapter, syllabusTopics, !!image);
    
    if (!image) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
          const entry = JSON.parse(cachedData);
          res.write(`event: metadata\ndata: ${JSON.stringify({ cached: true, latency: Date.now() - startTime })}\n\n`);
          for (let i = 0; i < entry.solution.length; i += 50) {
            res.write(`event: message\ndata: ${JSON.stringify({ content: entry.solution.substring(i, i + 50) })}\n\n`);
            if (typeof (res as any).flush === 'function') (res as any).flush();
          }
          res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete' })}\n\n`); res.end(); return;
        }
      } catch (err) {}
    }

    // 🟢 RAG Retrieval (আপনার অরিজিনাল লজিক)
    let contextChunks = "";
    if (fileIdArray.length > 0) {
      const limitPerFile = Math.max(2, Math.floor(6 / fileIdArray.length));
      for (const fId of fileIdArray) {
        const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: safeProblem, limit: limitPerFile, vectorWeight: 0.7, keywordWeight: 0.3 });
        contextChunks += results.map((c: any) => `--- Excerpt ---\n${c.content || c.text || ''}`).join('\n\n') + '\n\n';
      }
      contextChunks = contextChunks.substring(0, 15000);
    }

    // 🟢 Syllabus Constraints
    let syllabusConstraint = "";
    if (syllabusCourseName) {
      syllabusConstraint = `\n\n🎯 STRICT SYLLABUS CONSTRAINT:\nThe user is exclusively studying the course/subject: "${syllabusCourseName}".\n`;
      if (syllabusChapter) syllabusConstraint += `They are currently focusing strictly on the chapter: "${syllabusChapter}".\n`;
      if (syllabusTopics && syllabusTopics.length > 0) syllabusConstraint += `More specifically, they want the solution tailored deeply around these topics: ${syllabusTopics.join(', ')}.\n`;
      syllabusConstraint += `\nYou MUST limit your scope, terminology, and complexity to be strictly relevant ONLY to these specific boundaries.`;
    }

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const systemPrompt = `You are an Elite Academic Problem Solver and Data Analyst (Pro-Tier AI).
Your objective is to solve complex user problems with 100% accuracy.${syllabusConstraint}

CRITICAL RULES:
1. STEP-BY-STEP EXECUTION: Break down the solution logically.
   - **Understanding the Problem:** Briefly state what needs to be solved.
   - **Methodology/Formulas:** State the theories used.
   - **Step-by-Step Execution:** Show the progression.
   - **Final Answer:** Clearly highlight the final conclusion.
2. LATEX MASTERY: You MUST use proper LaTeX for all math ($ for inline, $$ for block).
3. MANDATORY LANGUAGE: Generate the ENTIRE response fluently in ${language.toUpperCase()}.${strictLangInstruction}`;

    const userPrompt = `PROBLEM TO SOLVE:\n"${safeProblem}"\n\n${contextChunks ? `RAG DOCUMENT CONTEXT TO USE AS REFERENCE:\n${contextChunks}` : ''}`;

    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();

    // dYY Token Verification Check
    const cost = TOKEN_COSTS.PROBLEM_SOLVER;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'INSUFFICIENT_TOKENS', required: cost })}\n\n`); res.end();
        return;
      }
    }

    res.write(`event: metadata\ndata: ${JSON.stringify({ cached: false })}\n\n`);

    let fullSolution = ""; let streamCompletedCleanly = false;
    const timeoutPromise = new Promise<never>((_, reject) => { timeoutHandle = setTimeout(() => reject(new Error("Timeout")), 30000); }); timeoutPromise.catch(() => {}); 
    
    // 🟢 AI Execution
    if (image) {
        // ইমেজ থাকলে ডাইরেক্ট ফেচ (Admin Configured Model)
        let apiKey = process.env.GEMINI_API_KEY;
        let targetModel = 'gemini-1.5-flash';
        
        try {
           const { data } = await supabase.from('api_configurations')
             .select('model_name, api_key')
             .in('provider_name', ['google', 'gemini'])
             .in('task_type', ['general', 'complex']) // 🟢 NEW: Skip embedding models
             .eq('is_active', true)
             .order('priority', { ascending: true })
             .limit(1).single();
           if (data?.model_name) targetModel = data.model_name;
           if (data?.api_key) apiKey = data.api_key;
        } catch(e) {
           console.warn("[Solver] Failed to fetch admin model config for Image, using default.");
        }

        const mimeType = image.substring(image.indexOf(':') + 1, image.indexOf(';')) || 'image/jpeg';
        const base64Data = image.split(',')[1];
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + '\n' + userPrompt }, { inlineData: { mimeType, data: base64Data } }] }], generationConfig: { temperature: 0.2 } })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Solver Backend Error] Image AI Model failed (${response.status}):`, errText);
            throw new Error("The AI model for images is currently unavailable or improperly configured by the admin.");
        }

        const reader = (response.body as any).getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (!dataStr) continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (textPart) {
                            fullSolution += textPart;
                            res.write(`event: message\ndata: ${JSON.stringify({ content: textPart })}\n\n`);
                            if (typeof (res as any).flush === 'function') (res as any).flush();
                        }
                    } catch(e) {}
                }
            }
        }
        streamCompletedCleanly = true;
    } else {
        const router = new ModelRouter();
        const streamResponse = router.generateStream([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], userId, tier, { temperature: 0.2 });
        const iterator = streamResponse[Symbol.asyncIterator](); let receivedFirstChunk = false;

        while (true) {
            const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), timeoutPromise]));
            if (result.done) { streamCompletedCleanly = true; break; }
            if (result.value) {
                if (!receivedFirstChunk) { receivedFirstChunk = true; clearTimeout(timeoutHandle!); }
                fullSolution += result.value;
                res.write(`event: message\ndata: ${JSON.stringify({ content: result.value })}\n\n`);
                if (typeof (res as any).flush === 'function') (res as any).flush();
            }
        }
    }
    
    if (timeoutHandle) clearTimeout(timeoutHandle);
    
    // 🟢 Token Cost Check & Deduction (Deduct Only On Success)
    if (streamCompletedCleanly && tier.toLowerCase() !== 'pro') {
      const cost = TOKEN_COSTS.PROBLEM_SOLVER;
      await applyCreditMutation({ userId, amount: -cost, reason: 'Problem Solver Generation', idempotencyKey: `problem-solver:${userId}:${cacheKey}`, tier });
    }

    // 🟢 Saving Logic (Original)
    if (fullSolution.length > 50) {
      if (!image) await redis.setex(cacheKey, 86400, JSON.stringify({ solution: fullSolution, timestamp: Date.now() })).catch(() => {});
      if (streamCompletedCleanly) { 
        supabase.from('solved_problems').insert([{ user_id: userId, problem_statement: problem || "Image", solution_content: fullSolution, file_ids: fileIds || [] }])
        .then((res) => { if (res.error) console.error("Solver DB Save Error:", res.error) });
      }
    }

    res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete' })}\n\n`); res.end();

  } catch (error: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`); res.end();
  }
}

export function registerSolverRoutes(app: any): void {
  app.post('/api/solver/solve', requireAuth, async (req: Request, res: Response) => { await solveProblemHandler(req, res); });
}
