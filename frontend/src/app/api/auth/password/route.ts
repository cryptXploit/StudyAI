import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const json = (body: Record<string, string>, status: number) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ message: 'Invalid request origin.' }, 403);
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return json({ message: 'Invalid request.' }, 400);
  }

  if (typeof password !== 'string' || password.length < 6) {
    return json({ message: 'Use a password with at least 6 characters.' }, 400);
  }

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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ message: 'Your reset session has expired. Request a new password reset link.' }, 401);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('Password update failed for authenticated user', error.message);
    return json({ message: 'Unable to update your password. Request a new reset link and try again.' }, 400);
  }

  return json({ message: 'Password updated.' }, 200);
}