// This Page is for the Wow Popup that appears when a user successfully claims a referral bonus. It is triggered by the `referralReward` state in the AuthContext.

'use client';
import React from 'react';
import { useAuth } from '@/components/providers/AuthContext';
import { Gift, X, Sparkles, PartyPopper } from 'lucide-react';

export default function ReferralWelcomeModal() {
  const { referralReward, clearReferralReward } = useAuth();

  if (!referralReward) return null;

  // ব্যাকএন্ডের মেসেজ থেকে টোকেন অ্যামাউন্ট (যেমন: 100) ফিল্টার করে বের করা
  const tokenAmountMatch = referralReward.message.match(/\d+/);
  const tokenAmount = tokenAmountMatch ? tokenAmountMatch[0] : '100';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10">
        
        {/* Aesthetic Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <button 
          onClick={clearReferralReward} 
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-2 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <Gift size={48} className="animate-bounce relative z-10" />
          <PartyPopper size={24} className="absolute -top-2 -right-2 text-amber-500 animate-pulse" />
          <Sparkles size={24} className="absolute -bottom-2 -left-2 text-teal-500 animate-pulse" />
        </div>

        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Welcome Bonus!</h2>
        <p className="text-slate-500 font-medium mb-6 leading-relaxed">
          You joined via a friend's referral link. We’ve added a special welcome gift to your account!
        </p>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6 mb-8 shadow-inner">
          <p className="text-xs font-black text-emerald-500/70 uppercase tracking-widest mb-1">Aura Unlocked</p>
          <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
            +{tokenAmount}
          </p>
        </div>

        <button 
          onClick={clearReferralReward} 
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
        >
          Awesome, Let's Go! <Sparkles size={18} />
        </button>
      </div>
    </div>
  );
}
