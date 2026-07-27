import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!tokenHash || (type !== 'email' && type !== 'recovery')) {
    const fallback = type === 'recovery'
      ? '/forgot-password?reset=expired'
      : '/login?confirmation=failed';
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  // Do not consume the one-time token on GET. Mail-security scanners often
  // pre-open links; verification happens only after an intentional user action.
  const destination = new URL('/auth/verify', request.url);
  destination.searchParams.set('token_hash', tokenHash);
  destination.searchParams.set('type', type);
  return NextResponse.redirect(destination);
}