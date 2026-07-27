'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = Boolean(tokenHash) && (type === 'email' || type === 'recovery');
  const isRecovery = type === 'recovery';

  const verify = async () => {
    if (!isValid || !tokenHash) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash, type }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || 'Unable to verify this link.');
      }
      router.replace(result.redirect);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify this link.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValid) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-300">This link is invalid or expired.</p>
        <Link className="text-indigo-300 hover:text-indigo-200" href={isRecovery ? '/forgot-password' : '/login'}>
          {isRecovery ? 'Request a new password reset link' : 'Go to login'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      <h1 className="text-2xl font-bold text-white">{isRecovery ? 'Reset Your Password' : 'Confirm Your Email'}</h1>
      <p className="text-sm text-slate-300">
        {isRecovery
          ? 'Continue to securely verify this reset link and choose a new password.'
          : 'Continue to securely verify your email address.'}
      </p>
      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={verify}
        disabled={isLoading}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {isLoading ? 'Verifying…' : 'Continue Securely'}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <Suspense fallback={<p className="text-center text-slate-300">Loading secure verification…</p>}>
          <VerifyContent />
        </Suspense>
      </section>
    </main>
  );
}