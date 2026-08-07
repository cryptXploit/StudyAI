'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Flame, CheckCircle2, Gift, UserCheck, CalendarDays, Loader2, Zap, Activity, Target, Settings, Share2, RefreshCcw, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const translations = {
  English: {
    headerTitle: "Daily Quests & Bounties",
    headerSubtitle: "Complete tasks to earn tokens and unlock premium AI features.",
    heatmapTitle: "Your Consistency Heatmap",
    heatmapSubtitle: "Last 52 Weeks",
    heatmapLess: "Less",
    heatmapMore: "More",
    settingsTitle: "Dream Varsity Settings",
    settingsConfig: "Configuration",
    settingsEmpty: "Select your dream university to track your preparation.",
    currentProgress: "Current Progress:",
    share: "Share",
    reset: "Reset",
    trackingMode: "Tracking Mode",
    manualControlTitle: "Manual Control",
    manualControlDesc: "Update progress manually from the dashboard widget using +XP and Skip buttons.",
    autoStreakTitle: "Auto Streak Link",
    autoStreakDesc: "Progress is automatically calculated based on your daily activity streak.",
    dailyLoginTitle: "Daily Login Drip",
    dayStreak: "Day Streak",
    dailyLoginDesc: "Log in every day to claim your daily free tokens.",
    claimedToday: "Claimed for Today",
    claim30Tokens: "Claim 30 Tokens",
    completeProfileTitle: "Complete Profile",
    completeProfileDesc: "Add your university details, country, and DOB.",
    bountyClaimed: "Bounty Claimed",
    goToProfile: "Go to Profile",
    claim100Tokens: "Claim 100 Tokens",
    tasksOn: "tasks on"
  },
  Bangla: {
    headerTitle: "দৈনিক কোয়েস্ট ও বাউন্টি",
    headerSubtitle: "টোকেন অর্জন করতে এবং প্রিমিয়াম এআই ফিচার আনলক করতে টাস্ক সম্পূর্ণ করুন।",
    heatmapTitle: "আপনার ধারাবাহিকতা হিটম্যাপ",
    heatmapSubtitle: "গত ৫২ সপ্তাহ",
    heatmapLess: "কম",
    heatmapMore: "বেশি",
    settingsTitle: "স্বপ্নের ভার্সিটি সেটিংস",
    settingsConfig: "কনফিগারেশন",
    settingsEmpty: "আপনার প্রস্তুতির ট্র্যাকিং করতে স্বপ্নের ভার্সিটি নির্বাচন করুন।",
    currentProgress: "বর্তমান অগ্রগতি:",
    share: "শেয়ার",
    reset: "রিসেট",
    trackingMode: "ট্র্যাকিং মোড",
    manualControlTitle: "ম্যানুয়াল কন্ট্রোল",
    manualControlDesc: "ড্যাশবোর্ড উইজেট থেকে +XP এবং স্কিপ বোতাম ব্যবহার করে ম্যানুয়ালি অগ্রগতি আপডেট করুন।",
    autoStreakTitle: "অটো স্ট্রাইক লিঙ্ক",
    autoStreakDesc: "আপনার দৈনিক অ্যাক্টিভিটি স্ট্রাইকের উপর ভিত্তি করে অগ্রগতি স্বয়ংক্রিয়ভাবে গণনা করা হয়।",
    dailyLoginTitle: "দৈনিক লগইন ড্রিপ",
    dayStreak: "দিনের স্ট্রাইক",
    dailyLoginDesc: "দৈনিক ফ্রি টোকেন পেতে প্রতিদিন লগইন করুন।",
    claimedToday: "আজকের জন্য দাবি করা হয়েছে",
    claim30Tokens: "৩০ টোকেন দাবি করুন",
    completeProfileTitle: "প্রোফাইল সম্পূর্ণ করুন",
    completeProfileDesc: "আপনার বিশ্ববিদ্যালয়ের বিবরণ, দেশ এবং জন্ম তারিখ যোগ করুন।",
    bountyClaimed: "বাউন্টি দাবি করা হয়েছে",
    goToProfile: "প্রোফাইলে যান",
    claim100Tokens: "১০০ টোকেন দাবি করুন",
    tasksOn: "টি টাস্ক সম্পন্ন হয়েছে"
  },
  Hindi: {
    headerTitle: "दैनिक क्वेस्ट और बाउंटी",
    headerSubtitle: "टोकन अर्जित करने और प्रीमियम एआई सुविधाओं को अनलॉक करने के लिए कार्य पूरा करें।",
    heatmapTitle: "आपका निरंतरता हीटमैप",
    heatmapSubtitle: "पिछले 52 सप्ताह",
    heatmapLess: "कम",
    heatmapMore: "अधिक",
    settingsTitle: "ड्रीम यूनिवर्सिटी सेटिंग्स",
    settingsConfig: "कॉन्फ़िगरेशन",
    settingsEmpty: "अपनी तैयारी को ट्रैक करने के लिए अपने सपनों का विश्वविद्यालय चुनें।",
    currentProgress: "वर्तमान प्रगति:",
    share: "शेयर",
    reset: "रीसेट",
    trackingMode: "ट्रैकिंग मोड",
    manualControlTitle: "मैनुअल नियंत्रण",
    manualControlDesc: "डैशबोर्ड विजेट से +XP और स्किप बटन का उपयोग करके प्रगति को मैन्युअल रूप से अपडेट करें।",
    autoStreakTitle: "ऑटो स्ट्रीक लिंक",
    autoStreakDesc: "आपकी प्रगति स्वचालित रूप से आपकी दैनिक गतिविधि स्ट्रीक के आधार पर गणना की जाती है।",
    dailyLoginTitle: "दैनिक लॉगिन ड्रिप",
    dayStreak: "दिन की स्ट्रीक",
    dailyLoginDesc: "दैनिक मुफ्त टोकन प्राप्त करने के लिए प्रतिदिन लॉग इन करें।",
    claimedToday: "आज के लिए दावा किया गया",
    claim30Tokens: "30 टोकन का दावा करें",
    completeProfileTitle: "प्रोफ़ाइल पूरी करें",
    completeProfileDesc: "अपने विश्वविद्यालय का विवरण, देश और जन्म तिथि जोड़ें।",
    bountyClaimed: "बाउंटी का दावा किया गया",
    goToProfile: "प्रोफ़ाइल पर जाएं",
    claim100Tokens: "100 टोकन का दावा करें",
    tasksOn: "कार्य किए गए"
  }
};

export default function QuestsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [claiming, setClaiming] = useState<string | null>(null);

  // 🟢 NEW: Heatmap State
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});

  // 🟢 NEW: Dream Varsity State
  const [dreamVarsity, setDreamVarsity] = useState<any>(null);
  const UNIVERSITIES = ['BUET', 'DMC', 'DU', 'MIT', 'Harvard'];

  const [language, setLanguage] = useState<LanguageType>('English');

  useEffect(() => {
    fetchUserData();
    fetchHeatmapData();
    fetchDreamVarsity();

    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as LanguageType);
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/profile` : `${apiUrlBase}/api/profile`;

      const response = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      const data = await response.json();

      if (data.success && data.profile) {
        setUserData(data.profile);
        const fields = [data.profile.full_name, data.profile.university, data.profile.country, data.profile.session_year, data.profile.dob];
        const filledFields = fields.filter(f => f && typeof f === 'string' && f.trim() !== '').length;
        setCompletionPercentage((filledFields / fields.length) * 100);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // 🟢 NEW: Fetch Heatmap
  const fetchHeatmapData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/quests/heatmap` : `${apiUrlBase}/api/quests/heatmap`;

      const response = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      const data = await response.json();

      if (data.success && data.heatmap) {
        setHeatmapData(data.heatmap);
      }
    } catch (err) { console.error("Heatmap fetch error:", err); }
  };

  const fetchDreamVarsity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('user_dream_varsity').select('*').eq('user_id', session.user.id).single();
      if (data) setDreamVarsity(data);
    } catch (err) {}
  };

  const updateDreamVarsity = async (updates: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const updated = { ...dreamVarsity, ...updates, user_id: session.user.id, updated_at: new Date().toISOString() };
      setDreamVarsity(updated);
      await supabase.from('user_dream_varsity').upsert(updated, { onConflict: 'user_id' });
    } catch (err) {}
  };

  const shareToStory = () => {
    alert(`Generating Widget for Instagram/Facebook Story:\n\n"${dreamVarsity?.varsity_name} Preparation: ${dreamVarsity?.progress}% Complete on Prepia"\n\n(This would trigger the native share API or download an image in production)`);
  };

  const claimQuest = async (endpoint: string, questName: string) => {
    if (questName === 'profile' && completionPercentage < 100 && !userData?.is_profile_optimized) {
       router.push('/profile'); return;
    }

    setClaiming(questName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      
      let fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/quests/${endpoint}` : `${apiUrlBase}/api/quests/${endpoint}`;
      if (endpoint === 'daily-drip') {
         fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/daily-drip` : `${apiUrlBase}/api/rewards/daily-drip`;
      }

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ language })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
         throw new Error(data.error || "Failed to claim reward.");
      }
      
      const tokensAwarded = data.data?.tokensAdded || data.tokensAdded || 0;
      if (tokensAwarded > 0) {
         alert(`Success! You earned ${tokensAwarded} ✨ tokens.`);
         window.dispatchEvent(new CustomEvent('tokenUpdate', { detail: { tokens: tokensAwarded } }));
      }

      if (endpoint === 'daily-drip') {
        const today = new Date().toISOString().split('T')[0];
        setUserData((prev: any) => ({ ...prev, last_login_date: today }));
      } else if (endpoint === 'claim-profile') {
        setUserData((prev: any) => ({ ...prev, is_profile_optimized: true }));
      }

      // Refresh Data (Background)
      fetchUserData();
      fetchHeatmapData();

    } catch (err: any) { showPublicError(); } finally { setClaiming(null); }
  };

  // 🟢 NEW: Generate 364 days for the grid (52 weeks x 7 days)
  const generateHeatmapGrid = () => {
    const days = [];
    const today = new Date();
    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, count: heatmapData[dateStr] || 0 });
    }
    return days;
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 hover:bg-slate-200';
    if (count === 1) return 'bg-emerald-200 hover:bg-emerald-300';
    if (count >= 2 && count <= 3) return 'bg-emerald-400 hover:bg-emerald-500';
    return 'bg-emerald-600 hover:bg-emerald-700'; // Highest intensity
  };

  if (loading) return <SecureLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48}/></div></SecureLayout>;

  const todayStr = new Date().toISOString().split('T')[0];
  const dbDate = userData?.last_login_date ? new Date(userData.last_login_date).toISOString().split('T')[0] : null;
  const isDailyClaimed = dbDate === todayStr;

  const t = translations[language];

  return (
    <SecureLayout>
      <div className="max-w-5xl mx-auto p-6 md:p-10 mt-4 font-sans">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-950 p-8 rounded-3xl shadow-xl border border-slate-800 mb-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
           <div>
             <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3"><Gift className="text-indigo-400"/> {t.headerTitle}</h1>
             <p className="text-slate-400 mt-2 font-medium">{t.headerSubtitle}</p>
           </div>
        </div>

        {/* 🟢 NEW: GitHub-Style Engineering Heatmap */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Activity className="text-emerald-500"/> {t.heatmapTitle}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.heatmapSubtitle}</p>
          </div>

          <div className="w-full overflow-x-auto pb-4">
            <div className="min-w-[800px] flex justify-start">
              {/* CSS Grid Magic: Flow column fills top-to-bottom then left-to-right exactly like GitHub */}
              <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
                {generateHeatmapGrid().map((day, idx) => (
                  <div
                    key={idx}
                    title={`${day.count} ${t.tasksOn} ${day.date}`}
                    className={`w-[11px] h-[11px] rounded-[2px] transition-colors duration-200 ${getHeatmapColor(day.count)} cursor-pointer`}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-end gap-2 text-xs font-medium text-slate-500 mt-2">
            <span>{t.heatmapLess}</span>
            <div className="flex gap-[3px]">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-slate-100"></div>
              <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-200"></div>
              <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-400"></div>
              <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-600"></div>
            </div>
            <span>{t.heatmapMore}</span>
          </div>
        </div>

        {/* 🟢 NEW: Dream Varsity Settings */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
           <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
             <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Target className="text-indigo-500"/> {t.settingsTitle}</h2>
             <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">{t.settingsConfig}</span>
           </div>

           {!dreamVarsity?.varsity_name ? (
             <div className="text-center py-6">
                <p className="text-slate-500 font-medium mb-4">{t.settingsEmpty}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {UNIVERSITIES.map(uni => (
                    <button key={uni} onClick={() => updateDreamVarsity({ varsity_name: uni, progress: 10 })} className="px-5 py-2.5 rounded-xl border-2 border-slate-200 font-black text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95">
                      {uni}
                    </button>
                  ))}
                </div>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center"><GraduationCap size={28}/></div>
                     <div>
                       <h3 className="text-2xl font-black text-slate-800">{dreamVarsity.varsity_name}</h3>
                       <p className="text-sm font-bold text-slate-500">{t.currentProgress} {dreamVarsity.tracking_mode === 'auto' ? (userData?.streak_count || 0) * 5 : (dreamVarsity.progress || 0)}%</p>
                     </div>
                   </div>

                   <div className="flex gap-2">
                     <button onClick={shareToStory} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-md transition-all active:scale-95">
                       <Share2 size={16}/> {t.share}
                     </button>
                     <button onClick={() => updateDreamVarsity({ varsity_name: null, progress: 0, tracking_mode: 'manual' })} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                       <RefreshCcw size={16}/> {t.reset}
                     </button>
                   </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                   <h4 className="font-black text-slate-700 text-sm mb-4 uppercase tracking-widest flex items-center gap-2"><Settings size={16}/> {t.trackingMode}</h4>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => updateDreamVarsity({ tracking_mode: 'manual' })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${(!dreamVarsity.tracking_mode || dreamVarsity.tracking_mode === 'manual') ? 'bg-white border-indigo-500 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                         <h5 className={`font-black text-sm mb-1 ${(!dreamVarsity.tracking_mode || dreamVarsity.tracking_mode === 'manual') ? 'text-indigo-600' : 'text-slate-700'}`}>{t.manualControlTitle}</h5>
                         <p className="text-xs font-medium text-slate-500 leading-relaxed">{t.manualControlDesc}</p>
                      </button>

                      <button
                        onClick={() => updateDreamVarsity({ tracking_mode: 'auto' })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${dreamVarsity.tracking_mode === 'auto' ? 'bg-white border-emerald-500 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                         <h5 className={`font-black text-sm mb-1 ${dreamVarsity.tracking_mode === 'auto' ? 'text-emerald-600' : 'text-slate-700'}`}>{t.autoStreakTitle}</h5>
                         <p className="text-xs font-medium text-slate-500 leading-relaxed">{t.autoStreakDesc}</p>
                      </button>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Quests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Daily Login Quest */}
           <motion.div whileHover={{ scale: 1.02 }} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col">
              <div className="absolute -right-6 -top-6 text-orange-500/10"><Flame size={120}/></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                 <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center"><CalendarDays size={24}/></div>
                 <div>
                   <h3 className="text-xl font-black text-slate-800">{t.dailyLoginTitle}</h3>
                   <p className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1"><Flame size={14}/> {userData?.streak_count || 0} {t.dayStreak}</p>
                 </div>
              </div>
              <p className="text-slate-500 text-sm font-medium mb-6 relative z-10 flex-1">{t.dailyLoginDesc}</p>
              <button
                onClick={() => claimQuest('daily-drip', 'daily')}
                disabled={isDailyClaimed || claiming === 'daily'}
                className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all relative z-10 ${
                  isDailyClaimed ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-400 hover:to-rose-400 shadow-lg active:scale-95'
                }`}
              >
                {claiming === 'daily' ? <Loader2 className="animate-spin"/> : isDailyClaimed ? <CheckCircle2/> : <Zap/>}
                {isDailyClaimed ? t.claimedToday : t.claim30Tokens}
              </button>
           </motion.div>

           {/* Profile Optimization Quest */}
           <motion.div whileHover={{ scale: 1.02 }} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col">
              <div className="absolute -right-6 -top-6 text-indigo-500/5"><UserCheck size={120}/></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                 <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-xl flex items-center justify-center"><UserCheck size={24}/></div>
                 <div className="w-full">
                   <h3 className="text-xl font-black text-slate-800">{t.completeProfileTitle}</h3>
                   <div className="flex items-center gap-2 mt-1 w-full max-w-[200px]">
                      <div className="h-2 bg-slate-200 rounded-full flex-1 overflow-hidden">
                         <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${completionPercentage}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black text-indigo-500">{Math.round(completionPercentage)}%</span>
                   </div>
                 </div>
              </div>
              <p className="text-slate-500 text-sm font-medium mb-6 relative z-10 flex-1">{t.completeProfileDesc}</p>
              <button
                onClick={() => claimQuest('claim-profile', 'profile')}
                disabled={userData?.is_profile_optimized || claiming === 'profile'}
                className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all relative z-10 ${
                  userData?.is_profile_optimized ? 'bg-emerald-50 text-emerald-500 border border-emerald-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg active:scale-95'
                }`}
              >
                {claiming === 'profile' ? <Loader2 className="animate-spin"/> : userData?.is_profile_optimized ? <CheckCircle2/> : <Gift/>}
                {userData?.is_profile_optimized ? t.bountyClaimed : completionPercentage < 100 ? t.goToProfile : t.claim100Tokens}
              </button>
           </motion.div>
        </div>
      </div>
    </SecureLayout>
  );
}
