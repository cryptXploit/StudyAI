'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Wand2, Sparkles, Loader2, History, Trash2, ShieldCheck, Image as ImageIcon, Copy, Check, X, FileSignature, Columns } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { fetchUserFiles, File as DBFile } from '@/services/dashboard.service';

const translations = {
  English: {
    title: "Notes Purifier",
    subtitle: "Turn messy handwritten photos into crisp, typed documents",
    uploadLabel: "Upload Note Images (Max 5)",
    generateBtn: "Purify Notes",
    generating: "Extracting & Purifying...",
    historyTitle: "Purified Library",
    noHistory: "No notes purified yet.",
    awaitsTitle: "Upload to Purify",
    awaitsDesc: "Select up to 5 photos of messy class notes. AI will extract the text, fix handwriting errors, and generate a beautiful markdown document.",
    copyBtn: "Copy Notes",
    compareBtn: "Compare Original",
    copied: "Copied!",
    proBadge: "PRO TIER FEATURE",
    newNote: "New Note",
    ocrRunning: "Running local OCR & AI formatting...",
    successMsg: "Digitized & Purified successfully",
    compareTitle: "Parallel Comparison",
    compareSub: "Original vs Purified",
    closeView: "Close View",
    originalNotes: "Original Messy Notes",
    purifiedDoc: "AI Purified Document"
  },
  Bangla: {
    title: "নোটস পিউরিফায়ার",
    subtitle: "বন্ধুর হাতের ঝাপসা খাতা থেকে একদম নিখুঁত টাইপ করা নোটস",
    uploadLabel: "খাতার ছবি আপলোড করুন (সর্বোচ্চ ৫টি)",
    generateBtn: "নোটস পিউরিফাই করুন",
    generating: "টেক্সট উদ্ধার ও সাজানো হচ্ছে...",
    historyTitle: "পিউরিফাইড লাইব্রেরি",
    noHistory: "এখনো কোনো নোটস পিউরিফাই করা হয়নি।",
    awaitsTitle: "ছবি আপলোডের অপেক্ষায়",
    awaitsDesc: "বন্ধুর খাতার কয়েকটি ছবি সিলেক্ট করুন। এআই হাতের লেখা উদ্ধার করে চমৎকার একটি ক্লিন ডক বানিয়ে দেবে।",
    copyBtn: "নোটস কপি করুন",
    compareBtn: "আসল নোটের সাথে মিলান",
    copied: "কপি হয়েছে!",
    proBadge: "প্রো-টিয়ার ফিচার",
    newNote: "নতুন নোট",
    ocrRunning: "লোকাল ওসিআর ও এআই ফরম্যাটিং চলছে...",
    successMsg: "ডিজিটাইজ ও পিউরিফাই সফল হয়েছে",
    compareTitle: "প্যারালাল কম্প্যারিজন",
    compareSub: "আসল বনাম পিউরিফাইড",
    closeView: "ভিউ বন্ধ করুন",
    originalNotes: "আসল খাতা",
    purifiedDoc: "এআই পিউরিফাইড ডক"
  },
  Hindi: {
    title: "नोट्स प्यूरीफायर",
    subtitle: "गंदे हस्तलिखित फोटो को साफ टाइप किए गए दस्तावेज़ों में बदलें",
    uploadLabel: "नोट की छवियां अपलोड करें (अधिकतम 5)",
    generateBtn: "नोट्स को शुद्ध करें",
    generating: "निकाला और शुद्ध किया जा रहा है...",
    historyTitle: "प्यूरीफाइड लाइब्रेरी",
    noHistory: "अभी तक कोई नोट्स शुद्ध नहीं किया गया।",
    awaitsTitle: "प्यूरीफाई करने के लिए अपलोड करें",
    awaitsDesc: "कक्षा के गंदे नोट्स के 5 फोटो चुनें। AI टेक्स्ट निकालेगा और एक सुंदर दस्तावेज़ तैयार करेगा।",
    copyBtn: "नोट्स कॉपी करें",
    compareBtn: "मूल से तुलना करें",
    copied: "कॉपी हो गया!",
    proBadge: "प्रो टियर फ़ीचर",
    newNote: "नया नोट",
    ocrRunning: "लोकल OCR और AI फ़ॉर्मेटिंग चल रहा है...",
    successMsg: "डिजिटाइज़ और प्यूरीफाई सफल हुआ",
    compareTitle: "समानांतर तुलना",
    compareSub: "मूल बनाम शुद्ध",
    closeView: "दृश्य बंद करें",
    originalNotes: "मूल गंदे नोट्स",
    purifiedDoc: "AI शुद्ध दस्तावेज़"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const MemoizedMarkdown = React.memo(({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeKatex]}
      components={{
        table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-slate-700 rounded-xl shadow-sm"><table className="min-w-full divide-y divide-slate-700" {...props}/></div>,
        thead: ({node, ...props}) => <thead className="bg-slate-800" {...props}/>,
        th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700" {...props}/>,
        td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300 border-b border-slate-700 leading-relaxed" { ...props}/>,
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-300 font-medium" {...props} />
      }}
    >
      {content}
    </ReactMarkdown>
  );
}, (prev, next) => prev.content === next.content);


export default function PurifierPage() {
  const supabase = createClient();
  const [userFiles, setUserFiles] = useState<DBFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); // Optional if we still want to preview images from DB, but we'll disable it for now since they are PDFs/Docs mostly.

  const [isLoading, setIsLoading] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [purifiedContent, setPurifiedContent] = useState<{title: string, content: string} | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // 🟢 NEW: State for Parallel Comparison View
  const [compareMode, setCompareMode] = useState(false);
  const [sessionImages, setSessionImages] = useState<string[]>([]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  // 🟢 MOBILE UI STATES
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'history'|'config'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

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

  // 🟢 FIXED: Wrapped in try-catch to prevent "Failed to fetch" crashes
  const fetchHistory = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn("Auth Check:", authError?.message || "No user found");
        return;
      }

      const { data, error } = await supabase.from('purified_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Database Fetch Error:", error.message);
        return;
      }
      if (data) setHistoryList(data);

    } catch (err: any) {
      console.error("🚨 Supabase Connection Failed:", err.message || err);
    }
  };

  const loadFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      try {
        const files = await fetchUserFiles(user.id);
        setUserFiles(files.filter(f => f.status === 'chunking_complete' || f.status === 'indexed'));
      } catch (err) {
        console.error("Failed to load user files for Purifier", err);
      }
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);



  const submitPurification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFileIds.length === 0 || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setPurifiedContent(null);
    setCompareMode(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 Minutes Timeout Limit

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/purifier/purify` : `${apiUrlBase}/api/purifier/purify`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ fileIds: selectedFileIds, language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 15);
            setShowTokenModal(true);
            setIsLoading(false);
            return;
        }
      }

      const data = await response.json();
      if (!data.valid || !data.content) throw new Error(data.error || "Failed to extract text.");

      // Save images to session memory for Parallel Comparison View
      setSessionImages([...previewUrls]);

      setPurifiedContent({ title: data.title, content: data.content });
      if (data.savedId) setActiveNoteId(data.savedId);

      refreshTokens();
      fetchHistory();

      // 🟢 Memory cleanup for UI preview URLs
      setSessionImages([...previewUrls]);
      setSelectedFileIds([]);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        showPublicError();
      } else {
        showPublicError();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🟢 FIXED: Safe deletion with try-catch
  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('purified_notes').delete().eq('id', id);
      if (activeNoteId === id) {
        setActiveNoteId(null);
        setPurifiedContent(null);
        setSessionImages([]);
      }
      fetchHistory();
    } catch (err: any) {
      console.error("🚨 Failed to delete note:", err.message || err);
    }
  };

  const handleCopy = () => {
    if (purifiedContent) {
      navigator.clipboard.writeText(`# ${purifiedContent.title}\n\n${purifiedContent.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

        {/* Left Panel: Upload Zone (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Wand2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-xs font-bold text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={submitPurification} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t.uploadLabel}</label>
              <div className="w-full max-h-48 overflow-y-auto border border-slate-800 rounded-2xl p-2 bg-slate-900 custom-scrollbar space-y-1">
                {userFiles.length === 0 ? (
                  <div className="p-4 text-center text-xs font-bold text-slate-500">
                    No sources found in Dashboard
                  </div>
                ) : (
                  userFiles.map(file => {
                    const isSelected = selectedFileIds.includes(file.id);
                    return (
                      <div 
                        key={file.id} 
                        onClick={() => {
                          setSelectedFileIds(prev => 
                            isSelected ? prev.filter(id => id !== file.id) : [...prev, file.id]
                          );
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm' : 'bg-slate-800 border-transparent hover:border-slate-700'}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 bg-slate-700'}`}>
                          {isSelected && <Check size={12} />}
                        </div>
                        <span className={`text-sm font-bold truncate flex-1 ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {file.name || 'Untitled Source'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button type="submit" disabled={isLoading || selectedFileIds.length === 0} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-400 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
              <History size={14} className="text-emerald-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium text-center py-4 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                  {t.noHistory}
                </p>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveNoteId(item.id);
                      setPurifiedContent({ title: item.title, content: item.purified_text });
                      setSelectedFileIds([]); setPreviewUrls([]);
                      setSessionImages([]); // Hide compare button for history notes since images are not stored in DB
                    }}
                    className={`group p-3 rounded-xl cursor-pointer transition-all border flex justify-between items-center ${activeNoteId === item.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileSignature size={14} className="text-slate-500 group-hover:text-emerald-400 shrink-0"/>
                      <p className={`text-sm font-bold truncate max-w-[180px] ${activeNoteId === item.id ? 'text-emerald-300' : 'text-slate-300'}`}>{item.title}</p>
                    </div>
                    <button onClick={(e) => deleteNote(item.id, e)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Output Viewer */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-emerald-900/90 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-emerald-400"><Wand2 size={16}/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col p-0 relative bg-slate-900">

          {!purifiedContent && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-10">
              <Wand2 size={80} className="text-slate-300 mb-6" />
              <h3 className="text-3xl font-black text-slate-400">{t.awaitsTitle}</h3>
              <p className="text-slate-500 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t.generating}</p>
              <p className="text-xs text-slate-400 mt-2">{t.ocrRunning}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-700 bg-slate-900">

               <div className="p-8 border-b border-slate-700 bg-slate-900 flex justify-between items-start z-10 shadow-sm">
                  <div>
                    <h2 className="text-3xl font-black text-slate-200 mb-1">{purifiedContent?.title}</h2>
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">{t.successMsg}</p>
                  </div>
                  <div className="flex gap-3">
                    {/* 🟢 NEW: Compare Mode Button (Visible only for active session) */}
                    {sessionImages.length > 0 && (
                      <button onClick={() => setCompareMode(true)} className="p-2.5 bg-slate-800 border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 rounded-xl shadow-sm transition-all flex items-center gap-2">
                        <Columns size={16} />
                        <span className="text-xs font-bold hidden md:inline">{t.compareBtn}</span>
                      </button>
                    )}
                    <button onClick={handleCopy} className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all flex items-center gap-2">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span className="text-xs font-bold">{copied ? t.copied : t.copyBtn}</span>
                    </button>
                  </div>
               </div>

               <div className="flex-1 w-full relative py-8 px-4 lg:px-12 overflow-y-auto custom-scrollbar">
                  <div className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:text-slate-200 prose-p:leading-relaxed prose-p:text-slate-300 prose-strong:text-white prose-a:text-emerald-600 prose-li:marker:text-emerald-500">
                    {purifiedContent && <MemoizedMarkdown content={purifiedContent.content} />}
                  </div>
                  <div className="h-20" />
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
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 border border-emerald-400/50"
              >
                <Sparkles size={18} /> {t.newNote}
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
                {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-emerald-400"/> {t.historyTitle}</> : <><Sparkles size={18} className="text-emerald-400"/> {t.newNote}</>}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
              {isMobileDrawerOpen === 'history' ? (
                <div className="space-y-3">
                  {historyList.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                  ) : (
                    historyList.map(item => {
                      const isActive = activeNoteId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setActiveNoteId(item.id);
                            setPurifiedContent({ title: item.title, content: item.purified_text });
                            setSelectedFileIds([]); setPreviewUrls([]);
                            setSessionImages([]);
                            setIsMobileDrawerOpen('none');
                          }}
                          className={`group p-4 bg-slate-950 border rounded-xl cursor-pointer hover:shadow-md transition-all ${isActive ? 'border-emerald-500/50' : 'border-slate-800'}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileSignature size={14} className="text-slate-500 shrink-0"/>
                              <h4 className={`font-bold text-sm truncate pr-2 ${isActive ? 'text-emerald-300' : 'text-slate-200'}`}>{item.title}</h4>
                            </div>
                            <button onClick={(e) => deleteNote(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              ) : (
                <form onSubmit={(e) => { submitPurification(e); if(selectedFileIds.length > 0) setIsMobileDrawerOpen('none'); }} className="space-y-6">
                  <div className="space-y-4">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t.uploadLabel}</label>
                    <div className="w-full max-h-48 overflow-y-auto border border-slate-800 rounded-2xl p-2 bg-slate-900 custom-scrollbar space-y-1">
                      {userFiles.length === 0 ? (
                        <div className="p-4 text-center text-xs font-bold text-slate-500">
                          No sources found in Dashboard
                        </div>
                      ) : (
                        userFiles.map(file => {
                          const isSelected = selectedFileIds.includes(file.id);
                          return (
                            <div 
                              key={file.id} 
                              onClick={() => {
                                setSelectedFileIds(prev => 
                                  isSelected ? prev.filter(id => id !== file.id) : [...prev, file.id]
                                );
                              }}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm' : 'bg-slate-800 border-transparent hover:border-slate-700'}`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 bg-slate-700'}`}>
                                {isSelected && <Check size={12} />}
                              </div>
                              <span className={`text-sm font-bold truncate flex-1 ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {file.name || 'Untitled Source'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading || selectedFileIds.length === 0} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-400 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isLoading ? t.generating : t.generateBtn}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* 🟢 NEW: Full Screen Parallel Comparison View Modal */}
        {compareMode && purifiedContent && (
          <div className="fixed inset-0 z-[100] bg-slate-800 flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="h-20 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Columns className="text-emerald-400" size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-200 tracking-tight">{t.compareTitle}</h2>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-4 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">{t.compareSub}</span>
              </div>
              <button onClick={() => setCompareMode(false)} className="px-5 py-2.5 bg-slate-800 border border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-slate-300 rounded-xl transition-all flex items-center gap-2 shadow-sm">
                 <X size={18} />
                 <span className="text-sm font-bold">{t.closeView}</span>
              </button>
            </div>

            {/* Split View Container */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* Left: Original Images */}
               <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[#0f172a] p-4 md:p-10 overflow-y-auto custom-scrollbar md:border-r border-b md:border-b-0 border-slate-700 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] flex flex-col items-center">
                  <div className="w-full max-w-2xl">
                     <p className="text-slate-400 font-mono text-sm font-black tracking-widest uppercase mb-8 text-center bg-slate-900 py-3 rounded-xl border border-slate-800">{t.originalNotes}</p>
                     {sessionImages.map((src, idx) => (
                        <div key={idx} className="relative mb-10">
                          <span className="absolute -top-3 -left-3 bg-indigo-500 text-white w-8 h-8 flex items-center justify-center rounded-full font-black text-xs shadow-lg border-2 border-[#0f172a] z-10">{idx + 1}</span>
                          <img src={src} alt={`Original page ${idx + 1}`} className="w-full rounded-2xl border-4 border-slate-800 shadow-2xl" />
                        </div>
                     ))}
                  </div>
               </div>

               {/* Right: Purified Text */}
               <div className="w-full md:w-1/2 h-1/2 md:h-full bg-slate-900 p-6 md:p-12 overflow-y-auto custom-scrollbar">
                  <div className="w-full max-w-3xl mx-auto">
                     <p className="text-emerald-400 font-mono text-sm font-black tracking-widest uppercase mb-8 text-center bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/30">{t.purifiedDoc}</p>
                     <div className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:text-slate-200 prose-p:leading-relaxed prose-p:text-slate-300 prose-strong:text-white prose-a:text-emerald-600 prose-li:marker:text-emerald-500 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
                        <MemoizedMarkdown content={purifiedContent.content} />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </SecureLayout>
  );
}
