'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Briefcase, FileText, Send, CheckCircle2, Copy, Check, Loader2, Sparkles, History, Target, Lightbulb, Trash2, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    title: "Career Hacker", subtitle: "Cold Email & Internship Tailor",
    ragSources: "Your Resumes/CVs (RAG)", targetDesc: "Target Company / Professor Description",
    targetPlaceholder: "e.g., Looking for a thesis supervisor in Deep Learning, or a React.js Internship at TechCorp...",
    cvText: "Paste CV / Experience (Optional if RAG selected)", cvPlaceholder: "Paste your raw resume text or key skills here...",
    generateBtn: "Hack My Career Strategy", generating: "Analyzing Profile & Target...",
    emailDraft: "Cold Email Draft", copyEmail: "Copy Email", copied: "Copied!",
    cvTips: "CV Tailoring Suggestions", history: "Strategy History", noHistory: "No history found.",
    chat: "Chat", alertTarget: "Please enter the target description!", alertCv: "Please paste your CV text or select an indexed CV from RAG sources."
  },
  Bangla: {
    title: "ক্যারিয়ার হ্যাকার", subtitle: "কোল্ড ইমেইল ও ইন্টার্নশিপ টেইলর",
    ragSources: "আপনার সিভি/রেজুমে (RAG)", targetDesc: "টার্গেট কোম্পানি / প্রফেসরের বিবরণ",
    targetPlaceholder: "যেমন: ডিপ লার্নিংয়ে থিসিস সুপারভাইজার খুঁজছি, অথবা TechCorp এ React.js ইন্টার্নশিপ...",
    cvText: "সিভি / অভিজ্ঞতা পেস্ট করুন (RAG সিলেক্ট করলে ঐচ্ছিক)", cvPlaceholder: "আপনার সিভির টেক্সট বা মূল স্কিলগুলো এখানে পেস্ট করুন...",
    generateBtn: "ক্যারিয়ার স্ট্র্যাটেজি তৈরি করুন", generating: "প্রোফাইল এবং টার্গেট বিশ্লেষণ করা হচ্ছে...",
    emailDraft: "কোল্ড ইমেইল ড্রাফট", copyEmail: "ইমেইল কপি করুন", copied: "কপি হয়েছে!",
    cvTips: "সিভি পরিবর্তনের পরামর্শ", history: "স্ট্র্যাটেজি হিস্ট্রি", noHistory: "কোনো হিস্ট্রি পাওয়া যায়নি।",
    chat: "চ্যাট", alertTarget: "অনুগ্রহ করে টার্গেট বিবরণ লিখুন!", alertCv: "অনুগ্রহ করে আপনার সিভির টেক্সট পেস্ট করুন অথবা RAG সোর্স থেকে একটি সিভি নির্বাচন করুন।"
  },
  Hindi: {
    title: "करियर हैकर", subtitle: "कोल्ड ईमेल और इंटर्नशिप टेलर",
    ragSources: "आपके रिज्यूमे/सीवी (RAG)", targetDesc: "लक्षित कंपनी / प्रोफेसर विवरण",
    targetPlaceholder: "उदा., डीप लर्निंग में थीसिस पर्यवेक्षक की तलाश, या टेककॉर्प में रिएक्ट इंटर्नशिप...",
    cvText: "सीवी / अनुभव पेस्ट करें (यदि RAG चुना गया है तो वैकल्पिक)", cvPlaceholder: "अपना सीवी टेक्स्ट या मुख्य कौशल यहां पेस्ट करें...",
    generateBtn: "करियर रणनीति बनाएं", generating: "प्रोफ़ाइल और लक्ष्य का विश्लेषण हो रहा है...",
    emailDraft: "कोल्ड ईमेल ड्राफ्ट", copyEmail: "ईमेल कॉपी करें", copied: "कॉपी हो गया!",
    cvTips: "सीवी बदलने के सुझाव", history: "रणनीति इतिहास", noHistory: "कोई इतिहास नहीं मिला।",
    chat: "चैट", alertTarget: "कृपया लक्षित विवरण दर्ज करें!", alertCv: "कृपया अपना सीवी टेक्स्ट पेस्ट करें या RAG स्रोतों से एक सीवी चुनें।"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function CareerHackerPage() {
  const supabase = createClient();
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const [targetDesc, setTargetDesc] = useState('');
  const [cvText, setCvText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{email_draft: string, cv_suggestions: string[]} | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false); // 🟢 Modal State

  // 🟢 MOBILE UI STATES
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'sources'|'history'>('none');
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
    const loadLanguage = () => { const savedLang = localStorage.getItem('Prepia_language'); if (savedLang) setLanguage(savedLang as LanguageType); };
    loadLanguage(); window.addEventListener('languageChanged', loadLanguage);
    fetchFiles(); fetchHistory();
    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed').order('created_at', { ascending: false });
    if (data) setFiles(data);
  };

  const fetchHistory = async () => {
    const cachedHistory = sessionStorage.getItem('Prepia_career_history');
    if (cachedHistory) {
      setHistoryList(JSON.parse(cachedHistory));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/career/history` : `${apiUrlBase}/api/career/history`;

      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();

      if (data.success) {
        setHistoryList(data.history);
        sessionStorage.setItem('Prepia_career_history', JSON.stringify(data.history));
      }
    } catch (e) {}
  };

  const toggleFile = (id: string) => setSelectedFileIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDesc.trim()) return alert(t.alertTarget);
    if (!cvText.trim() && selectedFileIds.length === 0) return alert(t.alertCv);

    setIsLoading(true); setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/career/tailor` : `${apiUrlBase}/api/career/tailor`;

      const response = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ targetDesc, cvText, fileIds: selectedFileIds, language }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 🟢 CORRECT PLACEMENT: Check for Token Error (402) during feature generation
      if (response.status === 402) {
        setIsTokenModalOpen(true);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        sessionStorage.removeItem('Prepia_career_history');
        setTimeout(() => fetchHistory(), 1500);
      } else {
        showPublicError(data);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        showPublicError();
      } else {
        showPublicError();
      }
    }
    finally { setIsLoading(false); }
  };

  const loadFromHistory = (item: any) => {
    setTargetDesc(item.target_desc);
    setResult({ email_draft: item.email_draft, cv_suggestions: item.cv_suggestions });
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/career/history/${id}` : `${apiUrlBase}/api/career/history/${id}`;

      await fetch(apiUrl, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });

      sessionStorage.removeItem('Prepia_career_history');
      setHistoryList(prev => prev.filter(h => h.id !== id));
    } catch (err) {}
  };

  const copyEmail = () => {
    if (result?.email_draft) {
      navigator.clipboard.writeText(result.email_draft);
      setIsCopied(true); setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const renderSourcesSection = () => (
    <div className="mb-6">
      <h3 className="text-[11px] font-black tracking-widest text-indigo-400 uppercase mb-3 flex items-center gap-1.5"><FileText size={14}/> {t.ragSources}</h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {files.map(file => (
          <div key={file.id} onClick={() => toggleFile(file.id)} className={`group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer border transition-all ${selectedFileIds.includes(file.id) ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
            {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-indigo-400 shrink-0" size={16} /> : <div className="w-4 h-4 border-2 border-slate-600 rounded shrink-0" />}
            <span className={`text-xs font-bold truncate transition ${selectedFileIds.includes(file.id) ? 'text-indigo-300' : 'text-slate-400'}`}>{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistorySection = () => (
    <div className="flex-1 flex flex-col min-h-0 pt-4 border-t border-slate-800/60 pb-6">
       <h3 className="text-[11px] font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2"><History size={14}/> {t.history}</h3>
       <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
         {historyList.length === 0 ? <p className="text-xs text-slate-600 text-center py-4 bg-slate-950 rounded-xl border border-slate-800 border-dashed">{t.noHistory}</p> : (
           historyList.map(h => (
             <div key={h.id} onClick={() => { loadFromHistory(h); setIsMobileDrawerOpen('none'); }} className="p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900 transition-all group relative">
               <p className="text-xs font-bold text-slate-300 line-clamp-2 pr-6">{h.target_desc}</p>
               <button onClick={(e) => deleteHistoryItem(h.id, e)} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"><Trash2 size={14}/></button>
             </div>
           ))
         )}
       </div>
    </div>
  );

  return (
    <SecureLayout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] max-w-7xl mx-auto overflow-hidden bg-slate-950 lg:border lg:border-slate-800 lg:rounded-3xl lg:shadow-2xl lg:mt-4 font-sans relative">

        {/* Mobile Smart Header */}
        <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] shrink-0`}>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><Briefcase size={16} className="text-indigo-400"/> {t.title}</h2>
            <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.title}</p>
          </div>
          <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-slate-100 shadow-md hover:bg-indigo-500">{t.chat}</button>
        </div>

        {/* Desktop Sidebar: Controls & RAG */}
        <div className="hidden lg:flex w-full lg:w-80 bg-slate-900 border-r border-slate-800 p-6 flex-col shrink-0 z-10 overflow-y-auto custom-scrollbar h-full">
          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{t.title}</h2>
              <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          {renderSourcesSection()}
          {renderHistorySection()}
        </div>

        {/* Right Area: Inputs & Results */}
        <div ref={scrollRef} onScroll={handleScroll} className="w-full flex-1 flex flex-col relative overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] h-full custom-scrollbar">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950 pointer-events-none"></div>

          <div className="flex-1 p-4 md:p-10 z-10 space-y-8 pb-32">

            {/* Input Form */}
            <form onSubmit={handleGenerate} className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
              <div>
                <label className="block text-xs font-black tracking-widest text-indigo-400 uppercase mb-2 flex items-center gap-1.5"><Target size={14}/> {t.targetDesc}</label>
                <textarea value={targetDesc} onChange={e => setTargetDesc(e.target.value)} placeholder={t.targetPlaceholder} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none text-white placeholder:text-slate-600 transition-colors resize-none" rows={3} required/>
              </div>

              <div>
                <label className="block text-xs font-black tracking-widest text-emerald-400 uppercase mb-2 flex items-center gap-1.5"><FileText size={14}/> {t.cvText}</label>
                <textarea value={cvText} onChange={e => setCvText(e.target.value)} placeholder={t.cvPlaceholder} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-sm font-medium focus:border-emerald-500 outline-none text-white placeholder:text-slate-600 transition-colors resize-none" rows={4}/>
              </div>

              <button type="submit" disabled={isLoading || !targetDesc.trim()} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} {isLoading ? t.generating : t.generateBtn}
              </button>
            </form>

            {/* Results Section */}
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Email Draft Card */}
                  <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Mail size={100}/></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                      <h3 className="text-sm font-black tracking-widest text-indigo-400 uppercase flex items-center gap-2"><Send size={16}/> {t.emailDraft}</h3>
                      <button onClick={copyEmail} className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                        {isCopied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>} {isCopied ? t.copied : t.copyEmail}
                      </button>
                    </div>
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium h-[350px] overflow-y-auto custom-scrollbar relative z-10 selection:bg-indigo-500/30">
                      {result.email_draft}
                    </div>
                  </div>

                  {/* CV Suggestions Card */}
                  <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Lightbulb size={100}/></div>
                    <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase flex items-center gap-2 mb-6 relative z-10"><Lightbulb size={16}/> {t.cvTips}</h3>
                    <div className="space-y-4 relative z-10 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                      {result.cv_suggestions.map((tip, idx) => (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="flex gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
                          <div className="mt-0.5 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs">{idx + 1}</div>
                          <p className="text-sm text-slate-300 font-medium leading-relaxed">{tip}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Mobile Floating Input Dock */}
        <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
          <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
            <button
              onClick={() => setIsMobileDrawerOpen('history')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 border border-slate-700"
            >
              <History size={18} /> {t.history}
            </button>
            <button
              onClick={() => setIsMobileDrawerOpen('sources')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all active:scale-95 border border-indigo-400/50"
            >
              <FileText size={18} /> {t.ragSources}
            </button>
          </div>
        </div>

        {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
        <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />

          {/* Sources Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'sources' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderSourcesSection()}
          </div>

          {/* History Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'history' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderHistorySection()}
          </div>
        </div>

      </div>

      {/* 🟢 ADDED: OutOfTokens Modal Component */}
      <OutOfTokensModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
      />
    </SecureLayout>
  );
}
