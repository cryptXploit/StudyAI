'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTokens } from '@/hooks/useTokens';
import { ShieldAlert, Loader2, Sparkles } from 'lucide-react';

export default function RequirePro({ children }: { children: React.ReactNode }) {
  const { tier, isLoading } = useTokens();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (tier !== 'PRO') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-slate-950 border border-slate-800 rounded-3xl mt-4 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>
        
        <ShieldAlert size={80} className="text-slate-700 mb-6 z-10" />
        <h2 className="text-3xl font-black text-white mb-3 z-10 tracking-tight">PRO Tier Exclusive</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8 z-10 font-medium leading-relaxed">
          This superpower is reserved for our PRO members. Upgrade your workspace to unlock this and many other advanced features!
        </p>
        
        <button 
          onClick={() => router.push('/pricing')}
          className="z-10 px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 font-black rounded-xl shadow-xl flex items-center gap-2 transition-transform active:scale-95"
        >
          <Sparkles size={18} /> View Pricing Plans
        </button>
      </div>
    );
  }

  // If user is PRO, render the actual page content
  return <>{children}</>;
}
