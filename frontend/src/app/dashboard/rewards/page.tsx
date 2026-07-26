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
      <div className="max-w-7xl mx-auto p-6 md:p-8 mt-4 font-sans">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Gift className="text-indigo-600" size={36} /> {t.title}
          </h1>
          <p className="text-slate-500 font-medium mt-2">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
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

          {/* Right Column: Transaction History */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col h-full">
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
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
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
    </SecureLayout>
  );
}
