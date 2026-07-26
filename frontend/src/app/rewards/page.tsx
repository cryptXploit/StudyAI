'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Sparkles, History, TrendingUp, Gift, Zap, Crown, Award, Briefcase, Users, Link as LinkIcon, CheckCircle2, Copy } from 'lucide-react';

const translations = {
  English: {
    title: "Reward Center",
    subtitle: "Track your earned Aura and Karma tokens to unlock premium perks",
    totalBalance: "Total Aura Balance",
    totalKarma: "Total Karma Balance",
    history: "Aura Transaction History",
    date: "Date",
    amount: "Amount",
    reason: "Activity",
    inviteEarn: "Invite & Earn Aura ✨",
    inviteDesc: "Send your unique link to friends. When they sign up, you get 200 Aura and they get 100 Aura!",
    friendsJoined: "Friends Joined",
    copyLink: "Copy Invite Link",
    copied: "Copied to clipboard!",
    comingSoon: "Exchange Store (Coming Soon)",
    comingSoonDesc: "Redeem or exchange your Aura and Karma for exclusive avatars, AI models, and career perks!",
    noHistory: "No Aura earned yet. Invite friends to a battle to start earning!",
    earned: "Earned"
  },
  Bangla: {
    title: "রিওয়ার্ড সেন্টার",
    subtitle: "আপনার অর্জিত অরা (Aura) এবং কার্মা (Karma) ট্র্যাক করুন",
    totalBalance: "মোট অরা ব্যালেন্স",
    totalKarma: "মোট কার্মা ব্যালেন্স",
    history: "অরা লেনদেনের ইতিহাস",
    date: "তারিখ",
    amount: "পরিমাণ",
    reason: "অ্যাক্টিভিটি",
    inviteEarn: "ইনভাইট করুন এবং অরা জিতুন ✨",
    inviteDesc: "বন্ধুদের আপনার ইউনিক লিংক পাঠান। তারা সাইনআপ করলে আপনি পাবেন ২০০ অরা আর তারা পাবে ১০০ অরা!",
    friendsJoined: "বন্ধুরা জয়েন করেছে",
    copyLink: "ইনভাইট লিংক কপি করুন",
    copied: "কপি হয়েছে!",
    comingSoon: "এক্সচেঞ্জ স্টোর (শীঘ্রই আসছে)",
    comingSoonDesc: "আপনার অরা এবং কার্মা এক্সচেঞ্জ করে স্পেশাল সুবিধা এবং ক্যারিয়ার পার্কস আনলক করুন!",
    noHistory: "এখনো কোনো অরা আয় হয়নি। বন্ধুদের ইনভাইট করে আয় শুরু করুন!",
    earned: "অর্জিত"
  },
  Hindi: {
    title: "इनाम केंद्र",
    subtitle: "अपना अर्जित ऑरा (Aura) और कर्मा (Karma) ट्रैक करें",
    totalBalance: "कुल ऑरा बैलेंस",
    totalKarma: "कुल कर्मा बैलेंस",
    history: "ऑरा लेन-देन का इतिहास",
    date: "तारीख",
    amount: "राशि",
    reason: "गतिविधि",
    inviteEarn: "आमंत्रित करें और ऑरा कमाएं ✨",
    inviteDesc: "दोस्तों को अपना लिंक भेजें। उनके साइनअप करने पर आपको 200 ऑरा और उन्हें 100 ऑरा मिलेंगे!",
    friendsJoined: "दोस्त शामिल हुए",
    copyLink: "इनवाइट लिंक कॉपी करें",
    copied: "कॉपी हो गया!",
    comingSoon: "एक्सचेंज स्टोर (जल्द आ रहा है)",
    comingSoonDesc: "प्रीमियम भत्तों और करियर लाभों के लिए अपने ऑरा और कर्मा का आदान-प्रदान करें!",
    noHistory: "अभी तक कोई ऑरा अर्जित नहीं किया। कमाने के लिए दोस्तों को आमंत्रित करें!",
    earned: "अर्जित"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function RewardsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  const [totalAura, setTotalAura] = useState<number>(0);
  const [totalKarma, setTotalKarma] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // 🟢 Referral States
  const [referralCode, setReferralCode] = useState<string>('');
  const [totalReferred, setTotalReferred] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);

  // 🟢 MOBILE UI STATES
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'history'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  useEffect(() => {
    const loadLanguage = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };
    loadLanguage();
    window.addEventListener('languageChanged', loadLanguage);
    
    fetchRewardsData();

    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  const fetchRewardsData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      // Fetch Aura
      const { data: auraData } = await supabase.from('user_rewards').select('total_tokens').eq('user_id', user.id).maybeSingle();
      if (auraData) setTotalAura(auraData.total_tokens || 0);

      // Fetch Karma
      const { data: karmaData } = await supabase.from('bounty_profiles').select('karma_points').eq('user_id', user.id).maybeSingle();
      if (karmaData) setTotalKarma(karmaData.karma_points || 0);

      // Fetch Transactions
      const { data: historyData } = await supabase.from('reward_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (historyData) setTransactions(historyData);

      // 🟢 Fetch Referral Data via API
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/referral` : `${apiUrlBase}/api/rewards/referral`;
      
      const refResponse = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const refData = await refResponse.json();
      if (refData.success) {
        setReferralCode(refData.referralCode);
        setTotalReferred(refData.totalReferred);
      }

    } catch (error) {
      console.error("Error fetching rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <SecureLayout>
        <div className="h-[calc(100vh-80px)] flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      </SecureLayout>
    );
  }

  return (
    <SecureLayout>
      {/* Mobile Smart Header */}
      <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
        <div className="flex flex-col">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><Gift size={16} className="text-indigo-400"/> {t.title}</h2>
          <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">Premium Perks</p>
        </div>
        <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 mt-4 font-sans h-[calc(100vh-140px)] lg:h-auto overflow-y-auto lg:overflow-visible custom-scrollbar">
        
        {/* Header Section (Desktop Only) */}
        <div className="mb-8 hidden lg:block">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Gift className="text-indigo-600" size={36} /> {t.title}
          </h1>
          <p className="text-slate-500 font-medium mt-2">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-24 lg:mb-0">
          
          {/* Left Column: Balances & Invite */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Premium Aura Balance Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Crown size={120} /></div>
              <div className="relative z-10">
                <p className="text-indigo-200 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                  <Sparkles size={14}/> {t.totalBalance}
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-400">
                    {totalAura.toLocaleString()}
                  </h2>
                  <span className="text-2xl font-bold text-indigo-400">✨</span>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-white/10">
                  <TrendingUp size={14} className="text-emerald-400" /> Study Power
                </div>
              </div>
            </div>

            {/* Premium Karma Balance Card */}
            <div className="bg-gradient-to-br from-amber-900 via-orange-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Award size={120} /></div>
              <div className="relative z-10">
                <p className="text-orange-200 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                  <Sparkles size={14}/> {t.totalKarma}
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
                    {totalKarma.toLocaleString()}
                  </h2>
                  <span className="text-2xl font-bold text-amber-500">🏆</span>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-white/10">
                  <Briefcase size={14} className="text-amber-400" /> Career Reputation
                </div>
              </div>
            </div>

            {/* 🟢 NEW: Hack-Proof Referral Card */}
            <div className="bg-emerald-50 border-2 border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 text-emerald-500"><Users size={150} /></div>
              <div className="relative z-10">
                <h3 className="text-lg font-black text-emerald-800 mb-2">{t.inviteEarn}</h3>
                <p className="text-emerald-600/80 font-medium text-xs leading-relaxed mb-6">
                  {t.inviteDesc}
                </p>
                
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-emerald-100 mb-4 shadow-sm">
                   <div className="flex flex-col pl-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">{t.friendsJoined}</span>
                      <span className="text-2xl font-black text-emerald-600">{totalReferred}</span>
                   </div>
                   <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-500">
                      <Users size={20}/>
                   </div>
                </div>

                <button 
                  onClick={copyReferralLink}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {isCopied ? <CheckCircle2 size={18}/> : <LinkIcon size={18}/>} 
                  {isCopied ? t.copied : t.copyLink}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Transaction History (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex-col h-full">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 shrink-0">
              <History className="text-slate-400" size={20} /> {t.history}
            </h3>

            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="text-slate-300" size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-600 mb-2">No Aura Yet</h4>
                <p className="text-slate-400 text-sm max-w-sm">{t.noHistory}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 max-h-[600px]">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{txn.reason}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          {new Date(txn.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-indigo-500 flex items-center justify-end gap-1">
                        +{txn.amount} ✨
                      </p>
                      <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest">{t.earned}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Floating Input Dock */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
          <button 
            onClick={() => setIsMobileDrawerOpen('history')} 
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 border border-indigo-400/50"
          >
            <History size={18} /> View Transaction History
          </button>
        </div>
      </div>

      {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <History size={18} className="text-indigo-400"/> {t.history}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{txn.reason}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                          {new Date(txn.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-indigo-400">+{txn.amount} ✨</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </SecureLayout>
  );
}
