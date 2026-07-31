import { exec } from 'child_process';
import { promisify } from 'util';
import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { applyCreditMutation } from '../services/creditLedger.service';
const execAsync = promisify(exec);

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ─────────────────────────────────────────────
// 🟢 HYBRID FALLBACK TRANSCRIPT ENGINE
// Priority: RapidAPI (YT-API)  →  yt-dlp  →  Piped API  →  Invidious API
// ─────────────────────────────────────────────

// Method 0: RapidAPI YT-API (PRIMARY - bypasses all IP blocks)
async function transcriptViaRapidApi(videoId: string) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error('RAPIDAPI_KEY not set');

  console.log(`[RAPIDAPI] Attempting transcript for ${videoId}...`);
  const res = await fetch(`https://yt-api.p.rapidapi.com/subtitles?id=${videoId}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'yt-api.p.rapidapi.com'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!res.ok) throw new Error(`RapidAPI responded with ${res.status}`);
  const data: any = await res.json();

  const subtitles: any[] = data.subtitles || [];
  if (subtitles.length === 0) throw new Error('RapidAPI: No subtitles available for this video');

  // Prefer English, then any language
  const preferred = subtitles.find((s: any) => s.languageCode?.startsWith('en')) || subtitles[0];
  
  // Fetch the actual XML transcript from the subtitle URL
  const xmlRes = await fetch(preferred.url, { signal: AbortSignal.timeout(8000) });
  const xml = await xmlRes.text();
  return parseXmlTranscript(xml);
}

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.smnz.de',
  'https://pipedapi.adminforge.de',
  'https://api.piped.yt',
  'https://piped-api.lunar.icu',
  'https://piped.video/api',
];

const INVIDIOUS_INSTANCES = [
  'https://invidious.jing.rocks',
  'https://invidious.nerdvpn.de',
  'https://inv.tux.pizza',
  'https://invidious.flokinet.to',
  'https://invidious.privacyredirect.com',
  'https://y.com.sb',
];

// Method 1: yt-dlp subprocess
async function transcriptViaYtDlp(videoId: string) {
  console.log(`[YT-DLP] Attempting transcript for ${videoId}...`);
  const cmd = `yt-dlp --skip-download --write-auto-sub --write-sub --sub-lang "en,bn,hi,ur,es" --sub-format vtt --print "%(subtitles)j %(automatic_captions)j" -- "${videoId}"`;
  const { stdout } = await execAsync(cmd, { timeout: 30000 });
  // Parse the JSON printed output to find a subtitle URL
  const parts = stdout.trim().split('\n');
  for (const part of parts) {
    try {
      const data = JSON.parse(part);
      for (const langKey of ['en', 'bn', 'hi', 'ur', 'es']) {
        if (data[langKey]) {
          const entry = Array.isArray(data[langKey]) ? data[langKey] : data[langKey];
          const vttEntry = Array.isArray(entry) ? entry.find((e: any) => e.ext === 'vtt' || e.ext === 'json3') : null;
          if (vttEntry?.url) {
            const res = await fetch(vttEntry.url);
            const text = await res.text();
            return parseVttToTranscript(text);
          }
        }
      }
    } catch {}
  }
  throw new Error('yt-dlp: No subtitle URL found in output');
}

function parseVttToTranscript(vtt: string) {
  const lines = vtt.split('\n');
  const result: { text: string; offset: number; duration: number }[] = [];
  let i = 0;
  const timeRe = /(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/;
  while (i < lines.length) {
    const match = lines[i]?.match(timeRe);
    if (match) {
      const start = (+match[1]*3600 + +match[2]*60 + +match[3]) * 1000 + +match[4];
      const end   = (+match[5]*3600 + +match[6]*60 + +match[7]) * 1000 + +match[8];
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(timeRe)) {
        const clean = lines[i].replace(/<[^>]+>/g, '').trim();
        if (clean) textLines.push(clean);
        i++;
      }
      if (textLines.length > 0) {
        result.push({ text: textLines.join(' '), offset: start, duration: end - start });
      }
    } else {
      i++;
    }
  }
  if (result.length === 0) throw new Error('yt-dlp: Parsed VTT is empty');
  return result;
}

// Method 2: Piped API instances (with fallback across instances)
async function transcriptViaPiped(videoId: string) {
  for (const base of PIPED_INSTANCES) {
    try {
      console.log(`[PIPED] Trying ${base} for ${videoId}...`);
      const res = await fetch(`${base}/streams/${videoId}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data: any = await res.json();
      const subtitleTracks: any[] = data.subtitles || [];
      if (subtitleTracks.length === 0) continue;
      // Prefer en, then fallback to first
      const preferred = subtitleTracks.find((t: any) => t.code?.startsWith('en')) || subtitleTracks[0];
      const xmlRes = await fetch(preferred.url, { signal: AbortSignal.timeout(5000) });
      const xml = await xmlRes.text();
      return parseXmlTranscript(xml);
    } catch (err: any) {
      console.log(`[PIPED] ${base} failed: ${err.message}`);
    }
  }
  throw new Error('All Piped instances failed');
}

// Method 3: Invidious API instances
async function transcriptViaInvidious(videoId: string) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      console.log(`[INVIDIOUS] Trying ${base} for ${videoId}...`);
      const res = await fetch(`${base}/api/v1/captions/${videoId}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data: any = await res.json();
      const captions: any[] = data.captions || [];
      if (captions.length === 0) continue;
      const preferred = captions.find((c: any) => c.languageCode?.startsWith('en') && c.name?.includes('auto')) ||
                        captions.find((c: any) => c.languageCode?.startsWith('en')) ||
                        captions[0];
      const captionRes = await fetch(`${base}/api/v1/captions/${videoId}?label=${encodeURIComponent(preferred.label)}`, { signal: AbortSignal.timeout(5000) });
      const xml = await captionRes.text();
      return parseXmlTranscript(xml);
    } catch (err: any) {
      console.log(`[INVIDIOUS] ${base} failed: ${err.message}`);
    }
  }
  throw new Error('All Invidious instances failed');
}

function parseXmlTranscript(xml: string) {
  const matches = [...xml.matchAll(/<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g)];
  if (matches.length === 0) throw new Error('XML transcript is empty');
  return matches.map(m => ({
    offset: parseFloat(m[1]) * 1000,
    duration: parseFloat(m[2]) * 1000,
    text: m[3].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
  })).filter(t => t.text.length > 0);
}

// 🟢 MASTER FUNCTION: Try all methods in sequence
async function getTranscript(videoId: string) {
  // 🥇 PRIMARY: RapidAPI (works from any IP, no YouTube restrictions)
  try {
    const result = await transcriptViaRapidApi(videoId);
    console.log(`✅ [RAPIDAPI] Success for ${videoId}`);
    return result;
  } catch (e: any) {
    console.warn(`⚠️ [RAPIDAPI] Failed: ${e.message}. Trying yt-dlp...`);
  }

  // 🥈 FALLBACK 1: yt-dlp
  try {
    const result = await transcriptViaYtDlp(videoId);
    console.log(`✅ [YT-DLP] Success for ${videoId}`);
    return result;
  } catch (e: any) {
    console.warn(`⚠️ [YT-DLP] Failed: ${e.message}. Trying Piped...`);
  }

  // 🥉 FALLBACK 2: Piped
  try {
    const result = await transcriptViaPiped(videoId);
    console.log(`✅ [PIPED] Success for ${videoId}`);
    return result;
  } catch (e: any) {
    console.warn(`⚠️ [PIPED] Failed: ${e.message}. Trying Invidious...`);
  }

  // 🔴 FALLBACK 3: Invidious
  try {
    const result = await transcriptViaInvidious(videoId);
    console.log(`✅ [INVIDIOUS] Success for ${videoId}`);
    return result;
  } catch (e: any) {
    console.warn(`⚠️ [INVIDIOUS] Failed: ${e.message}.`);
  }

  throw new Error('All transcript methods exhausted. Video may have captions disabled.');
}


function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// 🟢 Reusable Chunking Engine
function generateChunks(transcriptList: any[]) {
  const CHUNK_DURATION_MS = 5 * 60 * 1000; // 5 Minutes
  const chapters: { id: number, timeLabel: string, text: string }[] = [];
  let currentChunkIndex = 0;
  let currentText: string[] = [];

  const formatTime = (mins: number) => `${String(Math.floor(mins)).padStart(2, '0')}:00`;

  for (const item of transcriptList) {
    const chunkIndex = Math.floor(item.offset / CHUNK_DURATION_MS);
    if (chunkIndex > currentChunkIndex) {
      chapters.push({
        id: currentChunkIndex,
        timeLabel: `${formatTime(currentChunkIndex * 5)} - ${formatTime((currentChunkIndex + 1) * 5)}`,
        text: currentText.join(' ')
      });
      currentChunkIndex = chunkIndex;
      currentText = [];
    }
    currentText.push(item.text);
  }
  if (currentText.length > 0) {
    chapters.push({
      id: currentChunkIndex,
      timeLabel: `${formatTime(currentChunkIndex * 5)} - End`,
      text: currentText.join(' ')
    });
  }
  return chapters;
}

export async function fetchChaptersHandler(req: Request, res: Response): Promise<void> {
  try {
    const { videoUrl } = req.body;
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      res.status(400).json({ error: 'Invalid YouTube URL.' });
      return;
    }

    const transcriptList = await getTranscript(videoId);
    const chapters = generateChunks(transcriptList);

    res.json({ valid: true, videoId, chapters: chapters.map(c => ({ id: c.id, timeLabel: c.timeLabel })) }); 
  } catch (error) {
    res.status(400).json({ error: 'Captions disabled for this video. Cannot extract transcript.' });
  }
}

export async function decodeYoutubeHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { videoUrl, videoId, selectedChapterIds, language = 'English' } = req.body;

    if (!userId || !selectedChapterIds || !Array.isArray(selectedChapterIds)) {
      res.status(400).json({ error: 'Missing chapter selection.' });
      return;
    }

    // 🟢 1.5. TOKEN VERIFICATION & DEDUCTION (IDOR Protected)
    const cost = TOKEN_COSTS.YOUTUBE_DECODER;
    if (tier.toLowerCase() !== 'pro') {
      const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('tokens').eq('id', userId).single();
      
      if (profileErr || !userProfile || userProfile.tokens < cost) {
        res.status(402).json({ error: 'INSUFFICIENT_TOKENS', required: cost });
        return;
      }
    }

    const transcriptList = await getTranscript(videoId);
    const allChapters = generateChunks(transcriptList);
    const targetChapters = allChapters.filter(ch => selectedChapterIds.includes(ch.id));

    const router = new ModelRouter();

    // 🟢 RAM & API RATE-LIMIT PROTECTOR: Sequential Processing (No Promise.all)
    // একসাথে অনেকগুলো রিকোয়েস্ট পাঠিয়ে API Limit বা Server RAM ক্র্যাশ ঠেকানোর জন্য একটি একটি করে প্রসেস করা হচ্ছে।
    const processedChunks: { title: string, markdownContent: string }[] = [];

    for (const chunk of targetChapters) {
      let cleanTranscript = chunk.text
        .replace(/\b(um|uh|like|you know|subscribe|hit the bell)\b/gi, '')
        .replace(/\s+/g, ' ')
        .substring(0, 4500); 

      const systemPrompt = `You are an Elite Academic Professor creating a segment of a Crash Course.
If the transcript is not in English, generate the notes in that original language unless explicitly asked otherwise. 
Target language: ${language}.

CRITICAL RULES:
1. DO NOT output JSON. 
2. You MUST wrap the sub-topic title EXACTLY inside <title> and </title> tags.
3. You MUST wrap the detailed notes EXACTLY inside <content> and </content> tags.
4. Use Markdown (##, bold, bullet points) inside the <content> tag.
5. For math, use LaTeX ($...$ inline, $$...$$ block).

EXAMPLE FORMAT:
<title>
Your Catchy Title Here
</title>
<content>
Your detailed markdown notes here...
</content>`;

      const userPrompt = `[CACHE_KEY: YT_XML_${videoId}_CH_${chunk.id}_LANG_${language}]\nTRANSCRIPT TO DECODE:\n${cleanTranscript}`;

      try {
        const responseText = await router.generate(
          [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], 
          userId, tier, { temperature: 0.1 }
        );

        const titleMatch = responseText.match(/<title>([\s\S]*?)<\/title>/i);
        const contentMatch = responseText.match(/<content>([\s\S]*?)<\/content>/i);

        if (!titleMatch || !contentMatch) {
           throw new Error("Missing XML tags in AI response");
        }

        processedChunks.push({
          title: titleMatch[1].trim(),
          markdownContent: contentMatch[1].trim()
        });

      } catch (err: any) {
        console.warn(`Chunk ${chunk.id} Failed: ${err.message}. Triggering Fallback.`);
        processedChunks.push({ 
          title: `Notes for ${chunk.timeLabel}`, 
          markdownContent: `*(AI Generation degraded for this segment. Processed Raw Text)*\n\n${cleanTranscript}` 
        });
      }

      // 🟢 Memory Cleanup hint for V8 Engine
      cleanTranscript = ''; 
    }

    // 🟢 Fetch Actual Video Title
    let realVideoTitle = `Crash Course: Parts (${targetChapters.map(c => c.timeLabel).join(', ')})`;
    try {
      const noembedRes = await fetch(`https://noembed.com/embed?url=${videoUrl}`, { signal: AbortSignal.timeout(3000) });
      const noembedData: any = await noembedRes.json();
      if (noembedData && noembedData.title) {
        realVideoTitle = noembedData.title;
      }
    } catch (e) {
      console.warn('Failed to fetch video title from noembed');
    }

    // 🟢 FRAGMENTED DATA JOINING
    const finalCourseData = {
      title: realVideoTitle,
      summary: `Compiled notes containing ${targetChapters.length} video segments.`,
      markdownContent: processedChunks.map(chunk => `### ${chunk.title}\n\n${chunk.markdownContent}`).join('\n\n---\n\n'),
      timestamps: targetChapters.map(c => ({ 
        id: c.id, 
        timeLabel: c.timeLabel, 
        startSeconds: c.id * 5 * 60 
      }))
    };

    let savedId = null;
    try {
      const { data: savedRow } = await supabase.from('youtube_courses').insert([{
        user_id: userId,
        video_url: videoUrl,
        video_id: videoId,
        course_data: finalCourseData
      }]).select().single();
      if (savedRow) savedId = savedRow.id;
    } catch (dbEx) {}

    
      // 🟢 DEDUCT TOKENS ONLY ON SUCCESS
      if (tier.toLowerCase() !== 'pro') {
        await applyCreditMutation({ userId, amount: -cost, reason: 'YouTube Decoder', idempotencyKey: `youtube-decoder:${userId}:${videoId}:${selectedChapterIds.sort().join(',')}`, tier });
      }
      
      res.json({ valid: true, videoId, courseData: finalCourseData, savedId });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerYoutubeRoutes(app: any): void {
  const router = Router();
  router.post('/fetch-chapters', requireAuth, async (req: Request, res: Response) => { await fetchChaptersHandler(req, res); });
  router.post('/decode', requireAuth, async (req: Request, res: Response) => { await decodeYoutubeHandler(req, res); });
  app.use('/api/youtube', router);
}
