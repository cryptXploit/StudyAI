import { Request, Response, Router } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';

import fs from 'fs';
import path from 'path';
import os from 'os';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 🟢 1. STANDARD PODCAST GENERATOR
export async function generatePodcastHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, fileIds, language = 'English' } = req.body;

    if (!userId || !topic) {
      res.status(400).json({ error: 'Missing topic' });
      return;
    }

    let contextChunks = "";
    if (fileIds && fileIds.length > 0) {
      // 🟢 RAM & DB PROTECTOR: Sequential Processing instead of Promise.all
      for (const fId of fileIds) {
        const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: topic, limit: 3 });
        contextChunks += results.map((c: any) => c.content || '').join('\n\n') + '\n\n';
      }
      // 🟢 API TOKEN SAVER: Limit context strictly to prevent token explosion
      contextChunks = contextChunks.substring(0, 15000); 
    }

    // ========================================================================
    // Token Verification & Deduction (IDOR Protected)
    // ========================================================================
    const cost = TOKEN_COSTS.PODCAST_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'INSUFFICIENT_TOKENS', required: cost })}\n\n`);
        res.end();
        return;
      }
      
      try {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Podcast Generator', idempotencyKey: `podcast:${userId}:${Date.now()}`, tier });
      } catch {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'INSUFFICIENT_TOKENS', required: cost })}\n\n`);
        res.end();
        return;
      }
    }

    const systemPrompt = `You are an engaging, energetic, and brilliant educational podcast host.
Your goal is to summarize complex topics into an easy-to-listen, conversational audio script.

CRITICAL RULES FOR TTS COMPATIBILITY:
1. NO MARKDOWN: Absolutely no asterisks (*), hashtags (#), or code blocks.
2. SHORT SENTENCES: Keep sentences punchy and easy to digest.
3. TONE: Enthusiastic, clear, and inspiring.
4. MANDATORY LANGUAGE: Generate the ENTIRE script fluently in ${language.toUpperCase()}.`;

    const userPrompt = `Topic to cover: "${topic}"\n\n${contextChunks ? `Reference Material:\n${contextChunks}` : ''}\n\nGenerate the conversational podcast script now.`;

    const router = new ModelRouter();
    const streamResponse = router.generateStream(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      userId, tier, { temperature: 0.7 }
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullScript = "";
    let streamCompletedCleanly = false;
    
    const iterator = streamResponse[Symbol.asyncIterator]();

    while (true) {
      const result = await iterator.next();
      if (result.done) {
        streamCompletedCleanly = true;
        break;
      }
      if (result.value) {
        fullScript += result.value;
        res.write(`data: ${JSON.stringify({ content: result.value })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
    }
    
    if (streamCompletedCleanly && fullScript.length > 50) {
      // 🟢 NON-BLOCKING DB SAVE
      supabase.from('user_podcasts').insert([{
        user_id: userId,
        topic: topic,
        script_content: fullScript,
        file_ids: fileIds || []
      }]).then(({ error: dbError }) => {
        if (dbError) console.error("Podcast DB Save Error:", dbError);
      });
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error: any) {
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

// 🟢 2. DEBATE PODCAST GENERATOR
export async function generateDebateHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { topic, fileIds, language = 'English' } = req.body;

    if (!userId || !topic) {
      res.status(400).json({ error: 'Missing topic' });
      return;
    }

    let contextChunks = "";
    if (fileIds && fileIds.length > 0) {
      // 🟢 RAM & DB PROTECTOR: Sequential Processing
      for (const fId of fileIds) {
        const results = await RetrievalService.hybridSearch({ userId, fileId: fId, query: topic, limit: 3 });
        contextChunks += results.map((c: any) => c.content || '').join('\n\n') + '\n\n';
      }
      // 🟢 API TOKEN SAVER: Limit context strictly
      contextChunks = contextChunks.substring(0, 15000);
    }

    // ========================================================================
    // Token Verification & Deduction (IDOR Protected)
    // ========================================================================
    const cost = TOKEN_COSTS.PODCAST_GEN;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'INSUFFICIENT_TOKENS', required: cost })}\n\n`);
        res.end();
        return;
      }
      
      try {
        await applyCreditMutation({ userId, amount: -cost, reason: 'Podcast Debate Generator', idempotencyKey: `podcast-debate:${userId}:${Date.now()}`, tier });
      } catch {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'INSUFFICIENT_TOKENS', required: cost })}\n\n`);
        res.end();
        return;
      }
    }

    const systemPrompt = `You are a brilliant master debate scriptwriter. 
Create a highly REALISTIC, passionate, and engaging 5-round debate between two podcast hosts: 
- Alex (Male): Analytical, logical, slightly sarcastic.
- Sarah (Female): Creative, emotional, highly energetic.

CRITICAL RULES FOR REALISM & TTS COMPATIBILITY:
1. FORMAT: Write ONLY the dialogues. Each line must start with "Alex: " or "Sarah: ".
2. FILLER WORDS: Use natural human filler words like "Umm", "Well", "Look", "You see", "Wait a minute", or their equivalents in the target language (e.g., "হুমম", "দেখো", "আরে ভাই").
3. PACING & EMOTION: Use ellipses (...) for pauses, and em-dashes (—) when they interrupt each other or suddenly change a thought.
4. TONE: Make them agree and disagree naturally ("I get your point, but...", "I totally disagree!").
5. NO MARKDOWN: Absolutely no asterisks (*), hashtags (#), or stage directions like (laughs).
6. MANDATORY LANGUAGE: Generate the ENTIRE script fluently in ${language.toUpperCase()}.`;

    const userPrompt = `Debate Topic: "${topic}"\n\n${contextChunks ? `Reference Material:\n${contextChunks}` : ''}\n\nStart the 5-round debate script now.`;

    const router = new ModelRouter();
    const streamResponse = router.generateStream(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      userId, tier, { temperature: 0.8 } 
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullScript = "";
    let streamCompletedCleanly = false;
    
    const iterator = streamResponse[Symbol.asyncIterator]();

    while (true) {
      const result = await iterator.next();
      if (result.done) {
        streamCompletedCleanly = true;
        break;
      }
      if (result.value) {
        fullScript += result.value;
        res.write(`data: ${JSON.stringify({ content: result.value })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
    }
    
    if (streamCompletedCleanly && fullScript.length > 50) {
      // 🟢 NON-BLOCKING DB SAVE
      supabase.from('user_podcasts').insert([{
        user_id: userId,
        topic: `Debate: ${topic}`, 
        script_content: fullScript,
        file_ids: fileIds || []
      }]).then(({ error: dbError }) => {
        if (dbError) console.error("Debate DB Save Error:", dbError);
      });
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error: any) {
    if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

// 🟢 3. SINGLE VOICE PROXY (Google TTS)
export async function ttsProxyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { text, lang } = req.query;
    if (!text) { res.status(400).send("Missing text"); return; }

    const langCode = lang || 'en';
    const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${langCode}&q=${encodeURIComponent(text as string)}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!response.ok) {
      res.status(response.status).send("Google TTS Failed");
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString()); 
    res.setHeader('Cache-Control', 'public, max-age=86400'); 
    res.status(200).end(buffer); 

  } catch (error: any) {
    res.status(500).send(error.message);
  }
}

// 🟢 Premium Debate Voice Proxy with exact language locking
export async function debateTtsProxyHandler(req: Request, res: Response): Promise<void> {
  let tempDir = '';
  try {
    const { text, lang, speaker } = req.query;
    if (!text) { res.status(400).send("Missing text"); return; }

    const langCode = (lang as string)?.toLowerCase() || 'en';
    const speakerType = (speaker as string)?.toLowerCase() || 'female';

    let voiceName = 'en-US-JennyNeural'; 
    
    if (langCode === 'bn' || langCode.includes('bn')) {
      voiceName = speakerType === 'male' ? 'bn-BD-PradeepNeural' : 'bn-BD-NabanitaNeural'; 
    } else if (langCode === 'hi' || langCode.includes('hi')) {
      voiceName = speakerType === 'male' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural';
    } else {
      voiceName = speakerType === 'male' ? 'en-US-ChristopherNeural' : 'en-US-JennyNeural';
    }

    try {
      const { MsEdgeTTS } = require('msedge-tts');
      const tts = new MsEdgeTTS();
      
      await tts.setMetadata(voiceName, 'audio-24khz-48kbitrate-mono-mp3');
      
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'debate-edge-'));
      await tts.toFile(tempDir, text as string);
      
      const finalFilePath = path.join(tempDir, 'audio.mp3');
      const buffer = fs.readFileSync(finalFilePath);
      
      res.setHeader('Access-Control-Allow-Origin', '*'); 
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Cache-Control', 'public, max-age=86400'); 
      res.status(200).end(buffer);

    } catch (edgeError) {
      console.warn("MsEdgeTTS error. Falling back to Google TTS.", edgeError);
      
      const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${langCode}&q=${encodeURIComponent(text as string)}`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.setHeader('Access-Control-Allow-Origin', '*'); 
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length.toString()); 
      res.status(200).end(buffer);
    }
  } catch (error: any) {
    console.error("[Debate TTS Error]:", error.message);
    res.status(500).send(error.message);
  } finally {
    // 🟢 DISK SAVER FIX: Guaranteed aggressive cleanup of temp directories
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {}
    }
  }
}

export function registerPodcastRoutes(app: any): void {
  const router = Router();

  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generatePodcastHandler(req, res); });
  router.post('/generate-debate', requireAuth, async (req: Request, res: Response) => { await generateDebateHandler(req, res); });
  
  router.get('/tts', async (req: Request, res: Response) => { await ttsProxyHandler(req, res); });
  router.get('/tts-debate', async (req: Request, res: Response) => { await debateTtsProxyHandler(req, res); });

  app.use('/api/podcast', router);
}
