'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthContext';
import { useI18n } from '@/components/providers/I18nContext';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

function SignUpForm() {
  const { t, language, setLanguage } = useI18n();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const referralCode = searchParams.get('ref');
  const referralContext = searchParams.get('context'); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (referralCode) {
      localStorage.setItem('referral_code', referralCode);
    }
    if (referralContext) {
      localStorage.setItem('referral_context', referralContext);
    }
  }, [referralCode, referralContext]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName, tier: 'Free' },
          // Keep email-confirmation UX separate from OAuth sign-in callbacks.
          emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup`,
        },
      });

      if (error) throw error;
      
      setMessage({
        type: 'success',
        text: 'Registration successful! Please check your email to confirm your account.',
      });
    } catch (error: any) {
      // A browser can lose the final Auth response after Supabase has already
      // accepted the signup and queued the confirmation email. Do not expose a
      // technical browser error to the user in that case.
      if (error?.message === 'Failed to fetch') {
        setMessage({
          type: 'error',
          text: 'We could not confirm the final response. If you received a confirmation email, your account was created—please open the link in that email.',
        });
      } else {
        setMessage({ type: 'error', text: error?.message || 'Unable to create your account. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup`,
        }
      });
      if (error) throw error;
      setResendCooldown(60); // 60 seconds cooldown
    } catch (error: any) {
      // Ignore or show small toast
    } finally {
      setIsResending(false);
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
    <>
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

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-[420px] z-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="text-center mb-4 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl shadow-xl shadow-indigo-500/20 mb-1 overflow-hidden">
             <img src="/icon.svg" alt="Prepia Logo" className="w-full h-full object-cover scale-125" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {t('auth.signup')}
          </h2>
          <p className="text-gray-400">Create your new Prepia account</p>
        </motion.div>
        
        {/* Signup Form Container */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative"
        >
          {message?.type === 'success' ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
              className="py-10 flex flex-col items-center justify-center text-center space-y-5"
            >
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  boxShadow: ["0 0 0 0 rgba(16, 185, 129, 0)", "0 0 0 20px rgba(16, 185, 129, 0.1)", "0 0 0 0 rgba(16, 185, 129, 0)"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4"
              >
                <Mail className="w-12 h-12 text-emerald-400" />
              </motion.div>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white">Check Your Inbox!</h3>
                <p className="text-emerald-400 font-semibold text-lg">We just sent a confirmation link to</p>
                <p className="text-white font-bold bg-white/10 px-4 py-2 rounded-lg inline-block">{email}</p>
              </div>
              
              <p className="text-gray-400 text-sm max-w-sm mt-4 leading-relaxed">
                You must click the link in that email to activate your account before you can log in. If you don't see it, check your spam folder.
              </p>
              
              <div className="flex flex-col w-full gap-3 mt-6 pt-6 border-t border-white/10">
                <Link href="/login" className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                  I have confirmed my email <ArrowRight size={18} />
                </Link>
                
                <button 
                  onClick={handleResendEmail} 
                  disabled={isResending || resendCooldown > 0}
                  className="w-full px-6 py-3 bg-transparent hover:bg-white/5 border border-white/10 text-gray-300 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <><Loader2 className="animate-spin" size={16} /> Sending...</>
                  ) : resendCooldown > 0 ? (
                    `Resend Email (${resendCooldown}s)`
                  ) : (
                    `Send Again`
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <form className="space-y-5" onSubmit={handleSignUp}>
              
              {/* Full Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text" required
                    value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isLoading}
                    placeholder="John Doe"
                    className="w-full pl-11 pr-4 py-3.5 bg-[#0B0F19]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

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
                    type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-[#0B0F19]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300 ml-1">
                  {t('auth.password')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3.5 bg-[#0B0F19]/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {message?.type === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 mt-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                      <div className="w-1.5 h-full absolute left-0 bg-red-500 rounded-l-xl"></div>
                      <p className="text-red-400 text-sm font-medium">
                        {message.text}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign Up Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isLoading} 
                className="w-full flex justify-center items-center gap-2 py-3.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all mt-4 group"
                style={{ boxShadow: '0 4px 20px -5px rgba(79, 70, 229, 0.4)' }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {t('auth.signup')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>
          )}
        </motion.div>

        {/* Footer Link */}
        <motion.div variants={itemVariants} className="text-center mt-8">
          <span className="text-sm text-gray-400">Already have an account? </span>
          <Link href="/login" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            {t('auth.login')}
          </Link>
        </motion.div>
      </motion.div>
    </>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center relative overflow-hidden font-sans px-4">
      
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

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center space-y-4 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <div className="text-indigo-400 font-medium">Loading form...</div>
        </div>
      }>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
