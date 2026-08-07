'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Quote, Lightbulb, Link as LinkIcon, BookOpen, Hash, Loader2, Copy, Check, History, Trash2, Sparkles, BookMarked, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const translations = {
  English: {
    title: "Citation Machine", subtitle: "1-Click Thesis Hacker",
    inputLabel: "Enter DOI, URL, ISBN or BibTeX", inputPlaceholder: "e.g., 10.1038/nature12373 or https://en.wikipedia.org/wiki/AI...",
    styleLabel: "Select Citation Style", generateBtn: "Generate Citation", generating: "Extracting Metadata...",
    resultLabel: "Perfectly Formatted Citation", copyBtn: "Copy", copied: "Copied!",
    history: "Citation History", noHistory: "No citations generated yet.",
    tipsTitle: "Pro Tips for Best Results:",
    tip1: "DOI (e.g., 10.1145/123) gives the most accurate academic results.",
    tip2: "URLs work great for websites and articles.",
    tip3: "ISBNs work well for indexing books."
  },
  Bangla: {
    title: "সাইটেশন মেশিন", subtitle: "১-ক্লিক থিসিস হ্যাকার",
    inputLabel: "DOI, URL, ISBN বা BibTeX দিন", inputPlaceholder: "যেমন: 10.1038/nature12373 অথবা https://en.wikipedia.org/wiki/AI...",
    styleLabel: "সাইটেশন স্টাইল নির্বাচন করুন", generateBtn: "সাইটেশন তৈরি করুন", generating: "মেটাডেটা এক্সট্রাক্ট করা হচ্ছে...",
    resultLabel: "নিখুঁত ফরম্যাটেড সাইটেশন", copyBtn: "কপি", copied: "কপি হয়েছে!",
    history: "সাইটেশন হিস্ট্রি", noHistory: "কোনো সাইটেশন তৈরি হয়নি।",
    tipsTitle: "সেরা ফলাফলের জন্য প্রো টিপস:",
    tip1: "DOI (যেমন: 10.1145/123) সবচেয়ে নিখুঁত একাডেমিক ফলাফল দেয়।",
    tip2: "ওয়েবসাইট এবং আর্টিকেলের জন্য URL খুব ভালো কাজ করে।",
    tip3: "বই ইনডেক্স করার জন্য ISBN ব্যবহার করুন।"
  },
  Hindi: {
    title: "उद्धरण मशीन (Citation)", subtitle: "1-क्लिक थीसिस हैकर",
    inputLabel: "DOI, URL, ISBN या BibTeX दर्ज करें", inputPlaceholder: "उदा., 10.1038/nature12373 या https://en.wikipedia.org/wiki/AI...",
    styleLabel: "उद्धरण शैली चुनें", generateBtn: "उद्धरण बनाएं", generating: "मेटाडेटा निकाला जा रहा है...",
    resultLabel: "पूरी तरह से स्वरूपित उद्धरण", copyBtn: "कॉपी", copied: "कॉपी हो गया!",
    history: "उद्धरण इतिहास", noHistory: "अभी तक कोई उद्धरण नहीं बनाया गया।",
    tipsTitle: "सर्वोत्तम परिणामों के लिए प्रो टिप्स:",
    tip1: "DOI (उदा., 10.1145/123) सबसे सटीक परिणाम देता है।",
    tip2: "URL वेबसाइटों और लेखों के लिए बढ़िया काम करते हैं।",
    tip3: "ISBN पुस्तकों को अनुक्रमित करने के लिए अच्छी तरह काम करते हैं।"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const citationStyles = [
  { id: 'apa', name: 'APA (7th Edition)' },
  { id: 'harvard1', name: 'Harvard' },
  { id: 'mla', name: 'MLA (9th Edition)' },
  { id: 'vancouver', name: 'Vancouver' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'chicago-author-date', name: 'Chicago' }
];

export default function CitationMachinePage() {
  const supabase = createClient();
  const [language, setLanguage] = useState<LanguageType>('English');
  const [uiTheme, setUiTheme] = useState<'dark'|'light'>('dark');
  const t = translations[language] || translations['English'];

  const [inputText, setInputText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('apa');
  const [isLoading, setIsLoading] = useState(false);
  
  const [resultCitation, setResultCitation] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  const [historyList, setHistoryList] = useState<any[]>([]);

  useEffect(() => {
    const loadSettings = () => {
      const savedTheme = localStorage.getItem('Prepia_theme'); 
      if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };
    loadSettings();
    window.addEventListener('languageChanged', loadSettings);
    fetchHistory();
    return () => window.removeEventListener('languageChanged', loadSettings);
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/citation/history` : `${apiUrlBase}/api/citation/history`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (data.success) setHistoryList(data.history);
    } catch (e) {}
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true); setResultCitation('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/citation/generate` : `${apiUrlBase}/api/citation/generate`;
      
      const response = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ input_text: inputText.trim(), style: selectedStyle, language: language })
      });
      const data = await response.json();
      
      if (data.success) {
        setResultCitation(data.citation);
        fetchHistory();
      } else { alert(data.error || "Failed to extract citation data. Try a valid DOI or URL."); }
    } catch (error) { alert("Server connection error."); } 
    finally { setIsLoading(false); }
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/citation/history/${id}` : `${apiUrlBase}/api/citation/history/${id}`;
      await fetch(apiUrl, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      setHistoryList(prev => prev.filter(h => h.id !== id));
    } catch (err) {}
  };

  const copyCitation = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true); setTimeout(() => setIsCopied(false), 2000);
  };

  const loadFromHistory = (item: any) => {
    setInputText(item.input_text);
    setSelectedStyle(item.style);
    setResultCitation(item.citation);
  };

  return (
    <SecureLayout>
      <div className="flex h-[calc(100vh-80px)] max-w-7xl mx-auto overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl mt-4 font-sans relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="flex w-full relative z-10">
          
          {/* Left Panel: Generator Form */}
          <div className="w-full md:w-3/5 p-6 md:p-10 flex flex-col justify-center overflow-y-auto custom-scrollbar border-r border-slate-800 bg-slate-950/50 backdrop-blur-md">
            <div className="mb-8">
              <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Quote size={28} />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-2">{t.title}</h1>
              <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={16}/> {t.subtitle}</p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6 bg-slate-900/80 border border-slate-700 p-6 rounded-3xl shadow-xl">
              <div>
                <label className="block text-xs font-black tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <LinkIcon size={14}/> {t.inputLabel}
                </label>
                <textarea 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  placeholder={t.inputPlaceholder} 
                  className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none text-white placeholder:text-slate-600 transition-colors resize-none" 
                  rows={3} 
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <BookMarked size={14}/> {t.styleLabel}
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {citationStyles.map(style => (
                    <div 
                      key={style.id} 
                      onClick={() => setSelectedStyle(style.id)} 
                      className={`p-3 rounded-xl border text-center cursor-pointer font-bold text-xs transition-all duration-200 ${selectedStyle === style.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'}`}
                    >
                      {style.name}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isLoading || !inputText.trim()} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Quote size={18}/>} {isLoading ? t.generating : t.generateBtn}
              </button>
            </form>

            <AnimatePresence>
              {resultCitation && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-indigo-950/30 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative group">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black tracking-widest text-indigo-300 uppercase flex items-center gap-2"><CheckCircle2 size={16}/> {t.resultLabel}</h3>
                    <button onClick={() => copyCitation(resultCitation)} className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                      {isCopied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>} {isCopied ? t.copied : t.copyBtn}
                    </button>
                  </div>
                  <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-900/50 text-white text-[15px] leading-relaxed font-serif selection:bg-indigo-500/30 shadow-inner">
                    {resultCitation}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Lightbulb size={14}/> {t.tipsTitle}</h4>
              <ul className="text-xs font-medium text-slate-400 space-y-2">
                <li className="flex gap-2 items-start"><Hash size={14} className="shrink-0 text-emerald-500/50"/> {t.tip1}</li>
                <li className="flex gap-2 items-start"><LinkIcon size={14} className="shrink-0 text-emerald-500/50"/> {t.tip2}</li>
                <li className="flex gap-2 items-start"><BookOpen size={14} className="shrink-0 text-emerald-500/50"/> {t.tip3}</li>
              </ul>
            </div>
          </div>

          {/* Right Panel: History */}
          <div className="hidden md:flex w-2/5 flex-col bg-slate-950/80 backdrop-blur-sm border-l border-slate-800 p-6">
            <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase mb-6 flex items-center gap-2"><History size={16}/> {t.history}</h3>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {historyList.length === 0 ? <p className="text-xs text-slate-500 text-center py-10 border border-slate-800 border-dashed rounded-2xl">{t.noHistory}</p> : (
                historyList.map(h => (
                  <div key={h.id} onClick={() => loadFromHistory(h)} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800 transition-all group relative shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">{h.style.toUpperCase()}</span>
                      <button onClick={(e) => deleteHistoryItem(h.id, e)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium line-clamp-1 mb-2">Input: {h.input_text}</p>
                    <p className="text-sm font-serif text-slate-200 line-clamp-2 leading-relaxed">{h.citation}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </SecureLayout>
  );
}
