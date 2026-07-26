'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/providers/I18nContext';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

function SignUpForm() {
  const { t, language, setLanguage } = useI18n();
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const referralCode = searchParams.get('ref');
  const referralContext = searchParams.get('context'); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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
        email,
        password,
        options: {
          data: { full_name: fullName, tier: 'Free' },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      setMessage({
        type: 'success',
        text: 'Registration successful! Please check your email to confirm your account.',
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20 mb-1">
            <span className="text-2xl font-bold text-white">P</span>
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Awesome!</h3>
              <p className="text-emerald-400 font-medium">Registration successful.</p>
              <p className="text-gray-400 text-sm">Please check your email to confirm your account and get started.</p>
              <Link href="/login" className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors">
                Go to Login
              </Link>
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
