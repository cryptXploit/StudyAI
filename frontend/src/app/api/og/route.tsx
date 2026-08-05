import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Fallback values
    const hasTitle = searchParams.has('title');
    const title = hasTitle ? searchParams.get('title')?.slice(0, 100) : 'Prepia AI';
    
    const hasSubtitle = searchParams.has('subtitle');
    const subtitle = hasSubtitle ? searchParams.get('subtitle')?.slice(0, 60) : 'The #1 AI Study Operating System';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#020617', // slate-950
            backgroundImage: 'radial-gradient(circle at 25px 25px, #10b981 2%, transparent 0%), radial-gradient(circle at 75px 75px, #10b981 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            fontFamily: 'sans-serif',
            color: 'white',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          {/* Logo / Icon Area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '120px',
              height: '120px',
              backgroundColor: '#059669', // emerald-600
              borderRadius: '30px',
              marginBottom: '40px',
              boxShadow: '0 0 80px rgba(16, 185, 129, 0.4)',
            }}
          >
            <span style={{ fontSize: '60px', fontWeight: '900', color: 'white' }}>AI</span>
          </div>
          
          <div
            style={{
              fontSize: '80px',
              fontWeight: '900',
              letterSpacing: '-0.05em',
              marginBottom: '20px',
              lineHeight: 1.1,
              padding: '0 40px',
              background: 'linear-gradient(to right, #ffffff, #94a3b8)', // text-white to text-slate-400
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {title}
          </div>
          
          <div
            style={{
              fontSize: '36px',
              fontWeight: '600',
              color: '#34d399', // emerald-400
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </div>
          
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span style={{ fontSize: '24px', color: '#94a3b8', fontWeight: 'bold' }}>prepia.app</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Image Generation Error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
