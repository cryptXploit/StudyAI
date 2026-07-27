import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const flow = searchParams.get('flow');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const failurePath = flow === 'recovery'
        ? '/forgot-password?reset=expired'
        : '/login?confirmation=failed';
      return NextResponse.redirect(new URL(failurePath, request.url));
    }

    // Email sign-up confirmation should show a clear success state and let the
    // user sign in deliberately. OAuth continues to use the dashboard redirect.
    if (flow === 'signup') {
      await supabase.auth.signOut({ scope: 'local' });
      return NextResponse.redirect(new URL('/login?confirmation=success', request.url));
    }

    if (flow === 'recovery') {
      return NextResponse.redirect(new URL('/reset-password', request.url));
    }
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}