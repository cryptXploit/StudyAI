'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Swords, Sparkles, Loader2, History, Trash2, ShieldCheck, Check, X, Scale, Target, Lightbulb } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    title: "Concept Battle",
    subtitle: "Instantly compare and differentiate any two topics",
    conceptALabel: "Concept A",
    conceptAPlaceholder: "e.g., Mitosis",
    conceptBLabel: "Concept B",
    conceptBPlaceholder: "e.g., Meiosis",
    generateBtn: "Start Battle",
    generating: "Analyzing Differences...",
    historyTitle: "Battle History",
    noHistory: "No battles initiated yet.",
    canvasAwaits: "Choose Your Fighters",
    awaitsDesc: "Enter two concepts to get a detailed comparison matrix, pros & cons, and use cases.",
    proBadge: "PRO TIER FEATURE",
    whenToUse: "When to use?",
    pros: "Advantages",
    cons: "Disadvantages"
  },
  Bangla: {
    title: "কনসেপ্ট ব্যাটল",
    subtitle: "যেকোনো দুটি টপিকের পার্থক্য ও তুলনা জানুন এক ক্লিকে",
    conceptALabel: "প্রথম কনসেপ্ট",
    conceptAPlaceholder: "যেমন: TCP",
    conceptBLabel: "দ্বিতীয় কনসেপ্ট",
    conceptBPlaceholder: "যেমন: UDP",
    generateBtn: "তুলনা শুরু করুন",
    generating: "পার্থক্য খোঁজা হচ্ছে...",
    historyTitle: "আগের ব্যাটলসমূহ",
    noHistory: "এখনো কোনো পার্থক্য নির্ণয় করা হয়নি।",
    canvasAwaits: "কনসেপ্ট নির্বাচন করুন",
    awaitsDesc: "যেকোনো দুটি টপিকের নাম লিখুন। এআই সাথে সাথে চমৎকার একটি তুলনামূলক ছক ও সুবিধা-অসুবিধা জানিয়ে দেবে।",
    proBadge: "প্রো-টিয়ার ফিচার",
    whenToUse: "কখন ব্যবহার করবেন?",
    pros: "সুবিধাসমূহ",
    cons: "অসুবিধাসমূহ"
  },
  Hindi: {
    title: "कांसेप्ट बैटल",
    subtitle: "किन्हीं दो विषयों की तुरंत तुलना करें",
    conceptALabel: "पहला विषय",
    conceptAPlaceholder: "उदा. Mitosis",
    conceptBLabel: "दूसरा विषय",
    conceptBPlaceholder: "उदा. Meiosis",
    generateBtn: "तुलना शुरू करें",
    generating: "अंतर का विश्लेषण हो रहा है...",
    historyTitle: "बैटल इतिहास",
    noHistory: "अभी तक कोई तुलना नहीं की गई।",
    canvasAwaits: "अपने विषय चुनें",
    awaitsDesc: "विस्तृत तुलना मैट्रिक्स, फायदे और नुकसान प्राप्त करने के लिए दो अवधारणाएं दर्ज करें।",
    proBadge: "प्रो टियर फ़ीचर",
    whenToUse: "कब उपयोग करें?",
    pros: "फायदे",
    cons: "नुकसान"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function ConceptBattlePage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextParam = searchParams.get('context');

  const [conceptA, setConceptA] = useState('');
  const [conceptB, setConceptB] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (contextParam) {
      if (contextParam.toLowerCase().includes(' vs ')) {
        const parts = contextParam.split(/ vs /i);
        setConceptA(parts[0].trim());
        if (parts[1]) setConceptB(parts[1].trim());
      } else {
        setConceptA(contextParam);
      }
    }
  }, [contextParam]);
  
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [battleData, setBattleData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(10);

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  // 🟢 MOBILE UI STATES
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'history'|'config'>('none');
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

  useEffect(() => {
    fetchHistory();
    const loadLanguage = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };
    loadLanguage();
    window.addEventListener('languageChanged', loadLanguage);
    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  // 🟢 AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchHistory = async () => {
    // 1. Instant load from Session Storage Cache
    const cachedHistory = sessionStorage.getItem('Prepia_concept_battle_history');
    if (cachedHistory) {
      setHistoryList(JSON.parse(cachedHistory));
    }

    // 2. Background Sync
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('concept_battles').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      
      if (data) {
        setHistoryList(data);
        sessionStorage.setItem('Prepia_concept_battle_history', JSON.stringify(data));
      }
    } catch (e) {}
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptA.trim() || !conceptB.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 10) {
      setRequiredTokensForModal(10);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setBattleData(null);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/concept-battle/generate` : `${apiUrlBase}/api/concept-battle/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ conceptA, conceptB, language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 10);
            setShowTokenModal(true);
            setIsLoading(false);
            return;
        }
      }

      const data = await response.json();
      if (!data.valid || !data.battleData) throw new Error(data.error || "Failed to compare concepts.");

      setBattleData(data.battleData);
      if (data.savedId) setActiveBattleId(data.savedId);
      
      refreshTokens();
      sessionStorage.removeItem('Prepia_concept_battle_history'); // 🟢 Bust Cache
      setTimeout(() => fetchHistory(), 1500); // Slight delay for DB Trigger

      // 🟢 Reset states and clear URL for clean UI after generation
      setConceptA('');
      setConceptB('');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("🚨 Timeout: Server took too long to analyze the concepts. Please try again.");
      } else {
        alert(`🚨 Battle Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBattle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('concept_battles').delete().eq('id', id);
      if (activeBattleId === id) {
        setActiveBattleId(null);
        setBattleData(null);
      }
      sessionStorage.removeItem('Prepia_concept_battle_history'); // 🟢 Bust Cache
      fetchHistory();
    } catch (e) {}
  };

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-950 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-slate-950 bg-slate-950 lg:border lg:border-slate-700 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">
        
        {/* Left Panel: Inputs (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative z-10">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-rose-500 to-red-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Swords size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="flex items-center gap-4">
               <div className="flex-1">
                 <label className="block text-[10px] font-black tracking-widest text-rose-400 uppercase mb-2">{t.conceptALabel}</label>
                 <input
                   value={conceptA}
                   onChange={(e) => setConceptA(e.target.value)}
                   placeholder={t.conceptAPlaceholder}
                   className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-rose-500 outline-none font-bold text-slate-200 shadow-inner transition-all"
                   required
                 />
               </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
               <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-xs font-black text-slate-400 italic">VS</div>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex-1">
                 <label className="block text-[10px] font-black tracking-widest text-blue-400 uppercase mb-2">{t.conceptBLabel}</label>
                 <input
                   value={conceptB}
                   onChange={(e) => setConceptB(e.target.value)}
                   placeholder={t.conceptBPlaceholder}
                   className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-200 shadow-inner transition-all"
                   required
                 />
               </div>
            </div>

            <button type="submit" disabled={isLoading || !conceptA.trim() || !conceptB.trim()} className="w-full mt-4 py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Swords size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-8 pt-6 border-t border-slate-800/50 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2 shrink-0">
              <History size={14} className="text-rose-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-900 rounded-xl">{t.noHistory}</p>
              ) : (
                historyList.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => { 
                      setActiveBattleId(item.id); 
                      setBattleData(item.battle_data); 
                      setConceptA(item.concept_a);
                      setConceptB(item.concept_b);
                    }}
                    className={`group p-3 rounded-xl cursor-pointer transition-all border flex justify-between items-center ${activeBattleId === item.id ? 'bg-rose-500/10 border-rose-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-2 pr-2">
                      <Scale size={14} className="text-slate-500 group-hover:text-rose-400 shrink-0"/>
                      <p className={`text-xs font-bold ${activeBattleId === item.id ? 'text-rose-300' : 'text-slate-300'}`}>
                         <span className="text-rose-400">{item.concept_a}</span> <span className="text-slate-400 font-mono text-[10px] mx-1">vs</span> <span className="text-blue-400">{item.concept_b}</span>
                      </p>
                    </div>
                    <button onClick={(e) => deleteBattle(item.id, e)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Premium Output Viewport */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><Swords size={16} className="text-rose-400"/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col p-0 relative bg-slate-950">
          
          {!battleData && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-10">
              <Swords size={80} className="text-slate-300 mb-6" />
              <h3 className="text-3xl font-black text-slate-400">{t.canvasAwaits}</h3>
              <p className="text-slate-500 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <Loader2 size={48} className="text-rose-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t.generating}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-700 overflow-y-auto custom-scrollbar">
               
               {/* 🟢 BATTLE HEADER */}
               <div className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 bg-slate-900 border-b border-slate-700 relative overflow-hidden shrink-0">
                  <div className="absolute top-4 left-4 z-50">
                    <button onClick={() => router.push('/chat')} className="flex items-center gap-2 px-4 py-2 font-black rounded-lg transition uppercase tracking-wider text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">💬 Back to AI Chat</button>
                  </div>
                  <div className="absolute -left-32 -top-32 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl"></div>
                  <div className="absolute -right-32 -top-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                  
                  <div className="text-center md:text-right z-10 w-full md:w-1/3">
                     <h2 className="text-3xl md:text-4xl font-black text-rose-600 truncate">{battleData.conceptA}</h2>
                  </div>
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-900 text-white font-black italic flex items-center justify-center text-xl md:text-2xl shadow-xl z-10 border-4 border-white shrink-0">VS</div>
                  <div className="text-center md:text-left z-10 w-full md:w-1/3">
                     <h2 className="text-3xl md:text-4xl font-black text-blue-600 truncate">{battleData.conceptB}</h2>
                  </div>
               </div>

               <div className="p-8 space-y-8 flex-1">
                 
                 {/* 🟢 COMPARISON MATRIX TABLE */}
                 <div className="bg-slate-900 rounded-3xl border border-slate-700 shadow-sm overflow-hidden">
                     <div className="bg-slate-900 px-6 py-4 flex items-center gap-2">
                        <Scale size={18} className="text-amber-400"/>
                        <h3 className="text-white font-black tracking-wide">Comparison Matrix</h3>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-slate-950 border-b border-slate-700">
                                 <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-r border-slate-700 w-1/4">Basis for Comparison</th>
                                 <th className="p-4 text-sm font-black text-rose-600 border-r border-slate-700 w-3/8">{battleData.conceptA}</th>
                                 <th className="p-4 text-sm font-black text-blue-600 w-3/8">{battleData.conceptB}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {battleData.comparisonTable.map((row: any, idx: number) => (
                                 <tr key={idx} className="hover:bg-slate-950 transition-colors">
                                    <td className="p-4 text-xs font-bold text-slate-500 uppercase bg-slate-950/50 border-r border-slate-700">{row.feature}</td>
                                    <td className="p-4 text-sm font-medium text-slate-300 border-r border-slate-700">{row.valA}</td>
                                    <td className="p-4 text-sm font-medium text-slate-300">{row.valB}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                 </div>

                 {/* 🟢 PROS & CONS (DUAL CARDS) */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Concept A Pros/Cons */}
                     <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-black text-rose-700 mb-4">{battleData.conceptA}</h3>
                        
                        <div className="mb-6">
                           <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1"><Check size={14}/> {t.pros}</p>
                           <ul className="space-y-2">
                              {battleData.prosConsA.pros.map((pro: string, i: number) => (
                                 <li key={i} className="text-sm text-slate-300 font-medium flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-400 shrink-0"></span> {pro}
                                 </li>
                              ))}
                           </ul>
                        </div>
                        
                        <div>
                           <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1"><X size={14}/> {t.cons}</p>
                           <ul className="space-y-2">
                              {battleData.prosConsA.cons.map((con: string, i: number) => (
                                 <li key={i} className="text-sm text-slate-300 font-medium flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-rose-400 shrink-0"></span> {con}
                                 </li>
                              ))}
                           </ul>
                        </div>
                     </div>

                     {/* Concept B Pros/Cons */}
                     <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-black text-blue-700 mb-4">{battleData.conceptB}</h3>
                        
                        <div className="mb-6">
                           <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1"><Check size={14}/> {t.pros}</p>
                           <ul className="space-y-2">
                              {battleData.prosConsB.pros.map((pro: string, i: number) => (
                                 <li key={i} className="text-sm text-slate-300 font-medium flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-400 shrink-0"></span> {pro}
                                 </li>
                              ))}
                           </ul>
                        </div>
                        
                        <div>
                           <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1"><X size={14}/> {t.cons}</p>
                           <ul className="space-y-2">
                              {battleData.prosConsB.cons.map((con: string, i: number) => (
                                 <li key={i} className="text-sm text-slate-300 font-medium flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-rose-400 shrink-0"></span> {con}
                                 </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                 </div>

                 {/* 🟢 WHEN TO USE */}
                 <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10"><Target size={120}/></div>
                     <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10"><Lightbulb size={16}/> {t.whenToUse}</h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div>
                           <h4 className="text-lg font-black text-rose-400 mb-2">{battleData.conceptA}</h4>
                           <p className="text-sm font-medium text-slate-300 leading-relaxed">{battleData.whenToUseA}</p>
                        </div>
                        <div>
                           <h4 className="text-lg font-black text-blue-400 mb-2">{battleData.conceptB}</h4>
                           <p className="text-sm font-medium text-slate-300 leading-relaxed">{battleData.whenToUseB}</p>
                        </div>
                     </div>
                 </div>

                 <div className="h-16"></div>
               </div>
            </div>
          )}
          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
              <button 
                onClick={() => setIsMobileDrawerOpen('history')} 
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[13px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white shrink-0"
              >
                <History size={16}/> {t.historyTitle.split(' ')[1] || 'History'}
              </button>
              
              <button 
                onClick={() => setIsMobileDrawerOpen('config')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all active:scale-95 border border-rose-400/50"
              >
                <Swords size={18} /> New Battle
              </button>
            </div>
          </div>
          
        </div>

        {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
        <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
                {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-rose-400"/> {t.historyTitle}</> : <><Swords size={18} className="text-rose-400"/> New Battle</>}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
              {isMobileDrawerOpen === 'history' ? (
                <div className="space-y-3">
                  {historyList.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                  ) : (
                    historyList.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => { 
                          setActiveBattleId(item.id); 
                          setBattleData(item.battle_data); 
                          setConceptA(item.concept_a);
                          setConceptB(item.concept_b);
                          setIsMobileDrawerOpen('none'); 
                        }} 
                        className="group p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2 pr-2">
                          <Scale size={14} className="text-slate-500 group-hover:text-rose-400 shrink-0"/>
                          <p className={`text-xs font-bold ${activeBattleId === item.id ? 'text-rose-300' : 'text-slate-300'}`}>
                             <span className="text-rose-400">{item.concept_a}</span> <span className="text-slate-400 font-mono text-[10px] mx-1">vs</span> <span className="text-blue-400">{item.concept_b}</span>
                          </p>
                        </div>
                        <button onClick={(e) => deleteBattle(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <form onSubmit={(e) => { handleGenerate(e); if(conceptA.trim() && conceptB.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="flex-1">
                       <label className="block text-[10px] font-black tracking-widest text-rose-400 uppercase mb-2">{t.conceptALabel}</label>
                       <input
                         value={conceptA}
                         onChange={(e) => setConceptA(e.target.value)}
                         placeholder={t.conceptAPlaceholder}
                         className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:border-rose-500 outline-none font-bold text-slate-200 shadow-inner transition-all"
                         required
                       />
                     </div>
                  </div>

                  <div className="flex justify-center -my-2 relative z-10">
                     <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-xs font-black text-slate-400 italic">VS</div>
                  </div>

                  <div className="flex items-center gap-4">
                     <div className="flex-1">
                       <label className="block text-[10px] font-black tracking-widest text-blue-400 uppercase mb-2">{t.conceptBLabel}</label>
                       <input
                         value={conceptB}
                         onChange={(e) => setConceptB(e.target.value)}
                         placeholder={t.conceptBPlaceholder}
                         className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-200 shadow-inner transition-all"
                         required
                       />
                     </div>
                  </div>

                  <button type="submit" disabled={isLoading || !conceptA.trim() || !conceptB.trim()} className="w-full mt-4 py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all active:scale-95">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Swords size={18} />}
                    {isLoading ? t.generating : t.generateBtn}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
        
        </div>
      </div>
    </SecureLayout>
  );
}
