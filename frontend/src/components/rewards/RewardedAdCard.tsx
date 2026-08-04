'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface AdStatus {
  success: boolean;
  maxAds: number;
  claimsToday: number;
  tokensPerAd: number;
  timerSeconds: number;
  smartlinkUrl: string;
  currentTokens: number;
}

export default function RewardedAdCard() {
  const [status, setStatus] = useState<AdStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const [adStartTime, setAdStartTime] = useState<number | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [adTicket, setAdTicket] = useState<string | null>(null);

  const supabase = createClient();
  const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiOrigin}/api/rewards/ad-status`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch ad status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isWatching && timeLeft > 0) {
      document.title = `⏳ ${timeLeft}s - Verifying Ad...`;
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isWatching && timeLeft === 0) {
      document.title = `✅ Claim Your Tokens! - StudyAI`;
      setCanClaim(true);
    } else {
      document.title = 'StudyAI - Dashboard';
    }
    
    return () => {
      clearInterval(timer);
      if (!isWatching) document.title = 'StudyAI - Dashboard';
    };
  }, [isWatching, timeLeft]);

  const triggerDopamine = () => {
    const end = Date.now() + 2 * 1000;
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleWatchAd = async () => {
    if (!status || status.claimsToday >= status.maxAds) return;
    
    // Open a blank tab synchronously to avoid popup blockers!
    const newWindow = window.open('about:blank', '_blank');
    
    try {
      // Fetch a secure cryptographic ticket from the backend
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${apiOrigin}/api/rewards/start-ad`, {
        method: 'POST',
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });
      const data = await res.json();
      
      if (!data.success) {
        if (newWindow) newWindow.close();
        toast.error('Failed to start ad securely.');
        return;
      }
      
      setAdTicket(data.ticket);
      
      // Navigate the new tab to the Adsterra link
      if (newWindow) newWindow.location.href = status.smartlinkUrl;
      
      // Start verification countdown
      setAdStartTime(Date.now());
      setIsWatching(true);
      setCanClaim(false);
      setTimeLeft(status.timerSeconds);
    } catch (e) {
      if (newWindow) newWindow.close();
      toast.error('Network error. Try again.');
    }
  };

  const claimReward = async () => {
    if (!status || !adTicket) return;
    if (!adStartTime || Date.now() - adStartTime < (status.timerSeconds * 1000)) {
      toast.error('Please watch the ad completely!');
      return;
    }

    const loadingToast = toast.loading('Claiming reward securely...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiOrigin}/api/rewards/claim-ad`, {
        method: 'POST',
        headers: session ? { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}` 
        } : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: adTicket })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message, { id: loadingToast, icon: '🎉' });
        triggerDopamine();
        setStatus(prev => prev ? { ...prev, claimsToday: data.claimsToday, currentTokens: prev.currentTokens + data.tokens } : prev);
        setIsWatching(false);
        setCanClaim(false);
        setAdStartTime(null);
        setAdTicket(null);
        
        // Dispatch a custom event to update tokens globally if needed
        window.dispatchEvent(new CustomEvent('tokenUpdate', { detail: { tokens: data.tokens } }));
      } else {
        toast.error(data.error || 'Failed to claim reward', { id: loadingToast });
      }
    } catch (e) {
      toast.error('Something went wrong. Try again later.', { id: loadingToast });
    }
  };

  if (loading || !status) return null;

  // VISIBILITY LOGIC:
  // - If max ads reached -> Hide
  // - If started watching today (claims > 0) -> Show until max ads reached
  // - If tokens < 100 -> Show warning/ad prompt
  if (status.claimsToday >= status.maxAds) return null;
  if (status.claimsToday === 0 && status.currentTokens >= 100) return null;

  const progressPercentage = (status.claimsToday / status.maxAds) * 100;

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 shadow-xl border border-indigo-500/30 mb-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background glow effects */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400 text-2xl">⚠️</span>
            <h3 className="text-xl font-bold text-white tracking-tight">Your Tokens Are Running Low!</h3>
          </div>
          <p className="text-indigo-100/80 mb-4">
            You only have <strong className="text-amber-400 font-bold">{status.currentTokens} tokens</strong> left. Watch a short ad to earn {status.tokensPerAd} free tokens instantly and keep studying without interruptions!
          </p>
          
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs font-semibold text-indigo-200 mb-1.5 uppercase tracking-wider">
              <span>Daily Ad Rewards</span>
              <span>{status.claimsToday} / {status.maxAds}</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-1000 relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0 flex flex-col items-center">
          <button
            onClick={canClaim ? claimReward : handleWatchAd}
            disabled={isWatching && !canClaim}
            className={`
              w-full md:w-auto relative group px-8 py-4 rounded-xl font-bold text-lg shadow-lg
              transition-all duration-300 transform active:scale-95
              ${(isWatching && !canClaim)
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed border border-slate-600' 
                : canClaim
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-emerald-500/25 hover:from-emerald-400 hover:to-green-400 border border-emerald-400/50 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 border border-amber-400/50'}
            `}
          >
            {isWatching && !canClaim ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying... {timeLeft}s
              </span>
            ) : canClaim ? (
              <span className="flex items-center gap-2">
                🎉 Claim {status.tokensPerAd} Tokens
              </span>
            ) : (
              <span className="flex items-center gap-2">
                ▶️ Watch Ad for {status.tokensPerAd} Tokens
              </span>
            )}
            
            {/* Hover glow effect */}
            {(!isWatching || canClaim) && (
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
          {isWatching && !canClaim && <p className="text-xs text-indigo-200 mt-3 animate-pulse">Please stay on this page while verifying...</p>}
        </div>
      </div>
    </div>
  );
}
