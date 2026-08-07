import { Request, Response } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js'; 
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

// 🟢 Initialize Supabase Admin for backend operations
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function generateStoryHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // 🟢 NEW: Extract language from request (Default to English)
    const { topic, style, fileIds, tier = 'Free', language = 'English' } = req.body;
    const userId = (req as any).user?.id;

    if (!userId || !topic) {
      res.status(400).json({ error: 'Missing required fields: userId or topic' });
      return;
    }

    // 1. RAG Context Retrieval (If files are selected)
    let contextChunks = "";
    if (fileIds && fileIds.length > 0) {
      // 🟢 RAM & DB PROTECTOR: Sequential Processing instead of Promise.all
      for (const fId of fileIds) {
        const results = await RetrievalService.hybridSearch({
          userId, fileId: fId, query: topic, limit: 3, vectorWeight: 0.6, keywordWeight: 0.4,
        });
        contextChunks += results.map((c: any) => c.text_content || c.content || '').join('\n\n') + '\n\n';
      }
      // 🟢 API TOKEN SAVER: Limit context strictly to prevent token explosion
      contextChunks = contextChunks.substring(0, 15000);
    }

    // 2. Master Storyteller System Prompt (Hyper-Human Tone + 🟢 LANGUAGE RULE)
    const systemPrompt = `You are a master storyteller, educator, and a deeply expressive human being. Your goal is to teach complex concepts by weaving them into unforgettable, vivid, and immersive stories.

CRITICAL TONE & STYLE RULES:
1. NO AI-SPEAK: NEVER start with "Here is a story," "Once upon a time," or "Let's explore." Drop the polite AI persona completely. Start directly with the narrative hook (action, dialogue, or deep emotion).
2. INDISTINGUISHABLE FROM HUMAN: Write like a bestselling novelist or an impassioned professor. Use varied sentence structures, sensory details, and natural human pacing.
3. THE MENTAL HOOK: The concept the user wants to learn MUST be the core mechanism of the story. Embed the educational facts seamlessly.
4. FORMATTING: Use markdown for readability (bolding key concepts). Add paragraphs frequently.
5. MANDATORY LANGUAGE: You MUST generate your ENTIRE story fluently in ${language.toUpperCase()}. Ensure the emotional tone, idioms, and natural pacing perfectly match the ${language} language.`;

    const userPrompt = buildStoryPrompt(topic, style, contextChunks);

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt + strictLangInstruction },
      { role: 'user' as const, content: userPrompt }
    ];

    // 🟢 Token Cost Check & Deduction (OWASP Safe)
    const cost = TOKEN_COSTS.STORY_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
      
      
    }

    // 3. Stream Response via ModelRouter
    const router = new ModelRouter();
    const streamResponse = router.generateStream(messages, userId, tier);

    // 4. Pipe to Frontend
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';
    let streamCompletedCleanly = false;
    const iterator = streamResponse[Symbol.asyncIterator]();

    while (true) {
      const result = await iterator.next();
      if (result.done) {
        streamCompletedCleanly = true;
        break;
      }
      const chunk = result.value;
      if (chunk) {
        if (chunk.startsWith('Error:') || chunk.startsWith('🚨')) throw new Error(chunk);
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
    }

    res.write(`data: ${JSON.stringify({ status: 'complete', length: fullResponse.length })}\n\n`);
    res.end();

    // ========================================================================
    // 🟢 Background Auto-Save to Supabase (Non-blocking DB Call)
    // ========================================================================
    
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Story Generation', idempotencyKey: `story:${userId}:${Date.now()}` });
      }
      
      if (streamCompletedCleanly && fullResponse.trim().length > 50) {
      supabase.from('user_stories').insert([{
        user_id: userId,
        topic: topic,
        style: style,
        content: fullResponse,
        file_ids: fileIds || []
      }]).then(({ error: dbError }) => {
        if (dbError) console.error("[Story Controller] Failed to save story to Supabase:", dbError);
      });
    }

  } catch (error: any) {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
    }
    res.write(`data: ${JSON.stringify({ error: error.message || 'Story generation failed', status: 'failed' })}\n\n`);
    res.end();
  }
}

function buildStoryPrompt(topic: string, style: string, context: string): string {
  let prompt = `Topic to teach: "${topic}"\nTarget Story Style: "${style}"\n\n`;
  if (context) {
    prompt += `Incorporate the factual details from this source context into the story naturally:\n<context>\n${context}\n</context>\n\n`;
  }
  prompt += `Now, write the story. Remember: Start directly in the scene. Make it emotionally resonant or deeply fascinating according to the style. Embed the educational facts so seamlessly that the reader learns without realizing they are studying.`;
  return prompt;
}

export function registerStoryRoutes(app: any): void {
  app.post('/api/story/generate', requireAuth, generateStoryHandler);
}
