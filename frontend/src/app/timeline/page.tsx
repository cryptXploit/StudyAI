'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Hourglass, Sparkles, Loader2, History, Trash2, ShieldCheck, Clock, Map, Play, Square, Navigation, Crosshair, ChevronRight, Cpu, Orbit, Swords } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import dynamic from 'next/dynamic';

const Chrono = dynamic(() => import('react-chrono').then(mod => mod.Chrono), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-transparent opacity-60">
      <Loader2 size={40} className="animate-spin text-amber-500 mb-4" />
      <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Warming up Time Machine...</p>
    </div>
  )
});

const translations = {
  English: {
    title: "Time-Travel Map",
    subtitle: "Interactive Historical Timelines",
    promptLabel: "What history do you want to explore?",
    placeholder: "e.g., Evolution of AI, French Revolution...",
    generateBtn: "Generate Timeline",
    generating: "Traveling through time...",
    historyTitle: "Saved Timelines",
    noHistory: "No timelines generated yet.",
    canvasAwaits: "The Time Machine Awaits",
    awaitsDesc: "Type a historical topic or the evolution of any subject. AI will craft a beautiful, scrollable journey for you.",
    proBadge: "PRO TIER FEATURE"
  }
};
type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function TimelinePage() {
  const supabase = createClient();
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations['English'];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'history'|'config'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) setIsHeaderVisible(false);
    else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) setIsHeaderVisible(true);
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    fetchHistory();
    return () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('timelines_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setHistoryList(data);
  };

  const handleSearch = async (e?: React.FormEvent, directTopic?: string) => {
    if (e) e.preventDefault();
    const searchTopic = directTopic || topic;
    if (!searchTopic.trim() || isLoading) return;
    if (tier !== 'PRO' && tokens < 15) { setRequiredTokensForModal(15); setShowTokenModal(true); return; }

    setIsLoading(true);
    setTimelineData(null);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/timeline/generate` : `${apiUrlBase}/api/timeline/generate`;
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic: searchTopic, language }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') { setRequiredTokensForModal(errData.required || 15); setShowTokenModal(true); setIsLoading(false); return; }
      }
      const data = await response.json();
      if (!data.valid || !data.timelineData) throw new Error(data.error || "Failed to extract chronological data.");
      setTimelineData(data.timelineData);
      if (data.savedId) setActiveTimelineId(data.savedId);
      if (directTopic) setTopic(directTopic);
      refreshTokens();
      fetchHistory();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert(`🚨 Timeout: Server took too long. Please try again.`);
      } else if (error.message && error.message !== "Failed to fetch" && !error.message.includes("Unexpected token")) {
        import('react-hot-toast').then((toast) => toast.default.error(error.message));
      } else {
        showPublicError();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTimeline = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('timelines_history').delete().eq('id', id);
    if (activeTimelineId === id) {
      setActiveTimelineId(null);
      setTimelineData(null);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
    fetchHistory();
  };

  const forceTopic = (templateTopic: string) => {
    setTopic(templateTopic);
    handleSearch(undefined, templateTopic);
    setIsMobileDrawerOpen('none');
  };

  const dynamicBackgroundClass = useMemo(() => {
    if (!timelineData) return 'bg-gradient-to-br from-slate-950 via-[#020617] to-slate-900';
    const txt = (timelineData.title + ' ' + topic).toLowerCase();
    if (txt.match(/space|cosmos|universe|galaxy|moon|mars|apollo/)) return 'bg-gradient-to-br from-[#0b0f19] via-[#1a103c] to-[#000000]';
    if (txt.match(/war|revolution|empire|blood|battle|nazi/)) return 'bg-gradient-to-br from-[#1c0804] via-[#2d110d] to-[#000000]';
    if (txt.match(/tech|ai|computer|internet|digital|robot/)) return 'bg-gradient-to-br from-[#001414] via-[#012320] to-[#000a0a]';
    return 'bg-gradient-to-br from-slate-900 via-slate-950 to-black';
  }, [timelineData, topic]);

  const toggleNarration = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }
    if (!timelineData || !timelineData.items) return;
    setIsPlaying(true);
    const synth = window.speechSynthesis;
    synth.cancel();
    let fullText = `${timelineData.title}. `;
    timelineData.items.forEach((item: any) => { fullText += `In ${item.title}. ${item.cardTitle}. ${item.cardDetailedText || item.cardText}. `; });
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    synth.speak(utterance);
  };

  const scrollToYearIndex = (index: number) => {
    const cards = document.querySelectorAll('.timeline-card-content, .card-content-wrapper, .sc-eCImPb');
    if (cards && cards[index]) {
      cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      if (scrollRef.current) scrollRef.current.scrollBy({ top: 300, behavior: 'smooth' });
    }
  };

  return (
    <SecureLayout>
      <OutOfTokensModal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} requiredTokens={requiredTokensForModal} />
      <div className={`min-h-[calc(100vh-80px)] p-0 lg:p-4 transition-colors duration-1000 ${dynamicBackgroundClass}`}>
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden rounded-none lg:rounded-3xl shadow-none lg:shadow-2xl relative border-0 lg:border lg:border-slate-800/50">

        {timelineData && (
          <div className="hidden lg:flex w-full lg:w-80 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/50 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative z-10 shadow-xl transition-all duration-700 animate-in slide-in-from-left">
            <div className="flex items-center gap-3 mb-6 mt-2">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl flex items-center justify-center shadow-inner shrink-0"><Hourglass size={20} /></div>
              <div><h2 className="text-xl font-black text-slate-100 tracking-tight leading-none">{t.title}</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Archive</p></div>
            </div>
            <form onSubmit={handleSearch} className="space-y-4 mb-6">
              <div className="relative">
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Explore another era..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all pr-10" />
                <button type="submit" disabled={isLoading || !topic.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg transition-all disabled:opacity-50">{isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}</button>
              </div>
            </form>
            <div className="flex-1 flex flex-col border-t border-slate-800/50 pt-4">
              <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2"><History size={12} className="text-amber-400" /> {t.historyTitle}</h3>
              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2 pb-4">
                {historyList.length === 0 ? (<p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">{t.noHistory}</p>) : (
                  historyList.map((item) => (
                    <div key={item.id} onClick={() => { setActiveTimelineId(item.id); setTimelineData(item.timeline_data); setTopic(item.topic); if (window.speechSynthesis) window.speechSynthesis.cancel(); setIsPlaying(false); }} className={`group p-3 rounded-xl cursor-pointer transition-all border flex justify-between items-center ${activeTimelineId === item.id ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-slate-900/50 border-slate-800/50 hover:border-slate-600'}`}>
                      <div className="flex items-center gap-2 truncate pr-2"><Map size={12} className={`shrink-0 ${activeTimelineId === item.id ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'}`}/><p className={`text-xs font-bold truncate max-w-[160px] ${activeTimelineId === item.id ? 'text-amber-300' : 'text-slate-300'}`}>{item.topic}</p></div>
                      <button onClick={(e) => deleteTimeline(item.id, e)} className="text-slate-500 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent z-0">
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col p-0 relative bg-transparent">
          {!timelineData && !isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 sm:px-8 py-10 animate-in fade-in duration-1000 zoom-in-95">
              <div className="w-full max-w-2xl mx-auto flex flex-col items-center relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="flex flex-col items-center mb-8 relative z-10 text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl mb-6 shadow-amber-500/10"><Hourglass size={32} className="text-amber-400 animate-pulse" /></div>
                  <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 tracking-tight mb-4">{t.canvasAwaits}</h1>
                  <p className="text-sm md:text-base text-slate-400 font-medium max-w-md mx-auto leading-relaxed">{t.awaitsDesc}</p>
                </div>
                <form onSubmit={handleSearch} className="w-full relative z-20 group">
                  <div className="relative flex items-center w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl transition-all duration-300 focus-within:border-amber-500/50 focus-within:shadow-[0_0_40px_rgba(245,158,11,0.2)] focus-within:scale-[1.02]">
                    <div className="pl-6 text-amber-500"><Sparkles size={24} className="group-focus-within:animate-pulse" /></div>
                    <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.placeholder} className="w-full py-5 px-4 bg-transparent outline-none text-lg md:text-xl font-bold text-white placeholder:text-slate-500 placeholder:font-medium" required />
                    <button type="submit" disabled={!topic.trim()} className="absolute right-3 bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-2xl transition-all disabled:opacity-0 disabled:scale-75 shadow-lg shadow-amber-600/30"><ChevronRight size={24} /></button>
                  </div>
                </form>
                <div className="mt-10 w-full flex flex-col items-center z-10">
                  <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4">Popular Journeys</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={() => forceTopic('Evolution of Artificial Intelligence')} className="bg-slate-900/50 backdrop-blur-md border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-400 transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(245,158,11,0.15)] flex items-center gap-2"><Cpu size={14} className="text-emerald-400"/> Evolution of AI</button>
                    <button type="button" onClick={() => forceTopic('History of Space Exploration')} className="bg-slate-900/50 backdrop-blur-md border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-400 transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(245,158,11,0.15)] flex items-center gap-2"><Orbit size={14} className="text-indigo-400"/> Space Exploration</button>
                    <button type="button" onClick={() => forceTopic('The French Revolution')} className="bg-slate-900/50 backdrop-blur-md border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-amber-400 transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(245,158,11,0.15)] flex items-center gap-2"><Swords size={14} className="text-rose-400"/> French Revolution</button>
                  </div>
                </div>
                <div className="mt-12 lg:hidden w-full max-w-sm">
                   <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-4 rounded-3xl">
                      <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center justify-center gap-2"><History size={12} className="text-amber-400" /> Recent Timelines</h3>
                      <div className="space-y-2">
                        {historyList.slice(0,3).map((item) => (
                          <div key={item.id} onClick={() => { setActiveTimelineId(item.id); setTimelineData(item.timeline_data); setTopic(item.topic); }} className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800/50 rounded-2xl cursor-pointer hover:border-amber-500/50 transition-colors"><Map size={14} className="text-slate-500"/><p className="text-sm font-bold text-slate-300 truncate">{item.topic}</p></div>
                        ))}
                        {historyList.length === 0 && <p className="text-xs text-slate-500 text-center py-2">No history yet.</p>}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-500">
              <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                 <div className="absolute inset-0 border-t-2 border-amber-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-2 border-r-2 border-indigo-500 rounded-full animate-spin reverse-spin"></div>
                 <Hourglass size={32} className="text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight mb-2">Traversing the Timeline</h3>
              <p className="text-amber-500 font-bold uppercase tracking-widest text-xs animate-pulse">{t.generating}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-700 bg-transparent">
               <div className="hidden lg:flex flex-col absolute right-4 top-1/2 -translate-y-1/2 z-50 gap-1.5 bg-slate-950/80 backdrop-blur-xl p-2.5 rounded-[2rem] border border-slate-700/50 shadow-2xl max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase text-center mb-1 flex flex-col items-center gap-1"><Navigation size={12} className="text-amber-400 mb-1"/>ERA</div>
                  {timelineData.items.map((item: any, i: number) => (
                    <div key={i} onClick={() => scrollToYearIndex(i)} className="group relative flex items-center justify-center w-10 h-8 bg-slate-900 border border-slate-800 rounded-xl hover:bg-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all">
                       <span className="text-[10px] font-black text-slate-400 group-hover:text-amber-400 truncate px-1">{item.title.substring(0,4)}</span>
                    </div>
                  ))}
               </div>
               <div className="p-5 md:p-8 border-b border-slate-800/30 bg-slate-950/40 backdrop-blur-xl z-20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0">
                  <div>
                    <h2 className="text-xl md:text-3xl font-black text-white mb-1.5 tracking-tight drop-shadow-md">{timelineData.title}</h2>
                    <p className="text-amber-400 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Crosshair size={12}/> {timelineData.items.length} Milestones Mapped</p>
                  </div>
                  <button onClick={toggleNarration} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg border ${isPlaying ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.3)]' : 'bg-slate-900 text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-slate-900 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]'}`}>
                    {isPlaying ? <Square size={14} className="animate-pulse"/> : <Play size={14}/>}
                    {isPlaying ? 'Stop Docu' : 'Play Docu'}
                  </button>
               </div>
               <div className="flex-1 w-full max-w-5xl mx-auto relative pt-8 pb-32 px-2 md:px-8 overflow-y-auto custom-scrollbar flex justify-center z-10">
                  <div className="w-full max-w-4xl">
                    <Chrono items={timelineData.items} mode="VERTICAL_ALTERNATING" disableToolbar={true} theme={{ primary: '#f59e0b', secondary: 'rgba(15, 23, 42, 0.6)', cardBgColor: 'rgba(15, 23, 42, 0.6)', titleColorActive: '#f59e0b', titleColor: '#cbd5e1', cardTitleColor: '#fbbf24', cardSubtitleColor: '#94a3b8', cardDetailsColor: '#64748b' }} fontSizes={{ cardSubtitle: '0.85rem', cardText: '0.95rem', cardTitle: '1.25rem', title: '1rem' }} cardHeight={150} useReadMore={false} scrollable={{ scrollbar: false }} classNames={{ card: 'shadow-2xl rounded-3xl border border-slate-700/50 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 bg-slate-950/70 backdrop-blur-md', cardTitle: 'font-black text-amber-400 mb-2 tracking-tight drop-shadow-sm', cardSubTitle: 'font-bold text-slate-400 mb-3 uppercase tracking-wider text-[10px]', cardText: 'text-slate-200 leading-relaxed font-medium', title: 'font-black text-slate-100 tracking-widest bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 shadow-xl text-xs md:text-sm drop-shadow-md' }} />
                  </div>
               </div>
            </div>
          )}
          </div>

          {timelineData && (
            <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
              <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
                <button onClick={() => setIsMobileDrawerOpen('history')} className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[13px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white shrink-0"><History size={16}/> {t.historyTitle.split(' ')[1] || 'History'}</button>
                <button onClick={() => setIsMobileDrawerOpen('config')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 border border-amber-400/50"><Sparkles size={18} /> New Timeline</button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-amber-400"/> {t.historyTitle}</> : <><Sparkles size={18} className="text-amber-400"/> New Timeline</>}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {isMobileDrawerOpen === 'history' ? (
              <div className="space-y-3">
                {historyList.length === 0 ? (<p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>) : (
                  historyList.map(item => {
                    const isActive = activeTimelineId === item.id;
                    return (
                      <div key={item.id} onClick={() => { setActiveTimelineId(item.id); setTimelineData(item.timeline_data); setTopic(item.topic); setIsMobileDrawerOpen('none'); }} className={`group p-4 bg-slate-950 border rounded-xl cursor-pointer hover:shadow-md transition-all ${isActive ? 'border-amber-500/50' : 'border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 overflow-hidden"><Map size={14} className="text-slate-500 shrink-0"/><h4 className={`font-bold text-sm truncate pr-2 ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>{item.topic}</h4></div>
                          <button onClick={(e) => deleteTimeline(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <form onSubmit={(e) => { handleSearch(e); if(topic.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                <div className="mb-2">
                  <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">Popular Journeys</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => forceTopic('Evolution of Artificial Intelligence')} className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-amber-400 transition">Evolution of AI</button>
                    <button type="button" onClick={() => forceTopic('History of Space Exploration')} className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-amber-400 transition">Space Exploration</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2"><Sparkles size={12}/> {t.promptLabel}</label>
                  <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t.placeholder} className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-amber-500/50 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-300 shadow-inner" rows={3} required />
                </div>
                <button type="submit" disabled={isLoading || !topic.trim()} className="w-full py-4 mt-2 bg-amber-600 hover:bg-amber-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-400">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} {isLoading ? t.generating : t.generateBtn}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
