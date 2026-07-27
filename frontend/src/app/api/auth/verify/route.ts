import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return errorResponse('Invalid request origin.', 403);
  }

  let tokenHash: unknown;
  let type: unknown;
  try {
    ({ tokenHash, type } = await request.json());
  } catch {
    return errorResponse('Invalid verification request.', 400);
  }

  if (typeof tokenHash !== 'string' || (type !== 'email' && type !== 'recovery')) {
    return errorResponse('This verification link is invalid or expired.', 400);
  }

  const redirect = type === 'recovery' ? '/reset-password' : '/login?confirmation=success';
  const response = NextResponse.json({ redirect }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    return errorResponse('This link is invalid, expired, or has already been used. Request a new one.', 400);
  }

  if (type === 'email') {
    await supabase.auth.signOut({ scope: 'local' });
  }

  return response;
}