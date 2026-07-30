import { Request, Response, Router } from 'express';
import { ModelRouter } from '../ai/ModelRouter';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { YoutubeTranscript } from 'youtube-transcript';
// @ts-ignore
import { getSubtitles } from 'youtube-captions-scraper';
import { TOKEN_COSTS } from '../config/tokenCosts';

async function getTranscript(videoId: string) {
  const languagesToTry = ['en', 'bn', 'hi', 'ur', 'es'];
  
  for (const lang of languagesToTry) {
    try {
      const transcriptList = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (transcriptList && transcriptList.length > 0) {
        console.log(`Successfully fetched transcript for ${videoId} in language: ${lang}`);
        return transcriptList;
      }
    } catch (err: any) {
      console.log(`Failed to fetch transcript in ${lang} for ${videoId}. Trying next...`);
    }
  }

  // Absolute last resort fallback using the scraper
  try {
    console.warn(`All YoutubeTranscript native languages failed for ${videoId}, trying scraper...`);
    const captions = await getSubtitles({ videoID: videoId, lang: 'en' });
    return captions.map((cap: any) => ({
      text: cap.text,
      offset: parseFloat(cap.start) * 1000,
      duration: parseFloat(cap.dur) * 1000
    }));
  } catch (scraperErr) {
    throw new Error('Captions genuinely disabled or IP blocked by YouTube.');
  }
}


import { applyCreditMutation } from '../services/creditLedger.service';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    // 🟢 FRAGMENTED DATA JOINING
    const finalCourseData = {
      title: `Crash Course: Parts (${targetChapters.map(c => c.timeLabel).join(', ')})`,
      summary: `Compiled notes containing ${targetChapters.length} video segments.`,
      markdownContent: processedChunks.map(chunk => `### ${chunk.title}\n\n${chunk.markdownContent}`).join('\n\n---\n\n')
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
