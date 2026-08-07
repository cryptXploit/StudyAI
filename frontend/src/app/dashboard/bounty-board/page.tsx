'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { useAuth } from '@/components/providers/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Award, TrendingUp, Search, PlusCircle, CheckCircle2, Zap, Target, ExternalLink, ShieldCheck, Coins, Loader2, ThumbsUp, ThumbsDown, X, Globe, Crown } from 'lucide-react';


const translations = {
  English: {
    wallOfFame: "Wall of Fame",
    noEntriesYet: "No entries yet.",
    anonymousScholar: "Anonymous Scholar",
    unknownUniversity: "Unknown University",
    unknownDept: "Unknown Dept",
    karma: "Karma",
    viewGlobalRankings: "View Global Rankings",
    academicLinkedIn: "Academic LinkedIn Ecosystem",
    alumniBountyBoard: "Alumni Bounty Board",
    solveComplexProblems: "Solve complex problems for juniors, earn Karma Points, and build your digital reputation.",
    top10Contributors: "🚀 Top 10 Contributors this month will get their Resumes directly forwarded to our Global Tech Partners.",
    yourKarmaBalance: "Your Karma Balance",
    postABounty: "Post a Bounty",
    cancel: "Cancel",
    explore: "Explore",
    myBounties: "My Bounties",
    searchTopics: "Search topics...",
    requestKnowledge: "Request Knowledge",
    egHeatmap: "E.g., I need a heatmap summary for Chapter 4...",
    rewardBounty: "Reward Bounty:",
    publish: "Publish",
    noBountiesFound: "No bounties found",
    requestedBy: "Requested by @",
    solved: "Solved",
    solveAndClaim: "Solve & Claim",
    claimed: "Claimed",
    solvedBy: "Solved by @",
    rateAnswer: "Rate Answer:",
    earn: "Earn",
    typeYourExplanation: "Type your explanation or paste a link...",
    submitSolution: "Submit Solution",
    globalHierarchy: "Global Hierarchy",
    top5000: "You are currently in the Top 5,000 Worldwide!",
    you: "You"
  },
  Bangla: {
    wallOfFame: "খ্যাতির প্রাচীর",
    noEntriesYet: "এখনো কোনো এন্ট্রি নেই।",
    anonymousScholar: "বেনামী শিক্ষার্থী",
    unknownUniversity: "অজানা বিশ্ববিদ্যালয়",
    unknownDept: "অজানা বিভাগ",
    karma: "কর্ম",
    viewGlobalRankings: "বিশ্বব্যাপী র‍্যাঙ্কিং দেখুন",
    academicLinkedIn: "একাডেমিক লিঙ্কডইন ইকোসিস্টেম",
    alumniBountyBoard: "অ্যালামনাই বাউন্টি বোর্ড",
    solveComplexProblems: "জুনিয়রদের জন্য জটিল সমস্যার সমাধান করুন, কর্ম পয়েন্ট অর্জন করুন এবং আপনার ডিজিটাল খ্যাতি তৈরি করুন।",
    top10Contributors: "🚀 এই মাসে সেরা ১০ জন অবদানকারীর জীবনবৃত্তান্ত সরাসরি আমাদের গ্লোবাল টেক পার্টনারদের কাছে ফরোয়ার্ড করা হবে।",
    yourKarmaBalance: "আপনার কর্ম ব্যালেন্স",
    postABounty: "বাউন্টি পোস্ট করুন",
    cancel: "বাতিল করুন",
    explore: "অন্বেষণ করুন",
    myBounties: "আমার বাউন্টিগুলো",
    searchTopics: "বিষয়বস্তু খুঁজুন...",
    requestKnowledge: "জ্ঞানের অনুরোধ করুন",
    egHeatmap: "যেমন, আমার চ্যাপ্টার ৪ এর জন্য একটি হিটম্যাপ সারাংশ প্রয়োজন...",
    rewardBounty: "বাউন্টি পুরস্কার:",
    publish: "প্রকাশ করুন",
    noBountiesFound: "কোনো বাউন্টি পাওয়া যায়নি",
    requestedBy: "অনুরোধ করেছেন @",
    solved: "সমাধান হয়েছে",
    solveAndClaim: "সমাধান করুন এবং দাবি করুন",
    claimed: "দাবি করা হয়েছে",
    solvedBy: "সমাধান করেছেন @",
    rateAnswer: "উত্তরটি রেট করুন:",
    earn: "অর্জন করুন",
    typeYourExplanation: "আপনার ব্যাখ্যা টাইপ করুন বা একটি লিঙ্ক পেস্ট করুন...",
    submitSolution: "সমাধান জমা দিন",
    globalHierarchy: "বিশ্বব্যাপী স্তরবিন্যাস",
    top5000: "আপনি বর্তমানে বিশ্বব্যাপী শীর্ষ ৫,০০০-এ আছেন!",
    you: "আপনি"
  },
  Hindi: {
    wallOfFame: "प्रसिद्धि की दीवार",
    noEntriesYet: "अभी तक कोई प्रविष्टि नहीं।",
    anonymousScholar: "अज्ञात विद्वान",
    unknownUniversity: "अज्ञात विश्वविद्यालय",
    unknownDept: "अज्ञात विभाग",
    karma: "कर्म",
    viewGlobalRankings: "वैश्विक रैंकिंग देखें",
    academicLinkedIn: "अकादमिक लिंक्डइन इकोसिस्टम",
    alumniBountyBoard: "पूर्व छात्र बाउंटी बोर्ड",
    solveComplexProblems: "जूनियर्स के लिए जटिल समस्याओं को हल करें, कर्म अंक अर्जित करें और अपनी डिजिटल प्रतिष्ठा बनाएं।",
    top10Contributors: "🚀 इस महीने के शीर्ष 10 योगदानकर्ताओं के रिज्यूमे सीधे हमारे ग्लोबल टेक पार्टनर्स को भेजे जाएंगे।",
    yourKarmaBalance: "आपका कर्म बैलेंस",
    postABounty: "बाउंटी पोस्ट करें",
    cancel: "रद्द करें",
    explore: "अन्वेषण करें",
    myBounties: "मेरी बाउंटी",
    searchTopics: "विषय खोजें...",
    requestKnowledge: "ज्ञान का अनुरोध करें",
    egHeatmap: "उदा., मुझे अध्याय 4 के लिए हीटमैप सारांश की आवश्यकता है...",
    rewardBounty: "बाउंटी इनाम:",
    publish: "प्रकाशित करें",
    noBountiesFound: "कोई बाउंटी नहीं मिली",
    requestedBy: "अनुरोधकर्ता @",
    solved: "हल हो गया",
    solveAndClaim: "हल करें और दावा करें",
    claimed: "दावा किया गया",
    solvedBy: "द्वारा हल किया गया @",
    rateAnswer: "उत्तर को रेट करें:",
    earn: "कमाएं",
    typeYourExplanation: "अपना स्पष्टीकरण टाइप करें या कोई लिंक पेस्ट करें...",
    submitSolution: "समाधान सबमिट करें",
    globalHierarchy: "वैश्विक पदानुक्रम",
    top5000: "आप वर्तमान में दुनिया भर में शीर्ष 5,000 में हैं!",
    you: "आप"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function BountyBoardPage() {
  const { user } = useAuth();
  const supabase = createClient();
  
  // States
  const [bounties, setBounties] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'my-bounties'>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Bounty Form
  const [newTitle, setNewTitle] = useState('');
  const [newReward, setNewReward] = useState(50);
  const [userKarma, setUserKarma] = useState(0);

  // Modals
  const [solveBountyId, setSolveBountyId] = useState<any>(null);
  const [solutionContent, setSolutionContent] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [showGlobalRanking, setShowGlobalRanking] = useState(false); // 🟢 Global Ranking Modal

  // 🟢 User Votes Tracking (To prevent infinite likes)
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});

  // 🟢 Mobile UI State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none' | 'leaderboard'>('none');
  const [language, setLanguage] = useState<LanguageType>('English');

  useEffect(() => {
    const loadSettings = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };
    loadSettings();
    if (user) loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    setIsLoading(true);
    await Promise.all([ fetchBounties(), fetchLeaderboard(), fetchUserKarma(), fetchUserVotes() ]);
    setIsLoading(false);
  };

  const fetchUserKarma = async () => {
    if (!user) return;
    const { data } = await supabase.from('bounty_profiles').select('karma_points').eq('user_id', user.id).maybeSingle();
    if (data) setUserKarma(data.karma_points);
  };

  // 🟢 Fetch previously casted votes to set button states
  const fetchUserVotes = async () => {
    if (!user) return;
    const { data } = await supabase.from('bounty_votes').select('*').eq('user_id', user.id);
    if (data) {
      const voteMap: Record<string, 'up' | 'down'> = {};
      data.forEach(v => { voteMap[`${v.item_type}_${v.item_id}`] = v.vote_type; });
      setUserVotes(voteMap);
    }
  };

  const fetchBounties = async () => {
    const { data: bountiesData } = await supabase.from('bounties').select('*').order('created_at', { ascending: false });
    const { data: solutionsData } = await supabase.from('bounty_solutions').select('*');

    if (!bountiesData) return;

    const requesterIds = [...new Set([...bountiesData.map(b => b.requester_id), ...(solutionsData?.map(s => s.solver_id) || [])])];
    let profilesMap: Record<string, string> = {};
    
    if (requesterIds.length > 0) {
      const { data: profilesData } = await supabase.from('bounty_profiles').select('user_id, display_name').in('user_id', requesterIds);
      if (profilesData) {
        profilesData.forEach(p => { profilesMap[p.user_id] = p.display_name || 'Anonymous Scholar'; });
      }
    }

    const formattedBounties = bountiesData.map(b => {
      const sol = solutionsData?.find(s => s.bounty_id === b.id);
      return {
        ...b,
        requester_name: profilesMap[b.requester_id] || 'Anonymous Scholar',
        tags: ['Community Request', b.status === 'open' ? 'Active' : 'Closed'],
        solution: sol ? { ...sol, solver_name: profilesMap[sol.solver_id] || 'Anonymous Scholar' } : null
      };
    });

    setBounties(formattedBounties);
  };

  const fetchLeaderboard = async () => {
    const CACHE_KEY = 'Prepia_bounty_leaderboard';
    const CACHE_TIME = 'Prepia_bounty_leaderboard_time';
    const TEN_MINUTES = 10 * 60 * 1000;

    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME);

    if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < TEN_MINUTES) {
      setLeaderboard(JSON.parse(cachedData)); return;
    }

    const { data: boardData } = await supabase.from('bounty_profiles').select('user_id, karma_points, university, department').order('karma_points', { ascending: false }).limit(10);
    if (!boardData) return;

    const userIds = boardData.map(b => b.user_id);
    let profilesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase.from('bounty_profiles').select('user_id, display_name').in('user_id', userIds);
      if (profilesData) {
        profilesData.forEach(p => { profilesMap[p.user_id] = p.display_name || 'Anonymous Scholar'; });
      }
    }

    const formattedBoard = boardData.map((b, index) => ({
      rank: index + 1,
      name: profilesMap[b.user_id] || 'Anonymous Scholar',
      uni: b.university || 'Unknown University',
      dept: b.department || 'Unknown Dept',
      karma: b.karma_points
    }));

    localStorage.setItem(CACHE_KEY, JSON.stringify(formattedBoard));
    localStorage.setItem(CACHE_TIME, Date.now().toString());
    setLeaderboard(formattedBoard);
  };

  const handleCreateBounty = async () => {
    if (!newTitle.trim() || !user) return;
    setIsSubmitting(true);

    const { data, error } = await supabase.from('bounties').insert({
        requester_id: user.id, title: newTitle, description: '', reward_karma: newReward, status: 'open'
    }).select().single();

    if (!error && data) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const newBounty = { ...data, requester_name: profile?.full_name || 'You', tags: ['Community Request', 'Active'] };
      setBounties([newBounty, ...bounties]);
      setNewTitle(''); setIsCreating(false);
    }
    setIsSubmitting(false);
  };

  const submitSolution = async () => {
    if (!solutionContent.trim() || !user || !solveBountyId) return;
    setIsSolving(true);
    try {
      const { error } = await supabase.rpc('solve_and_claim_bounty', {
        p_bounty_id: solveBountyId.id, p_solver_id: user.id, p_content: solutionContent, p_reward: solveBountyId.reward_karma
      });
      if (!error) {
        setSolutionContent(''); setSolveBountyId(null); await loadInitialData();
      }
    } catch (err) {}
    setIsSolving(false);
  };

  // 🟢 NEW: SMART VOTE SYSTEM (Prevents unlimited likes)
  const handleVote = async (table: 'bounties' | 'bounty_solutions', id: string, type: 'up' | 'down', currentUp: number, currentDown: number) => {
    if (!user) return;
    const itemType = table === 'bounties' ? 'bounty' : 'solution';
    const existingVote = userVotes[`${itemType}_${id}`];

    if (existingVote === type) return; // Prevent clicking same button again

    let newUp = currentUp;
    let newDown = currentDown;

    // Adjust counts based on previous vote
    if (existingVote === 'up' && type === 'down') { newUp--; newDown++; }
    else if (existingVote === 'down' && type === 'up') { newDown--; newUp++; }
    else if (!existingVote && type === 'up') { newUp++; }
    else if (!existingVote && type === 'down') { newDown++; }

    // 1. Optimistic Update (Instant Feedback + Animation Trigger)
    setUserVotes(prev => ({ ...prev, [`${itemType}_${id}`]: type }));
    setBounties(prev => prev.map(b => {
      if (table === 'bounties' && b.id === id) return { ...b, upvotes: newUp, downvotes: newDown };
      if (table === 'bounty_solutions' && b.solution?.id === id) {
        return { ...b, solution: { ...b.solution, upvotes: newUp, downvotes: newDown } };
      }
      return b;
    }));

    // 2. Database Update
    await supabase.from(table).update({ upvotes: newUp, downvotes: newDown }).eq('id', id);
    await supabase.from('bounty_votes').upsert({ user_id: user.id, item_id: id, item_type: itemType, vote_type: type }, { onConflict: 'user_id, item_id, item_type' });
  };

  // 🟢 FIX: "My Bounties" now includes solved bounties too
  const displayedBounties = bounties.filter(bounty => {
    const matchesTab = activeTab === 'my-bounties' ? (bounty.requester_id === user?.id || bounty.solution?.solver_id === user?.id) : true;
    const matchesSearch = bounty.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const t = translations[language];

  if (isLoading) {
    return (
      <SecureLayout>
        <div className="h-[80vh] flex items-center justify-center text-amber-500">
          <Loader2 className="animate-spin" size={40} />
        </div>
      </SecureLayout>
    );
  }

  const renderLeaderboardSection = () => (
    <div className="bg-slate-950 rounded-[2rem] p-6 md:p-8 shadow-2xl border-2 border-slate-800 sticky top-28">
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
        <h3 className="text-xl font-black text-white flex items-center gap-2"><Award className="text-amber-400"/> {t.wallOfFame}</h3>
        <TrendingUp className="text-slate-500" size={20} />
      </div>

      <div className="space-y-4">
        {leaderboard.length === 0 ? (
          <p className="text-slate-500 text-center font-bold text-xs">{t.noEntriesYet}</p>
        ) : (
          leaderboard.map((userBoard, idx) => (
            <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${idx === 0 ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {userBoard.rank}
                </span>
                <div className="min-w-0">
                  <h4 className={`font-bold text-sm truncate ${idx === 0 ? 'text-amber-400' : 'text-white'}`}>{userBoard.name === 'Anonymous Scholar' ? t.anonymousScholar : userBoard.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{userBoard.uni === 'Unknown University' ? t.unknownUniversity : userBoard.uni} • {userBoard.dept === 'Unknown Dept' ? t.unknownDept : userBoard.dept}</p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className="block text-sm font-black text-white">{userBoard.karma.toLocaleString()}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">{t.karma}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={() => { setShowGlobalRanking(true); setIsMobileDrawerOpen('none'); }} className="w-full mt-6 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2">
        {t.viewGlobalRankings} <ExternalLink size={14} />
      </button>
    </div>
  );

  return (
    <SecureLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans space-y-8 relative">
        
        {/* HERO BANNER */}
        <div className="relative bg-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white overflow-hidden shadow-2xl border border-amber-500/20">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Briefcase size={200}/></div>
          <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[200%] bg-gradient-to-br from-amber-500/10 via-transparent to-orange-600/10 pointer-events-none blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Target size={14} /> {t.academicLinkedIn}
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-amber-200">
                {t.alumniBountyBoard}
              </h1>
              <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed">
                {t.solveComplexProblems} 
                <span className="text-amber-400 font-bold block mt-2">
                  {t.top10Contributors}
                </span>
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl w-full md:w-64 shrink-0 shadow-xl">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 text-center">{t.yourKarmaBalance}</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Coins size={28} className="text-amber-400" />
                <span className="text-4xl font-black text-white">{userKarma.toLocaleString()}</span>
              </div>
              <button onClick={() => setIsCreating(!isCreating)} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                {isCreating ? t.cancel : t.postABounty}
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setActiveTab('explore')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'explore' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Explore</button>
                <button onClick={() => setActiveTab('my-bounties')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'my-bounties' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>My Bounties</button>
              </div>
              <div className="relative w-full sm:w-auto">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchTopics} className="w-full sm:w-64 bg-slate-50 border border-slate-200 py-2 pl-10 pr-4 rounded-xl text-sm font-medium focus:border-amber-500 outline-none transition-colors" />
              </div>
            </div>

            {/* Create Bounty Form */}
            <AnimatePresence>
              {isCreating && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-xl overflow-hidden">
                  <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2"><PlusCircle size={20} className="text-amber-500"/> {t.requestKnowledge}</h3>
                  <div className="space-y-4">
                    <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} type="text" placeholder={t.egHeatmap} className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl text-sm focus:border-amber-500 outline-none" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-700 gap-4">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.rewardBounty}</span>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <select value={newReward} onChange={(e) => setNewReward(Number(e.target.value))} className="bg-black text-amber-400 font-black border border-amber-500/30 p-2 rounded-lg outline-none cursor-pointer flex-1 sm:flex-none">
                          <option value={50}>50 {t.karma}</option>
                          <option value={100}>100 {t.karma}</option>
                          <option value={200}>200 {t.karma}</option>
                        </select>
                        <button onClick={handleCreateBounty} disabled={!newTitle.trim() || isSubmitting} className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 w-full sm:w-auto">
                          {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto"/> : t.publish}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOUNTY LIST */}
            <div className="space-y-4">
              {displayedBounties.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-100">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">{t.noBountiesFound}</p>
                </div>
              ) : (
                displayedBounties.map((bounty) => {
                  const qUpvoted = userVotes[`bounty_${bounty.id}`] === 'up';
                  const qDownvoted = userVotes[`bounty_${bounty.id}`] === 'down';
                  const aUpvoted = bounty.solution ? userVotes[`solution_${bounty.solution.id}`] === 'up' : false;
                  const aDownvoted = bounty.solution ? userVotes[`solution_${bounty.solution.id}`] === 'down' : false;

                  return (
                    <div key={bounty.id} className={`p-6 rounded-[2rem] border transition-all group ${bounty.status === 'solved' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-lg'}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                              {t.requestedBy}{bounty.requester_name === 'Anonymous Scholar' ? t.anonymousScholar : (bounty.requester_name === 'You' ? t.you : bounty.requester_name)}
                            </span>
                            {bounty.status === 'solved' && <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md"><CheckCircle2 size={12}/> {t.solved}</span>}
                          </div>
                          <h3 className={`text-lg font-black mb-3 ${bounty.status === 'solved' ? 'text-slate-600' : 'text-slate-800'}`}>{bounty.title}</h3>
                          
                          {/* 🟢 ANIMATED QUESTION VOTING */}
                          <div className="flex items-center gap-4 mt-2">
                            <motion.button 
                              whileTap={{ scale: 0.8 }} animate={qUpvoted ? { scale: [1, 1.3, 1], color: '#10b981' } : {}}
                              onClick={() => handleVote('bounties', bounty.id, 'up', bounty.upvotes || 0, bounty.downvotes || 0)} 
                              className={`flex items-center gap-1 text-xs font-bold transition-colors ${qUpvoted ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}
                            >
                              <ThumbsUp size={14} className={qUpvoted ? "fill-emerald-500" : ""} /> {bounty.upvotes || 0}
                            </motion.button>

                            <motion.button 
                              whileTap={{ scale: 0.8, x: [-2, 2, -2, 0] }} animate={qDownvoted ? { color: '#f43f5e' } : {}}
                              onClick={() => handleVote('bounties', bounty.id, 'down', bounty.upvotes || 0, bounty.downvotes || 0)} 
                              className={`flex items-center gap-1 text-xs font-bold transition-colors ${qDownvoted ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                            >
                              <ThumbsDown size={14} className={qDownvoted ? "fill-rose-500" : ""} /> {bounty.downvotes || 0}
                            </motion.button>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end gap-4 w-full md:w-auto">
                          <div className="flex flex-col items-center md:items-end">
                            <span className="text-2xl font-black text-amber-500 flex items-center gap-1"><Coins size={20}/> {bounty.reward_karma}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.karma}</span>
                          </div>
                          {bounty.status === 'open' ? (
                            <button onClick={() => setSolveBountyId(bounty)} className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                              <Zap size={14} /> {t.solveAndClaim}
                            </button>
                          ) : (
                            <button className="w-full md:w-auto px-6 py-3 bg-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                              <ShieldCheck size={14} /> {t.claimed}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SOLUTION SECTION */}
                      {bounty.status === 'solved' && bounty.solution && (
                        <div className="mt-6 pt-4 border-t border-slate-200">
                          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                             <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">{t.solvedBy}{bounty.solution.solver_name === 'Anonymous Scholar' ? t.anonymousScholar : (bounty.solution.solver_name === 'You' ? t.you : bounty.solution.solver_name)}</p>
                             <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{bounty.solution.content_link}</p>
                             
                             {/* 🟢 ANIMATED ANSWER VOTING */}
                             <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200/50">
                               <span className="text-[10px] font-bold text-slate-400 uppercase">{t.rateAnswer}</span>
                               <motion.button 
                                  whileTap={{ scale: 0.8 }} animate={aUpvoted ? { scale: [1, 1.3, 1], color: '#10b981' } : {}}
                                  onClick={() => handleVote('bounty_solutions', bounty.solution.id, 'up', bounty.solution.upvotes || 0, bounty.solution.downvotes || 0)} 
                                  className={`flex items-center gap-1 text-xs font-bold transition-colors ${aUpvoted ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}
                                >
                                  <ThumbsUp size={14} className={aUpvoted ? "fill-emerald-500" : ""} /> {bounty.solution.upvotes || 0}
                               </motion.button>

                               <motion.button 
                                  whileTap={{ scale: 0.8, x: [-2, 2, -2, 0] }} animate={aDownvoted ? { color: '#f43f5e' } : {}}
                                  onClick={() => handleVote('bounty_solutions', bounty.solution.id, 'down', bounty.solution.upvotes || 0, bounty.solution.downvotes || 0)} 
                                  className={`flex items-center gap-1 text-xs font-bold transition-colors ${aDownvoted ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                                >
                                  <ThumbsDown size={14} className={aDownvoted ? "fill-rose-500" : ""} /> {bounty.solution.downvotes || 0}
                               </motion.button>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: LEADERBOARD */}
          <div className="hidden lg:block lg:col-span-4">
            {renderLeaderboardSection()}
          </div>

        </div>
      </div>

      {/* Mobile Floating Dock */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent flex flex-col items-center pb-6">
        <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
          <button 
            onClick={() => setIsMobileDrawerOpen('leaderboard')} 
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 border border-amber-400/50"
          >
            <Award size={18} /> {t.wallOfFame}
          </button>
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET DRAWER */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen === 'leaderboard' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-950 border-slate-700 ${isMobileDrawerOpen === 'leaderboard' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          {renderLeaderboardSection()}
        </div>
      </div>

      {/* 🟢 SOLVE MODAL */}
      <AnimatePresence>
        {solveBountyId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[2rem] p-8 max-w-xl w-full shadow-2xl border border-slate-100 relative">
              <button onClick={() => setSolveBountyId(null)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-2 py-1 rounded-md mb-2 inline-block">{t.earn} {solveBountyId.reward_karma} {t.karma}</span>
                <h2 className="text-2xl font-black text-slate-800 leading-tight">{solveBountyId.title}</h2>
              </div>
              <textarea value={solutionContent} onChange={(e) => setSolutionContent(e.target.value)} placeholder={t.typeYourExplanation} className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-sm font-medium focus:border-amber-500 outline-none resize-none mb-6 custom-scrollbar"></textarea>
              <div className="flex gap-4">
                <button onClick={() => setSolveBountyId(null)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all">{t.cancel}</button>
                <button onClick={submitSolution} disabled={!solutionContent.trim() || isSolving} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSolving ? <Loader2 size={16} className="animate-spin" /> : <><Zap size={16} /> {t.submitSolution}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 GLOBAL RANKING MODAL */}
      <AnimatePresence>
        {showGlobalRanking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-950 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl border border-amber-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>
              <button onClick={() => setShowGlobalRanking(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-10"><X size={24}/></button>
              
              <div className="text-center mb-8 relative z-10">
                <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                  <Globe size={32} />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight mb-2">{t.globalHierarchy}</h2>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold">
                  <Crown size={16} /> {t.top5000}
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
                {leaderboard.map((userBoard, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${idx === 0 ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {userBoard.rank}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-base">{userBoard.name === 'Anonymous Scholar' ? t.anonymousScholar : userBoard.name}</h4>
                        <p className="text-xs text-slate-400">{userBoard.uni === 'Unknown University' ? t.unknownUniversity : userBoard.uni} • {userBoard.dept === 'Unknown Dept' ? t.unknownDept : userBoard.dept}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-lg font-black text-amber-400">{userBoard.karma.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </SecureLayout>
  );
}
