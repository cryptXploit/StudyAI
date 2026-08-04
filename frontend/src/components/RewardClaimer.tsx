'use client';
import React, { useEffect, useState } from 'react';
import { Gift, X, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthContext';
import Link from 'next/link';
import confetti from 'canvas-confetti';

// 🟢 FIXED: Module-level global lock to survive React 18 Strict Mode unmount/remount cycles
let isClaimingGlobal = false;

export default function RewardClaimer() {
  const { dailyDripReward, clearDailyDripReward } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rewardData, setRewardData] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const claimPendingRewards = async () => {
      const pendingRoom = localStorage.getItem('pending_reward_room');
      const pendingScore = localStorage.getItem('pending_reward_score');
      
      // 🟢 FIXED: Prevent double firing. If already processing or empty, abort immediately!
      if (!pendingRoom || isClaimingGlobal) return;
      
      isClaimingGlobal = true; // Lock the execution
      setLoading(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            isClaimingGlobal = false; // Release lock if not logged in
            return; 
        }

        let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
        const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/claim` : `${apiUrlBase}/api/rewards/claim`;

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ roomCode: pendingRoom, score: Number(pendingScore) })
        });
        
        const data = await res.json();
        
        if (data.success) {
          if (data.alreadyClaimed) {
             setRewardData({ type: 'already_claimed' });
          } else {
             setRewardData({ type: 'new', tokens: data.tokens });
          }
          // Clear local storage so it never fires again
          localStorage.removeItem('pending_reward_room');
          localStorage.removeItem('pending_reward_score');
        }
      } catch (error) {
        console.error("Reward claim failed", error);
      } finally {
        setLoading(false);
        // Release the lock after 2 seconds to ensure StrictMode's shadow-render doesn't bypass it
        setTimeout(() => { isClaimingGlobal = false; }, 2000); 
      }
    };

    claimPendingRewards();
  }, []);

  useEffect(() => {
    if (dailyDripReward) {
      // Trigger confetti!
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors });
      setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors }), 1000);
      
      // Auto vanish after 8 seconds
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('tokenUpdate', { detail: { tokens: dailyDripReward.tokens } }));
        clearDailyDripReward();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [dailyDripReward]);

  if (loading) return null; 
  
  if (dailyDripReward) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-lg p-4 animate-in fade-in duration-500">
        <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 p-8 md:p-12 rounded-[2.5rem] shadow-[0_0_80px_rgba(79,70,229,0.3)] max-w-sm w-full text-center relative border border-indigo-400/30 animate-in zoom-in-75 slide-in-from-bottom-12 duration-700 overflow-hidden transform hover:scale-[1.02] transition-transform">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[80px] opacity-60 animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-pulse animation-delay-2000"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-28 h-28 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white rounded-full flex flex-col items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.6)] transform hover:scale-110 hover:rotate-3 transition-all duration-300">
              <span className="text-4xl font-black mb-1">🔥</span>
              <span className="text-sm font-black uppercase tracking-widest text-orange-50">Day {dailyDripReward.streak}</span>
            </div>
            
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400 mb-2 tracking-tight">Streak Bonus!</h2>
            <p className="text-indigo-200 font-medium mb-8 text-lg">You've logged in for <strong className="text-white font-black">{dailyDripReward.streak}</strong> consecutive days.</p>
            
            <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8 transform hover:scale-105 hover:bg-white/10 transition-all duration-300 shadow-inner group">
              <p className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                <Gift size={14} className="group-hover:animate-bounce" /> 
                Tokens Unlocked
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">+{dailyDripReward.tokens}</span>
                <span className="text-2xl font-black text-emerald-500/50">✨</span>
              </div>
            </div>
            
            <Link href="/quests" onClick={(e) => {
              window.dispatchEvent(new CustomEvent('tokenUpdate', { detail: { tokens: dailyDripReward.tokens } }));
              clearDailyDripReward();
            }} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:shadow-[0_0_30px_rgba(52,211,153,0.6)] transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group">
              <span className="text-lg tracking-wide">Continue to Quests</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <button onClick={() => {
              window.dispatchEvent(new CustomEvent('tokenUpdate', { detail: { tokens: dailyDripReward.tokens } }));
              clearDailyDripReward();
            }} className="mt-4 text-xs font-bold text-indigo-300/50 hover:text-indigo-300 uppercase tracking-widest transition-colors">
              Tap to close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!rewardData) return null;

  // UI For Security (Duplicate Claim Attempt)
  if (rewardData.type === 'already_claimed') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center relative animate-in zoom-in-95">
          <button onClick={() => setRewardData(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
          <div className="w-20 h-20 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Already Secured! 🛡️</h2>
          <p className="text-slate-500 font-medium mb-8">You have already secured your Aura rewards for this specific battle. No duplicate claims allowed.</p>
          <button onClick={() => setRewardData(null)} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all active:scale-95">
            Understood
          </button>
        </div>
      </div>
    );
  }

  // UI For New Reward
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full text-center relative animate-in zoom-in-95 slide-in-from-bottom-10">
        <button onClick={() => setRewardData(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Gift size={48} className="animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Congratulations! 🎉</h2>
        <p className="text-slate-500 font-medium mb-6">You've successfully secured your Battle Arena rewards and it is added to your account!</p>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Aura Earned</p>
          <p className="text-5xl font-black text-emerald-500">+{rewardData.tokens}</p>
        </div>
        <button onClick={() => setRewardData(null)} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all active:scale-95">
          Awesome!
        </button>
      </div>
    </div>
  );
}
