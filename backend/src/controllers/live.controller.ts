import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js'; 
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export async function liveChatHandler(req: Request, res: Response): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  try {
    const userId = (req as any).user?.id || req.body.userId;
    const tier = (req as any).user?.tier || req.body.tier || 'Free';
    const { message, language = 'English', history = [] } = req.body;

    if (!userId || !message) { res.status(400).json({ error: 'Missing required fields' }); return; }

    const safeMessage = message.substring(0, 500).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Token Cost Verification Check
    if (tier.toLowerCase() !== 'pro') {
      const cost = TOKEN_COSTS.LIVE_CHAT;
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'INSUFFICIENT_TOKENS', required: cost })}\n\n`); res.end();
        return;
      }
    }

    // Prepare Conversation Context
    const languageInstructions: Record<string, string> = {
      English: 'Reply only in natural, warm conversational English.',
      Bengali: 'Reply only in natural Bangla/Bengali written in Bangla script. Do not use English unless the user explicitly asks for it.',
      Hindi: 'Reply only in natural Hindi written in Devanagari script. Do not use English unless the user explicitly asks for it.',
    };
    const selectedLanguage = languageInstructions[language] || languageInstructions.English;

    const systemPrompt = `You are a lively, friendly, and engaging AI Podcast Host/Conversational Partner. 
You are having a real-time voice conversation with the user.

CRITICAL RULES:
1. Speak like a thoughtful human conversation partner, not a robotic assistant. Vary your phrasing, acknowledge the user's point naturally, and ask one useful follow-up only when it helps the conversation.
2. Keep your answers brief and easy to hear: normally 1-3 sentences maximum.
2. DO NOT use markdown, emojis, asterisks (*), or lists. Your text will be sent directly to a Text-To-Speech engine.
3. Be highly conversational, empathetic, and engaging.
4. MANDATORY LANGUAGE: ${selectedLanguage}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6), // Keep last 3 turns
      { role: 'user', content: safeMessage }
    ];

    res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.setHeader('X-Accel-Buffering', 'no'); res.flushHeaders();

    const router = new ModelRouter();
    // Using high temperature for more conversational flavor
    const streamResponse = router.generateStream(messages, userId, tier, { temperature: 0.7 });
    const iterator = streamResponse[Symbol.asyncIterator](); let receivedFirstChunk = false;
    let fullResponse = ""; let streamCompletedCleanly = false;

    timeoutHandle = setTimeout(() => { res.write(`event: error\ndata: ${JSON.stringify({ error: 'Timeout' })}\n\n`); res.end(); }, 15000);

    while (true) {
        const result = await (receivedFirstChunk ? iterator.next() : Promise.race([iterator.next(), new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))]));
        if (result.done) { streamCompletedCleanly = true; break; }
        if (result.value) {
            if (!receivedFirstChunk) { receivedFirstChunk = true; clearTimeout(timeoutHandle!); }
            fullResponse += result.value;
            res.write(`event: message\ndata: ${JSON.stringify({ content: result.value })}\n\n`);
            if (typeof (res as any).flush === 'function') (res as any).flush();
        }
    }
    
    if (timeoutHandle) clearTimeout(timeoutHandle);

    // Token Deduction On Success
    if (streamCompletedCleanly && tier.toLowerCase() !== 'pro') {
      const cost = TOKEN_COSTS.LIVE_CHAT;
      await applyCreditMutation({ userId, amount: -cost, reason: 'Live Voice Chat', idempotencyKey: `live-chat:${userId}:${Date.now()}` });
    }

    res.write(`event: done\ndata: ${JSON.stringify({ status: 'complete' })}\n\n`); res.end();

  } catch (error: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`); res.end();
  }
}

export function registerLiveRoutes(app: any): void {
  const router = Router();
  router.post('/', requireAuth, async (req: Request, res: Response) => { await liveChatHandler(req, res); });
  app.use('/api/live', router);
}
