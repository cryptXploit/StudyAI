import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Request-time access gate for Next.js 16 (formerly middleware).
 * Sensitive API operations still verify the bearer token server-side, and RLS
 * still enforces authorization in Supabase. This only prevents page delivery.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedRoutes = ['/dashboard', '/chat', '/documents', '/settings', '/admin'];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const publicRoutes = ['/login', '/signup', '/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as CookieOptions);
          });
        },
      },
    }
  );

  // getUser validates the JWT with Supabase instead of trusting an unverified cookie.
  const { data: { user } } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // No admin UI response is delivered to a regular authenticated user.
  if (user && pathname.startsWith('/admin')) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (isPublicRoute && user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
