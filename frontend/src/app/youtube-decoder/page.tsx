'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Loader2, History, Trash2, ShieldCheck, PlaySquare, GraduationCap, Copy, Check, ListChecks, Maximize2, Minimize2, X, Clock, AlertCircle } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import { getPublicErrorMessage, showPublicError } from '@/lib/errors/publicError';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const translations = {
  English: {
    title: "YouTube Decoder",
    subtitle: "Convert long lectures into instant crash courses",
    urlLabel: "YouTube Video URL",
    placeholder: "Paste a YouTube link (e.g., https://youtube.com/watch?v=...)",
    fetchBtn: "Analyze Video",
    decodeBtn: "Decode Selected Chapters",
    fetching: "Scanning Video Chapters...",
    decoding: "Compiling Crash Course...",
    historyTitle: "Decoded Courses",
    noHistory: "No videos decoded yet.",
    canvasAwaits: "Lecture Awaits",
    awaitsDesc: "Paste any YouTube tutorial or lecture link to extract and decode.",
    selectChaptersTitle: "Select Chapters",
    selectChaptersDesc: "Select the specific parts of the video you want to decode. This saves processing time and generates high-quality notes.",
    crashCourse: "Crash Course",
    chatBtn: "Chat",
    sourceVideo: "Source Video",
    crashCourseNotes: "Crash Course Notes",
    saved: "Saved",
    newVideo: "New Video",
    pleaseSelectChapter: "Please select at least one chapter."
  },
  Bangla: {
    title: "ইউটিউব ডিকোডার",
    subtitle: "যেকোনো বড় লেকচারকে ইনস্ট্যান্ট ক্র্যাশ কোর্সে রূপান্তর করুন",
    urlLabel: "ইউটিউব ভিডিও লিংক",
    placeholder: "ইউটিউব লিংক পেস্ট করুন...",
    fetchBtn: "ভিডিও অ্যানালাইজ করুন",
    decodeBtn: "সিলেক্টেড অংশ ডিকোড করুন",
    fetching: "চ্যাপ্টার খোঁজা হচ্ছে...",
    decoding: "ক্র্যাশ কোর্স তৈরি হচ্ছে...",
    historyTitle: "ডিকোড করা কোর্সসমূহ",
    noHistory: "এখনো কোনো ভিডিও ডিকোড করা হয়নি।",
    canvasAwaits: "লেকচারের অপেক্ষায়",
    awaitsDesc: "ইউটিউব টিউটোরিয়াল বা লেকচারের লিংক দিন। এআই তা ডিকোড করবে।",
    selectChaptersTitle: "চ্যাপ্টার নির্বাচন করুন",
    selectChaptersDesc: "ভিডিওর নির্দিষ্ট অংশগুলো নির্বাচন করুন যা আপনি ডিকোড করতে চান। এটি সময় বাঁচাবে এবং উচ্চ মানের নোট তৈরি করবে।",
    crashCourse: "ক্র্যাশ কোর্স",
    chatBtn: "চ্যাট",
    sourceVideo: "সোর্স ভিডিও",
    crashCourseNotes: "ক্র্যাশ কোর্স নোটস",
    saved: "সংরক্ষিত",
    newVideo: "নতুন ভিডিও",
    pleaseSelectChapter: "অনুগ্রহ করে অন্তত একটি চ্যাপ্টার নির্বাচন করুন।"
  },
  Hindi: {
    title: "यूट्यूब डिकोडर",
    subtitle: "लंबे व्याख्यानों को त्वरित क्रैश कोर्स में बदलें",
    urlLabel: "यूट्यूब वीडियो URL",
    placeholder: "यूट्यूब लिंक पेस्ट करें...",
    fetchBtn: "वीडियो का विश्लेषण करें",
    decodeBtn: "चयनित अध्याय डिकोड करें",
    fetching: "अध्याय स्कैन हो रहा है...",
    decoding: "कोर्स संकलित किया जा रहा है...",
    historyTitle: "डिकोड किए गए कोर्स",
    noHistory: "अभी तक कोई वीडियो डिकोड नहीं किया गया।",
    canvasAwaits: "व्याख्यान की प्रतीक्षा है",
    awaitsDesc: "क्रैश कोर्स के लिए यूट्यूब लिंक पेस्ट करें।",
    selectChaptersTitle: "अध्याय चुनें",
    selectChaptersDesc: "वीडियो के उन विशिष्ट भागों का चयन करें जिन्हें आप डिकोड करना चाहते हैं। इससे समय की बचत होगी और उच्च गुणवत्ता वाले नोट्स तैयार होंगे।",
    crashCourse: "क्रैश कोर्स",
    chatBtn: "चैट",
    sourceVideo: "स्रोत वीडियो",
    crashCourseNotes: "क्रैश कोर्स नोट्स",
    saved: "सहेजा गया",
    newVideo: "नया वीडियो",
    pleaseSelectChapter: "कृपया कम से कम एक अध्याय चुनें।"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const MemoizedMarkdown = React.memo(({ content }: { content: string }) => {
  // 🟢 FIXED: Smart Pre-processor to auto-fix AI's broken LaTeX & Newlines before rendering
  const cleanContent = content
    ? content
        .replace(/\\n/g, '\n')         // Convert literal \n strings to actual line breaks
        .replace(/\\\\/g, '\\')        // Fix over-escaped backslashes
        .replace(/\\\(/g, '$')         // Convert invalid \( math inline to $
        .replace(/\\\)/g, '$')         // Convert invalid \) math inline to $
        .replace(/\\\[/g, '$$')        // Convert invalid \[ math block to $$
        .replace(/\\\]/g, '$$')        // Convert invalid \] math block to $$
    : '';

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
      rehypePlugins={[rehypeKatex]}
      components={{
        table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-slate-700 rounded-xl shadow-sm"><table className="min-w-full divide-y divide-slate-200" {...props}/></div>,
        thead: ({node, ...props}) => <thead className="bg-red-50" {...props}/>,
        th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b" {...props}/>,
        td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300 border-b leading-relaxed" { ...props}/>,
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-300 font-medium" {...props} />,
        code: ({node, inline, className, children, ...props}: any) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <div className="rounded-xl overflow-hidden bg-slate-900 my-4 shadow-md">
              <div className="bg-slate-800 px-4 py-2 text-xs font-mono text-slate-400 border-b border-slate-700">{match ? match[1] : 'code'}</div>
              <pre className="p-4 overflow-x-auto text-sm text-emerald-400 font-mono"><code {...props}>{children}</code></pre>
            </div>
          ) : (
            <code className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-mono text-sm border border-red-100" {...props}>{children}</code>
          );
        }
      }}
    >
      {cleanContent}
    </ReactMarkdown>
  );
}, (prev, next) => prev.content === next.content);

export default function YoutubeDecoderPage() {
  const supabase = createClient();
  const [videoUrl, setVideoUrl] = useState('');
  
  const [isFetching, setIsFetching] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [chapters, setChapters] = useState<{id: number, timeLabel: string, selected: boolean}[]>([]);
  const [tempVideoId, setTempVideoId] = useState<string | null>(null);

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [isNotesFullscreen, setIsNotesFullscreen] = useState(false);

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

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('youtube_courses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setHistoryList(data);
    } catch (e) {}
  };

  const handleFetchChapters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || isFetching) return;

    setIsFetching(true);
    setUiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/youtube/fetch-chapters` : `${apiUrlBase}/api/youtube/fetch-chapters`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ videoUrl })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const processedChapters = data.chapters.map((ch: any, idx: number) => ({ ...ch, selected: idx < 2 }));
      setChapters(processedChapters);
      setTempVideoId(data.videoId);
      setShowModal(true);
    } catch (err: any) {
      const message = getPublicErrorMessage();
      setUiError(message);
      showPublicError();
    } finally {
      setIsFetching(false);
    }
  };

  const handleDecode = async () => {
    const selectedChapterIds = chapters.filter(c => c.selected).map(c => c.id);
    if (selectedChapterIds.length === 0) return alert(t.pleaseSelectChapter);

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setShowModal(false);
    setIsDecoding(true);
    setCourseData(null);
    setUiError(null);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support for Sequential Backend Execution
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 Minutes Timeout Limit

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/youtube/decode` : `${apiUrlBase}/api/youtube/decode`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ videoUrl, videoId: tempVideoId, selectedChapterIds, language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 15);
            setShowTokenModal(true);
            setIsDecoding(false);
            return;
        }
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setCourseData(data.courseData);
      setActiveVideoId(data.videoId);
      if (data.savedId) setActiveCourseId(data.savedId);
      
      refreshTokens();
      fetchHistory();
    } catch (err: any) {
      const message = getPublicErrorMessage();
      setUiError(message);
      showPublicError();
    } finally {
      setIsDecoding(false);
    }
  };

  const deleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('youtube_courses').delete().eq('id', id);
    if (activeCourseId === id) {
      setActiveCourseId(null); setCourseData(null); setActiveVideoId(null);
    }
    fetchHistory();
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
        
        {/* 🟢 MODAL: Chapter Selection */}
        {showModal && (
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-white">
                     <ListChecks size={20} className="text-red-500" />
                     <h3 className="font-black text-lg">{t.selectChaptersTitle}</h3>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
               </div>
               <div className="p-6">
                  <p className="text-sm font-medium text-slate-500 mb-4">{t.selectChaptersDesc}</p>
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2 mb-6">
                     {chapters.map((ch, idx) => (
                        <label key={ch.id} className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${ch.selected ? 'bg-red-50 border-red-200' : 'bg-slate-950 border-slate-700 hover:bg-slate-800'}`}>
                           <input type="checkbox" checked={ch.selected} onChange={() => {
                             const newCh = [...chapters];
                             newCh[idx].selected = !newCh[idx].selected;
                             setChapters(newCh);
                           }} className="w-5 h-5 accent-red-500 rounded cursor-pointer" />
                           <div className="flex items-center gap-2">
                             <Clock size={16} className={ch.selected ? 'text-red-500' : 'text-slate-400'}/>
                             <span className={`font-bold text-sm ${ch.selected ? 'text-red-700' : 'text-slate-400'}`}>{ch.timeLabel}</span>
                           </div>
                        </label>
                     ))}
                  </div>
                  <button onClick={handleDecode} disabled={!chapters.some(c => c.selected) || isDecoding} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                     <Sparkles size={18}/> {t.decodeBtn}
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Left Panel: Inputs (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative z-10">
          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <PlaySquare size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleFetchChapters} className="space-y-4">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={t.placeholder}
              className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-red-500 outline-none font-medium text-slate-200 shadow-inner"
              required
            />
            <button type="submit" disabled={isFetching || isDecoding || !videoUrl.trim()} className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95">
              {isFetching || isDecoding ? <Loader2 size={18} className="animate-spin" /> : <ListChecks size={18} />}
              {isFetching ? t.fetching : isDecoding ? t.decoding : t.fetchBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-8 pt-6 border-t border-slate-800/50 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2 shrink-0">
              <History size={14} className="text-red-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.map((item) => (
                <div key={item.id} className={`group p-3 rounded-xl transition-all border flex flex-col ${activeCourseId === item.id ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => { setActiveCourseId(item.id); setCourseData(item.course_data); setActiveVideoId(item.video_id); setUiError(null); setVideoStartTime(0); }}>
                    <div className="flex items-center gap-2 truncate pr-2">
                      <PlaySquare size={14} className="text-slate-500 shrink-0"/>
                      <p className={`text-xs font-bold truncate ${activeCourseId === item.id ? 'text-red-300' : 'text-slate-300'}`}>{item.course_data.title}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteCourse(item.id, e); }} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
                  </div>
                  {activeCourseId === item.id && item.course_data.timestamps && (
                    <div className="mt-2 pl-6 flex flex-wrap gap-2">
                      {item.course_data.timestamps.map((ts: any) => (
                        <button key={ts.id} onClick={() => setVideoStartTime(ts.startSeconds)} className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md hover:bg-slate-700 transition-colors">
                           <Clock size={10} /> {ts.timeLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Side-by-Side Dual View */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-800">
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><PlaySquare size={16} className="text-red-400"/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.crashCourse}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">{t.chatBtn}</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col p-0 relative bg-slate-800">
          
          {uiError && (
             <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-red-700 leading-relaxed">{uiError}</p>
             </div>
          )}

          {!courseData && !isFetching && !isDecoding && !uiError ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60 p-10">
              <PlaySquare size={80} className="text-slate-300 mb-6" />
              <h3 className="text-3xl font-black text-slate-400">{t.canvasAwaits}</h3>
              <p className="text-slate-500 mt-2 max-w-sm text-center">{t.awaitsDesc}</p>
            </div>
          ) : isFetching || isDecoding ? (
            <div className="h-full flex flex-col items-center justify-center p-10">
              <Loader2 size={48} className="text-red-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{isFetching ? t.fetching : t.decoding}</p>
            </div>
          ) : courseData ? (
            <div className="w-full h-full flex flex-col lg:flex-row">
               
               {/* Embedded YouTube Player */}
               {activeVideoId && (
                 <div className={`transition-all duration-300 bg-slate-950 border-slate-800 flex flex-col z-30 shrink-0 shadow-md lg:shadow-none ${isVideoFullscreen ? 'fixed inset-0 z-[100]' : isNotesFullscreen ? 'hidden' : 'w-full lg:w-1/2 h-64 lg:h-full border-b lg:border-b-0 lg:border-r sticky top-0 lg:relative'}`}>
                    <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                       <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2"><PlaySquare size={12}/> {t.sourceVideo}</span>
                       <button onClick={() => setIsVideoFullscreen(!isVideoFullscreen)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
                          {isVideoFullscreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                       </button>
                    </div>
                    <div className="flex-1 w-full relative">
                      <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${activeVideoId}?start=${videoStartTime}&autoplay=1`} allowFullScreen></iframe>
                    </div>
                 </div>
               )}

               {/* Markdown Notes */}
               <div className={`transition-all duration-300 bg-slate-900 flex flex-col relative ${isNotesFullscreen ? 'fixed inset-0 z-[100]' : isVideoFullscreen ? 'hidden' : 'w-full lg:w-1/2 flex-1 lg:h-full'}`}>
                  <div className="p-4 border-b border-slate-700 bg-red-50/50 flex justify-between items-start z-10 shrink-0">
                     <div className="flex-1 pr-4">
                       <h2 className="text-lg font-black text-slate-200 mb-1 leading-tight">{courseData.title}</h2>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">{courseData.summary}</p>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { navigator.clipboard.writeText(courseData.markdownContent); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 bg-slate-900 border border-slate-700 hover:bg-red-50 text-slate-400 rounded-xl shadow-sm">
                          {copied ? <Check size={16} className="text-red-500" /> : <Copy size={16} />}
                        </button>
                        <button onClick={() => setIsNotesFullscreen(!isNotesFullscreen)} className="p-2 bg-slate-900 border border-slate-700 hover:bg-slate-950 text-slate-400 rounded-xl shadow-sm">
                          {isNotesFullscreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                        </button>
                     </div>
                  </div>
                  <div className="flex-1 w-full relative py-6 px-8 overflow-y-auto custom-scrollbar">
                     <div className="flex items-center gap-2 mb-6">
                        <GraduationCap size={18} className="text-red-500"/>
                        <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">{t.crashCourseNotes}</h3>
                     </div>
                     <div className="prose prose-slate prose-sm max-w-none prose-headings:font-black prose-headings:text-slate-200 prose-a:text-red-600">
                       <MemoizedMarkdown content={courseData.markdownContent} />
                     </div>
                     <div className="h-16" />
                  </div>
               </div>
            </div>
          ) : null}
          
          <div className="h-24 lg:h-0"></div>
          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
              <button 
                onClick={() => setIsMobileDrawerOpen('history')} 
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[13px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white shrink-0"
              >
                <History size={16}/> {t.saved}
              </button>
              
              <button 
                onClick={() => setIsMobileDrawerOpen('config')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all active:scale-95 border border-red-400/50"
              >
                <PlaySquare size={18} /> {t.newVideo}
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
                {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-red-400"/> {t.historyTitle}</> : <><PlaySquare size={18} className="text-red-400"/> {t.newVideo}</>}
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
                        className={`group p-4 bg-slate-950 border rounded-xl transition-all flex flex-col ${activeCourseId === item.id ? 'border-red-500/50' : 'border-slate-800'}`}
                      >
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => { 
                          setActiveCourseId(item.id); 
                          setCourseData(item.course_data); 
                          setActiveVideoId(item.video_id); 
                          setUiError(null); 
                          setVideoStartTime(0);
                          if (!item.course_data.timestamps) setIsMobileDrawerOpen('none'); 
                        }}>
                          <div className="flex items-center gap-2 truncate pr-2">
                            <PlaySquare size={14} className="text-slate-500 shrink-0"/>
                            <p className={`text-xs font-bold truncate ${activeCourseId === item.id ? 'text-red-300' : 'text-slate-300'}`}>{item.course_data.title}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteCourse(item.id, e); }} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        </div>
                        {activeCourseId === item.id && item.course_data.timestamps && (
                          <div className="mt-3 pl-6 flex flex-wrap gap-2">
                            {item.course_data.timestamps.map((ts: any) => (
                              <button key={ts.id} onClick={() => { setVideoStartTime(ts.startSeconds); setIsMobileDrawerOpen('none'); }} className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md active:bg-slate-700 transition-colors">
                                 <Clock size={12} /> {ts.timeLabel}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <form onSubmit={(e) => { handleFetchChapters(e); if(videoUrl.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-4">
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:border-red-500 outline-none font-medium text-slate-200 shadow-inner"
                    required
                  />
                  <button type="submit" disabled={isFetching || isDecoding || !videoUrl.trim()} className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95">
                    {isFetching || isDecoding ? <Loader2 size={18} className="animate-spin" /> : <ListChecks size={18} />}
                    {isFetching ? t.fetching : isDecoding ? t.decoding : t.fetchBtn}
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
