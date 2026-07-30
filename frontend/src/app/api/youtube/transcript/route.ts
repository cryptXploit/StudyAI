import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(req: Request) {
  try {
    const { videoUrl } = await req.json();
    const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
    if (!videoIdMatch) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    const videoId = videoIdMatch[1];
    
    let transcriptList = null;
    const languagesToTry = ['en', 'bn', 'hi', 'ur', 'es'];
    
    for (const lang of languagesToTry) {
      try {
        const result = await YoutubeTranscript.fetchTranscript(videoId, { lang });
        if (result && result.length > 0) {
          transcriptList = result;
          break;
        }
      } catch (err) {
        // Try next language
      }
    }
    
    if (!transcriptList) {
       return NextResponse.json({ error: 'Captions are disabled or unavailable for this video.' }, { status: 400 });
    }
    
    return NextResponse.json({ transcriptList, videoId });
  } catch(e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch transcript from Vercel edge' }, { status: 500 });
  }
}
