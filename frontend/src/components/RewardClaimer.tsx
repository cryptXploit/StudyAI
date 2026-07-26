'use client';
import React, { useEffect, useState } from 'react';
import { Gift, X, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// 🟢 FIXED: Module-level global lock to survive React 18 Strict Mode unmount/remount cycles
let isClaimingGlobal = false;

export default function RewardClaimer() {
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

  if (loading) return null; 
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
