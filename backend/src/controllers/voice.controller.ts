import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js'; 
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const upload = multer({ storage: multer.memoryStorage() });

export async function voiceProcessHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    const tier = (req as any).user?.tier || req.body.tier || 'Free';
    const language = req.body.language || 'English';
    const historyStr = req.body.history || '[]';
    let history = [];
    try { history = JSON.parse(historyStr); } catch(e) {}

    const file = req.file;
    if (!userId || !file) {
      res.status(400).json({ error: 'Missing audio file or userId' });
      return;
    }

    // Token Check
    if (tier.toLowerCase() !== 'pro') {
      const cost = TOKEN_COSTS.LIVE_CHAT;
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(403).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    // 1. STT with Groq Whisper
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) throw new Error("GROQ_API_KEY not configured on server.");

    const form = new FormData();
    form.append('file', file.buffer, { filename: 'audio.webm', contentType: 'audio/webm' });
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!groqRes.ok) {
      const text = await groqRes.text();
      throw new Error(`Groq STT failed: ${text}`);
    }
    const groqData = await groqRes.json() as any;
    const userMessage = groqData.text;

    if (!userMessage || userMessage.trim().length === 0) {
      res.json({ error: "NO_SPEECH", message: "Could not hear you properly." });
      return;
    }

    // 2. LLM Processing
    const languageInstructions: Record<string, string> = {
      English: 'Reply only in natural, warm conversational English.',
      Bangla: 'Reply only in natural Bangla/Bengali written in Bangla script. Do not use English unless the user explicitly asks for it.',
      Hindi: 'Reply only in natural Hindi written in Devanagari script. Do not use English unless the user explicitly asks for it.',
    };
    const selectedLanguage = languageInstructions[language] || languageInstructions.English;

    let strictLangInstruction = "";
    if (language === 'Bangla') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Bengali language. Do not use English and do not hallucinate.";
    } else if (language === 'Hindi') {
      strictLangInstruction = "\n\nCRITICAL INSTRUCTION: You MUST generate your entire response ONLY in Hindi language. Do not use English and do not hallucinate.";
    }

    const systemPrompt = `You are a lively, friendly, and engaging AI Podcast Host/Conversational Partner. 
You are having a real-time voice conversation with the user.

CRITICAL RULES:
1. Speak like a thoughtful human conversation partner, not a robotic assistant.
2. Keep your answers brief and easy to hear: normally 1-2 sentences maximum.
3. DO NOT use markdown, emojis, asterisks (*), hashtags, or lists. Your text will be sent directly to a Text-To-Speech engine.
4. MANDATORY LANGUAGE: ${selectedLanguage}${strictLangInstruction}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: userMessage }
    ];

    const router = new ModelRouter();
    // Using simple generation instead of stream because we need the full text for TTS
    const streamResponse = router.generateStream(messages, userId, tier, { temperature: 0.7 });
    let aiResponse = "";
    for await (const chunk of streamResponse) {
        aiResponse += chunk;
    }
    aiResponse = aiResponse.replace(/[*#]/g, '').trim();

    // 3. TTS with Edge-TTS
    const tts = new MsEdgeTTS();
    let voiceName = "en-US-AriaNeural";
    if (language === 'Bangla') voiceName = "bn-BD-NabanitaNeural";
    if (language === 'Hindi') voiceName = "hi-IN-SwaraNeural";

    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const tempDir = path.join(os.tmpdir(), `tts_${uuidv4()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    await tts.toFile(tempDir, aiResponse);
    
    const audioFilePath = path.join(tempDir, 'audio.mp3');
    const audioBuffer = fs.readFileSync(audioFilePath);
    const audioBase64 = audioBuffer.toString('base64');
    
    // Cleanup
    try {
       fs.unlinkSync(audioFilePath);
       fs.rmdirSync(tempDir);
    } catch(e) { console.error("Cleanup error:", e); }

    // Token Deduction On Success
    if (tier.toLowerCase() !== 'pro') {
      const cost = TOKEN_COSTS.LIVE_CHAT;
      await applyCreditMutation({ userId, amount: -cost, reason: 'Live Voice Chat (Server)', idempotencyKey: `live-chat:${userId}:${Date.now()}` });
    }

    res.json({
      userText: userMessage,
      aiText: aiResponse,
      audioBase64
    });

  } catch (error: any) {
    console.error("Voice Processing Error:", error);
    res.status(500).json({ error: error.message });
  }
}

export function registerVoiceRoutes(app: any): void {
  const router = Router();
  router.post('/process', requireAuth, upload.single('audio'), async (req: Request, res: Response) => { await voiceProcessHandler(req, res); });
  app.use('/api/voice', router);
}
