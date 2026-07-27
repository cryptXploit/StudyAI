'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthContext';
import { useI18n } from '@/components/providers/I18nContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, isLoading, error: authError } = useAuth();
  const { t, language, setLanguage } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const confirmationStatus = searchParams.get('confirmation');
  const passwordResetStatus = searchParams.get('passwordReset');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await signIn(email.trim().toLowerCase(), password);
      router.push(redirectTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(
        message === 'Invalid login credentials'
          ? 'Email or password did not match. If you just confirmed your email, use Forgot password to set a new password, then sign in.'
          : message
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign in failed';
      setError(message);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col relative overflow-hidden font-sans">
      
      {/* Background Animated Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-indigo-500/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-600/10 rounded-full blur-[120px]" 
        />
      </div>

      {/* Language Toggle */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-6 right-6 z-20 flex gap-2 bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10"
      >
        <button
          onClick={() => setLanguage('en')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            language === 'en'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('bn')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            language === 'bn'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          বাংলা
        </button>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 z-10 w-full">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-[420px]"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="text-center mb-4 space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20 mb-1">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-gray-400">Enter your details to access your account</p>
          </motion.div>

          {/* Login Form Container */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative"
          >
            {confirmationStatus === 'success' && (
              <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Your email has been confirmed. Sign in to start using Prepia.</p>
              </div>
            )}{passwordResetStatus === 'success' && (
              <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Your password was updated. Sign in with your new password.</p>
              </div>
            )}

            {confirmationStatus === 'failed' && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                This confirmation link is invalid or has expired. Please request a new confirmation email.
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-5">
              
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 ml-1">
                  {t('auth.email')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-[#0B0F19]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-sm font-medium text-gray-300">
                    {t('auth.password')}
                  </label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3.5 bg-[#0B0F19]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Error Messages */}
              <AnimatePresence>
                {(error || authError) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 mt-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                      <div className="w-1.5 h-full absolute left-0 bg-red-500 rounded-l-xl"></div>
                      <p className="text-red-400 text-sm font-medium">
                        {error || authError}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign In Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                style={{ boxShadow: '0 4px 20px -5px rgba(79, 70, 229, 0.4)' }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {t('auth.login')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-medium">
                <span className="bg-[#0f1423] px-4 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-3.5 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M24 12.27c0-.84-.08-1.65-.21-2.43H12v4.61h6.73c-.3 1.5-1.18 2.76-2.44 3.61v3h3.94C22.54 18.94 24 15.89 24 12.27z" />
                <path fill="#34A853" d="M12 24c3.37 0 6.2-1.11 8.27-3.03l-3.94-3c-1.12.75-2.55 1.2-4.33 1.2-3.32 0-6.14-2.24-7.14-5.26H.78v3.1A11.99 11.99 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M4.86 16.91c-.26-.77-.41-1.6-.41-2.46s.15-1.69.41-2.46V8.89H.78C.28 9.88 0 11.01 0 12.25c0 1.24.28 2.37.78 3.36l4.08-3.17z" />
                <path fill="#4285F4" d="M12 4.77c1.83 0 3.48.63 4.77 1.87l3.58-3.58C18.2 1.15 15.37 0 12 0 7.72 0 3.86 2.44 1.78 6.04l4.08 3.16C6.86 6.19 9.13 4.77 12 4.77z" />
              </svg>
              Google
            </motion.button>
          </motion.div>

          {/* Footer Link */}
          <motion.p variants={itemVariants} className="text-center text-gray-400 mt-8 text-sm">
            {language === 'en'
              ? "Don't have an account? "
              : 'অ্যাকাউন্ট নেই? '}
            <Link href="/signup" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              {t('auth.signup')}
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><LoginPageContent /></Suspense>;
}
