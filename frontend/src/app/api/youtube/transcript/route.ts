import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { videoUrl } = await req.json();
    const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
    if (!videoIdMatch) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    const videoId = videoIdMatch[1];
    
    // Fetch directly from YouTube web client
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' }
    });
    
    if (!res.ok) {
       return NextResponse.json({ error: 'Failed to fetch from YouTube. Edge IP might be blocked.' }, { status: 400 });
    }

    const html = await res.text();
    const captionTracksMatch = html.match(/"captionTracks":(\[.*?\])/);
    
    if (!captionTracksMatch) {
       return NextResponse.json({ error: 'Captions are disabled or unavailable for this video.' }, { status: 400 });
    }
    
    const captionTracks = JSON.parse(captionTracksMatch[1]);
    
    // Find preferred language or fallback to first
    let track = captionTracks.find((t: any) => t.languageCode === 'en' || t.languageCode === 'bn' || t.languageCode === 'hi');
    if (!track) track = captionTracks[0];
    
    const xmlRes = await fetch(track.baseUrl);
    const xmlText = await xmlRes.text();
    
    const textNodes = [...xmlText.matchAll(/<text start="([^"]+)" dur="([^"]+)".*?>([^<]*)<\/text>/g)];
    const transcriptList = textNodes.map(m => ({
      offset: parseFloat(m[1]) * 1000,
      duration: parseFloat(m[2]) * 1000,
      text: m[3].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    }));
    
    return NextResponse.json({ transcriptList, videoId });
  } catch(e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch transcript from Vercel edge' }, { status: 500 });
  }
}
