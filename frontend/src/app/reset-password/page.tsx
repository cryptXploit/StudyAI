'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type RecoveryState = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    const validateRecoverySession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !session) {
        setRecoveryState('invalid');
        setMessage({
          type: 'error',
          text: 'This password reset link is invalid, expired, or has already been used. Request a new link.',
        });
        return;
      }

      setRecoveryState('ready');
    };

    void validateRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setRecoveryState('ready');
        setMessage(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Use a password with at least 6 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'The two passwords do not match.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Unable to update your password.');
      }

      await supabase.auth.signOut({ scope: 'local' });
      setMessage({ type: 'success', text: 'Password updated. Redirecting to login…' });
      window.setTimeout(() => router.replace('/login?passwordReset=success'), 1200);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to update your password. Please request a new link.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">Set New Password</h2>
          <p className="mt-2 text-sm text-slate-600">Choose a new secure password for your Prepia account.</p>
        </div>

        {recoveryState === 'checking' ? (
          <p className="text-center text-sm text-slate-600">Verifying your secure reset link…</p>
        ) : recoveryState === 'invalid' ? (
          <div className="space-y-4">
            {message && (
              <div className="p-4 rounded-xl text-sm bg-red-50 text-red-700">{message.text}</div>
            )}
            <Link
              href="/forgot-password"
              className="block w-full text-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              Request a New Reset Link
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
            <div>
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isLoading}
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}