'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Network, Sparkles, Loader2, History, Trash2, ShieldCheck, Code2, Copy, Check } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    title: "Code to Flowchart Visualizer",
    subtitle: "Instantly decode complex code into logical diagrams",
    codeLabel: "Paste Your Code Here",
    codePlaceholder: "e.g., function quicksort(arr) { ... }",
    generateBtn: "Generate Flowchart",
    generating: "Analyzing Code Logic...",
    historyTitle: "Your Flowcharts",
    noHistory: "No flowcharts generated yet.",
    diagramAwaits: "Awaiting Code",
    awaitsDesc: "Paste any C, Python, Java, or JS code on the left. AI will understand the logic and build a beautiful flowchart.",
    copyCode: "Copy Mermaid",
    copied: "Copied!",
    proBadge: "PRO TIER FEATURE"
  },
  Bangla: {
    title: "কোড টু ফ্লোচার্ট ভিজ্যুয়ালাইজার",
    subtitle: "জটিল কোডকে ডিকোড করে লজিক্যাল ডায়াগ্রামে রূপান্তর করুন",
    codeLabel: "আপনার কোড পেস্ট করুন",
    codePlaceholder: "যেমন: def binary_search(arr): ...",
    generateBtn: "ফ্লোচার্ট তৈরি করুন",
    generating: "লজিক অ্যানালাইজ করা হচ্ছে...",
    historyTitle: "আপনার ফ্লোচার্টসমূহ",
    noHistory: "এখনো কোনো ফ্লোচার্ট তৈরি করা হয়নি।",
    diagramAwaits: "কোডের অপেক্ষায়",
    awaitsDesc: "বামে যেকোনো কোড পেস্ট করুন। এআই লজিক বুঝে চমৎকার একটি ফ্লোচার্ট বানিয়ে দেবে।",
    copyCode: "কোড কপি করুন",
    copied: "কপি হয়েছে!",
    proBadge: "প্রো-টিয়ার ফিচার"
  },
  Hindi: {
    title: "कोड टू फ्लोचार्ट विज़ुअलाइज़र",
    subtitle: "जटिल कोड को तुरंत लॉजिकल डायग्राम में डिकोड करें",
    codeLabel: "अपना कोड यहाँ पेस्ट करें",
    codePlaceholder: "उदा. public static void main(String[] args) { ... }",
    generateBtn: "फ्लोचार्ट उत्पन्न करें",
    generating: "लॉजिक का विश्लेषण हो रहा है...",
    historyTitle: "आपके फ्लोचार्ट",
    noHistory: "अभी तक कोई फ्लोचार्ट उत्पन्न नहीं हुआ।",
    diagramAwaits: "कोड की प्रतीक्षा में",
    awaitsDesc: "बाईं ओर अपना कोड पेस्ट करें। AI लॉजिक को समझकर एक शानदार फ्लोचार्ट तैयार करेगा।",
    copyCode: "Mermaid कॉपी करें",
    copied: "कॉपी हो गया!",
    proBadge: "प्रो टियर फ़ीचर"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

// 🟢 BUNDLE SIZE BLOAT FIX & SAFE MERMAID RENDERER: Lazy loading Mermaid.js
const MermaidDiagram = React.memo(({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (ref.current && chart) {
        ref.current.innerHTML = '';
        try {
          // Dynamic import prevents initial page load blocking
          const mermaidModule = await import('mermaid');
          const mermaid = mermaidModule.default;

          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'monospace'
          });

          const { svg } = await mermaid.render(`mermaid-svg-${Math.random().toString(36).substring(7)}`, chart);
          if (isMounted && ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (e) {
          console.error("Mermaid Render Error:", e);
          if (isMounted && ref.current) {
            ref.current.innerHTML = '<p class="text-red-400 text-sm">Failed to render complex logic graph. Try simplifying the code.</p>';
          }
        }
      }
    };

    renderChart();

    return () => { isMounted = false; };
  }, [chart]);

  return <div ref={ref} className="w-full flex justify-center overflow-auto custom-scrollbar" />;
});
MermaidDiagram.displayName = "MermaidDiagram";


export default function FlowchartPage() {
  const supabase = createClient();
  const [codeSnippet, setCodeSnippet] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [activeChartId, setActiveChartId] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{title: string, mermaid: string} | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

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

  // 🟢 AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchHistory = async () => {
    // 1. Instant load from Session Storage Cache
    const cachedHistory = sessionStorage.getItem('Prepia_flowchart_history');
    if (cachedHistory) {
      setHistoryList(JSON.parse(cachedHistory));
    }

    // 2. Background Sync
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('code_flowcharts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      if (data) {
        setHistoryList(data);
        sessionStorage.setItem('Prepia_flowchart_history', JSON.stringify(data));
      }
    } catch (e) {}
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSnippet.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setChartData(null);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/flowchart/generate` : `${apiUrlBase}/api/flowchart/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ code: codeSnippet, language }),
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

      if (data.error) throw new Error(data.error);
      if (!data.valid || !data.flowchart) throw new Error("Failed to format diagram properly.");

      setChartData(data.flowchart);
      if (data.savedId) setActiveChartId(data.savedId);

      refreshTokens();
      sessionStorage.removeItem('Prepia_flowchart_history'); // 🟢 Bust Cache
      setTimeout(() => fetchHistory(), 1500); // Slight delay for DB Trigger

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

  const deleteChart = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('code_flowcharts').delete().eq('id', id);
    if (activeChartId === id) {
      setActiveChartId(null);
      setChartData(null);
    }
    sessionStorage.removeItem('Prepia_flowchart_history'); // 🟢 Bust Cache
    fetchHistory();
  };

  const handleCopy = () => {
    if (chartData?.mermaid) {
      navigator.clipboard.writeText(chartData.mermaid);
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
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-50 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-slate-50 bg-slate-950 lg:border lg:border-slate-200 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">

        {/* Left Panel: Code Input (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-500 to-blue-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Network size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-xs font-bold text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={submitCode} className="space-y-5">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-2"><Code2 size={14}/> {t.codeLabel}</label>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder={t.codePlaceholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-cyan-500 outline-none resize-none font-mono text-xs text-slate-300 placeholder:text-slate-700 shadow-inner custom-scrollbar"
                rows={10}
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !codeSnippet.trim()} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-8 pt-8 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <History size={14} className="text-cyan-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-600 font-medium text-center py-4 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                  {t.noHistory}
                </p>
              ) : (
                historyList.map((item) => {
                  const isActive = activeChartId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { setActiveChartId(item.id); setChartData({title: item.title, mermaid: item.mermaid_data}); setCodeSnippet(item.code_snippet); }}
                      className={`group p-4 rounded-xl cursor-pointer transition-all shadow-sm border ${isActive ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-sm font-bold truncate pr-2 ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>{item.title}</h4>
                        <button onClick={(e) => deleteChart(item.id, e)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Diagram Viewer */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-cyan-500"><Network size={16}/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar p-4 lg:p-8 pb-40">
            {!chartData && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <Network size={60} className="text-slate-700 mb-4" />
              <h3 className="text-2xl font-bold text-slate-500">{t.diagramAwaits}</h3>
              <p className="text-slate-600 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold">{t.generating}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">

              <div className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-2xl font-black text-white tracking-tight">{chartData?.title}</h2>
                <button onClick={handleCopy} className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg shadow-sm transition-all flex items-center gap-2">
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  <span className="text-xs font-bold hidden md:inline">{copied ? t.copied : t.copyCode}</span>
                </button>
              </div>

              {/* The Mermaid Canvas */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col shadow-inner">
                {chartData?.mermaid && (
                  <MermaidDiagram chart={chartData.mermaid} />
                )}
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
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 border border-cyan-400/50"
              >
                <Sparkles size={18} /> Paste Code
              </button>
            </div>
          </div>

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
              {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-cyan-400"/> {t.historyTitle}</> : <><Sparkles size={18} className="text-cyan-400"/> New Flowchart</>}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {isMobileDrawerOpen === 'history' ? (
              <div className="space-y-3">
                {historyList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                ) : (
                  historyList.map(item => {
                    const isActive = activeChartId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => { setActiveChartId(item.id); setChartData({title: item.title, mermaid: item.mermaid_data}); setCodeSnippet(item.code_snippet); setIsMobileDrawerOpen('none'); }}
                        className={`group p-4 bg-slate-950 border rounded-xl cursor-pointer hover:shadow-md transition-all ${isActive ? 'border-cyan-500/50' : 'border-slate-800'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-bold text-sm truncate uppercase tracking-wide pr-2 ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>{item.title}</h4>
                          <button onClick={(e) => deleteChart(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <form onSubmit={(e) => { submitCode(e); if(codeSnippet.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2"><Code2 size={12}/> {t.codeLabel}</label>
                  <textarea
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    placeholder={t.codePlaceholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none font-mono text-xs text-slate-300 placeholder:text-slate-700 shadow-inner custom-scrollbar"
                    rows={8}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading || !codeSnippet.trim()} className="w-full py-4 mt-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isLoading ? t.generating : t.generateBtn}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
