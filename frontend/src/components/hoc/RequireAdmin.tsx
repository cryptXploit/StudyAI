'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Client-side defence-in-depth for every admin page.
 *
 * API routes and Supabase RLS remain the source of authority.  This guard
 * prevents an unauthenticated or non-admin visitor from seeing the admin UI
 * while those server-side checks are taking place.
 */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifyAdmin = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .maybeSingle();

      // Fail closed: an RLS/database error must never expose an admin page.
      if (error || !profile?.is_admin) {
        router.replace('/dashboard');
        return;
      }

      if (mounted) setIsAuthorized(true);
    };

    void verifyAdmin();
    return () => { mounted = false; };
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950" aria-label="Checking access">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  return <>{children}</>;
}
