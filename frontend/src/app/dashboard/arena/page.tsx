'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { useAuth } from '@/components/providers/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Castle, Shield, Trophy, Users, Share2, Crown, ChevronRight, Zap, Target, Lock, Loader2 } from 'lucide-react';

// --- Top BD Universities Mock List ---
const UNIVERSITIES = ["BUET", "Dhaka University (DU)", "Rajshahi University (RU)", "BRAC University", "North South University (NSU)", "Notre Dame College (NDC)", "Dhaka College"];
const DEPARTMENTS = ["CSE", "EEE", "Pharmacy", "BBA", "Physics", "Mechanical", "ICE", "Civil", "Zoology", "Mathematics", "Botany", "Commerce", "Science (HSC)"];
const BATCHES = ["1st Year / 24", "2nd Year / 23", "3rd Year / 22", "4th Year / 21"];

// --- Mock Leaderboard Data (Fallback) ---
const MOCK_NATIONAL_RANKING = [
  { rank: 1, name: "BUET", score: 145200 },
  { rank: 2, name: "Dhaka University (DU)", score: 132450 },
  { rank: 3, name: "North South University", score: 98300 },
  { rank: 4, name: "BRAC University", score: 87500 },
];

const MOCK_GUILD_RANKING = [
  { rank: 1, name: "BUET_CSE_23", score: 45000, members: 120 },
  { rank: 2, name: "BUET_EEE_23", score: 42100, members: 105 },
  { rank: 3, name: "BUET_CSE_24", score: 38000, members: 95 },
];

export default function CampusArenaPage() {
  const { user, session } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [hasGuild, setHasGuild] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Form States
  const [uni, setUni] = useState('');
  const [dept, setDept] = useState('');
  const [batch, setBatch] = useState('');

  useEffect(() => {
    checkUserGuild();
    fetchReferralCode();
  }, [user]);

  const fetchReferralCode = async () => {
    if (!session) return;
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/referral` : `${apiUrlBase}/api/rewards/referral`;
      const res = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.referralCode) setReferralCode(data.referralCode);
    } catch (err) {
      console.error("Failed to fetch referral code:", err);
    }
  };

  const checkUserGuild = async () => {
    if (!user) return;
    setIsLoading(true);
    // 🟢 Real DB Check
    const { data, error } = await supabase.from('user_guild_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setHasGuild(true);
    setIsLoading(false);
  };

  const handleJoinGuild = async () => {
    if (!uni || !dept || !batch) return;
    setIsJoining(true);

    try {
      // 🟢 Calling the Zero-Cost RPC Function
      const { data, error } = await supabase.rpc('join_campus_guild', {
        p_university: uni,
        p_department: dept,
        p_batch: batch
      });

      if (!error) {
        setHasGuild(true);
      } else {
        // Fallback for UI demonstration if DB not yet updated
        setTimeout(() => setHasGuild(true), 1500); 
      }
    } catch (err) {
      setTimeout(() => setHasGuild(true), 1500);
    }
    setIsJoining(false);
  };

  const shareToWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://Prepia.com';
    const inviteLink = `${origin}/signup?ref=${referralCode}&context=arena_invite`;
    const text = `🔥 Our Department is falling behind on the Prepia Leaderboard! Log in, join our Guild, and let's crush the rival departments! 🏆 Join here: ${inviteLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isLoading) {
    return (
      <SecureLayout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-amber-500" size={40} />
        </div>
      </SecureLayout>
    );
  }

  return (
    <SecureLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans space-y-8">
        
        {/* ============================================================== */}
        {/* 🛑 STATE 1: NOT JOINED (THE TRAP) */}
        {/* ============================================================== */}
        {!hasGuild && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="bg-slate-950 p-8 md:p-12 rounded-[3rem] shadow-2xl border-4 border-amber-500/20 max-w-2xl w-full text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>
              
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                <Shield size={40} className="text-white fill-white" />
              </div>
              
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Claim Your Allegiance</h1>
              <p className="text-amber-400 font-bold mb-8">Join your Campus Faction now to claim <span className="bg-amber-500/20 px-2 py-1 rounded text-amber-300">500 Bonus Karma</span> and unlock the National Leaderboards!</p>

              <div className="space-y-4 text-left mb-8">
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-1">University / College</label>
                  <select value={uni} onChange={e => setUni(e.target.value)} className="w-full mt-1 p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white focus:border-amber-500 outline-none">
                    <option value="">Select your battlefield...</option>
                    {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-1">Department</label>
                    <select value={dept} onChange={e => setDept(e.target.value)} className="w-full mt-1 p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white focus:border-amber-500 outline-none">
                      <option value="">Select Dept...</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 ml-1">Batch / Year</label>
                    <select value={batch} onChange={e => setBatch(e.target.value)} className="w-full mt-1 p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white focus:border-amber-500 outline-none">
                      <option value="">Select Year...</option>
                      {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button onClick={handleJoinGuild} disabled={!uni || !dept || !batch || isJoining} className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black uppercase tracking-widest rounded-2xl text-lg hover:scale-[1.02] active:scale-95 transition-transform shadow-[0_10px_30px_rgba(245,158,11,0.3)] disabled:opacity-50">
                {isJoining ? <Loader2 className="animate-spin mx-auto" /> : 'Forge My Guild'}
              </button>
            </div>
          </motion.div>
        )}


        {/* ============================================================== */}
        {/* 🏆 STATE 2: THE ARENA VIEW (PREMIUM DASHBOARD) */}
        {/* ============================================================== */}
        {hasGuild && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            
            {/* 🟢 HERO FACTION BANNER */}
            <div className="bg-slate-950 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden border border-amber-500/30">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Castle size={200}/></div>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.5)] border-4 border-slate-900">
                    <Shield size={40} className="text-white fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase px-2 py-1 rounded border border-amber-500/30">Your Faction</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight">{uni ? `${uni.split(' ')[0]}_${dept}_${batch.split(' ')[0]}` : 'BUET_CSE_24'}</h1>
                    <p className="text-slate-400 font-bold flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1"><Users size={16}/> 120 Members</span>
                      <span className="flex items-center gap-1 text-emerald-400"><Zap size={16}/> Rank #3 Active</span>
                    </p>
                  </div>
                </div>

                {/* THE VIRAL HOOK BUTTON */}
                <button onClick={shareToWhatsApp} className="relative group bg-green-500 hover:bg-green-400 text-slate-950 font-black px-6 py-4 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all active:scale-95 w-full md:w-auto justify-center">
                  <Share2 size={20} />
                  <span className="uppercase tracking-widest text-xs">Rally The Guild</span>
                  <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] px-2 py-1 rounded-full animate-bounce">URGENT</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* 🟢 NATIONAL RANKING (EGO HOOK) */}
              <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-800">
                <h2 className="text-2xl font-black text-slate-200 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Trophy size={20}/></div>
                  National Supremacy
                </h2>
                
                <div className="space-y-3">
                  {MOCK_NATIONAL_RANKING.map((uni, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${idx === 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400'}`}>
                          {idx === 0 ? <Crown size={16} className="text-amber-400 fill-amber-400"/> : `#${uni.rank}`}
                        </span>
                        <span className={`font-black text-sm md:text-base ${idx === 0 ? 'text-indigo-900' : 'text-slate-300'}`}>{uni.name}</span>
                      </div>
                      <span className="font-bold text-slate-500 text-sm bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 shadow-sm">{uni.score.toLocaleString()} XP</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🟢 DEPARTMENTAL GUILDS (RIVALRY HOOK) */}
              <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-800">
                <h2 className="text-2xl font-black text-slate-200 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Target size={20}/></div>
                  Campus Rivals
                </h2>
                
                <div className="space-y-3">
                  {MOCK_GUILD_RANKING.map((guild, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${idx === 2 ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-500/20' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-400 w-4 text-center">#{guild.rank}</span>
                        <div>
                          <h4 className={`font-black text-sm md:text-base ${idx === 2 ? 'text-amber-700' : 'text-slate-300'}`}>{guild.name} {idx === 2 && '(You)'}</h4>
                          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Users size={12}/> {guild.members} Warriors</p>
                        </div>
                      </div>
                      <span className={`font-black text-sm px-3 py-1 rounded-lg ${idx === 2 ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {guild.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 🟢 PREMIUM BAIT: SPY ON RIVALS */}
                <div className="mt-6 bg-slate-900 rounded-2xl p-6 relative overflow-hidden group border border-slate-800 flex items-center justify-between">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>
                  <div className="relative z-10">
                    <h4 className="text-white font-black mb-1 flex items-center gap-2"><Lock size={16} className="text-rose-400"/> Spy on Rivals</h4>
                    <p className="text-slate-400 text-xs font-medium">See exactly which PDFs #1 Rank is studying right now.</p>
                  </div>
                  <button 
                    onClick={() => router.push('/pricing')}
                    className="relative z-10 bg-slate-900/10 hover:bg-slate-900/20 text-white text-[10px] uppercase tracking-widest font-black px-4 py-2 rounded-xl transition-colors border border-white/10"
                  >
                    Unlock Pro
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </div>
    </SecureLayout>
  );
}
