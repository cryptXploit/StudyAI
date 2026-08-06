'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Network, Sparkles, Loader2, History, Trash2, ShieldCheck, Cpu, GitFork, Server, Play, Pause, FastForward, Activity } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';

// 🟢 BUNDLE SIZE BLOAT FIX: Lazy Load ReactFlow heavily to prevent frontend freeze
const ReactFlow = dynamic(() => import('reactflow').then(mod => mod.default), { ssr: false });
const Background = dynamic(() => import('reactflow').then(mod => mod.Background), { ssr: false });
const Controls = dynamic(() => import('reactflow').then(mod => mod.Controls), { ssr: false });
const MiniMap = dynamic(() => import('reactflow').then(mod => mod.MiniMap), { ssr: false });

const translations = {
  English: {
    title: "Logic & Flow Workspace",
    subtitle: "Infinite Drag & Drop AI Logic Architect",
    promptLabel: "What do you want to build or simulate?",
    placeholderGraph: "e.g., Build a flowchart for Microservices Architecture...",
    placeholderAnim: "e.g., Simulate Bubble Sort or Binary Search algorithm step-by-step...",
    generateBtn: "Auto-Build Workspace",
    generating: "Architecting...",
    historyTitle: "Saved Workspaces",
    noHistory: "No logic maps saved yet.",
    workspaceAwaits: "Infinite Canvas Awaits",
    awaitsDesc: "Describe an algorithm or system layout. AI will deploy interactive visual nodes instantly.",
    proBadge: "PRO TIER FEATURE",
    shortcuts: "Blueprints",
    tabGraph: "Architecture Map",
    tabAnimator: "Algorithm Simulator"
  },
  Bangla: {
    title: "লজিক ও ফ্লো ওয়ার্কস্পেস",
    subtitle: "এআই ড্র্যাগ-অ্যান্ড-ড্রপ আর্কিটেক্ট ও সিমুলেটর",
    promptLabel: "আপনি কী তৈরি বা সিমুলেট করতে চান?",
    placeholderGraph: "যেমন: ব্যাংক ট্রানজেকশন আর্কিটেকচার তৈরি করুন...",
    placeholderAnim: "যেমন: বাবল সর্ট বা বাইনারি সার্চ স্টেপ-বাই-স্টেপ সিমুলেট করুন...",
    generateBtn: "ওয়ার্কস্পেস বিল্ড করুন",
    generating: "সাজানো হচ্ছে...",
    historyTitle: "সেভ করা ওয়ার্কস্পেস",
    noHistory: "কোনো লজিক ম্যাপ সেভ করা নেই।",
    workspaceAwaits: "ইনফিনিট ক্যানভাসের অপেক্ষায়",
    awaitsDesc: "যেকোনো অ্যালগরিদম বা সিস্টেম লেআউট লিখুন। এআই সাথে সাথে ইন্টারঅ্যাকটিভ ভিজ্যুয়াল তৈরি করবে।",
    proBadge: "প্রো-টিয়ার ফিচার",
    shortcuts: "ব্লুপ্রিন্ট",
    tabGraph: "আর্কিটেকচার ম্যাপ",
    tabAnimator: "অ্যালগরিদম সিমুলেটর"
  },
  Hindi: {
    title: "लॉजिक और फ्लो वर्कस्पेस",
    subtitle: "एआई लॉजिक आर्किटेक्ट और सिम्युलेटर",
    promptLabel: "आप क्या बनाना या अनुकरण करना चाहते हैं?",
    placeholderGraph: "उदा. माइक्रोसर्विसेज के लिए फ़्लोचार्ट बनाएं...",
    placeholderAnim: "उदा. बबल सॉर्ट या बाइनरी सर्च का चरण-दर-चरण अनुकरण करें...",
    generateBtn: "वर्कस्पेस बनाएं",
    generating: "निर्माण हो रहा है...",
    historyTitle: "सहेजे गए वर्कस्पेस",
    noHistory: "अभी तक कोई लॉजिक मैप सहेजा नहीं गया।",
    workspaceAwaits: "अनंत कैनवास प्रतीक्षारत है",
    awaitsDesc: "एल्गोरिदम या सिस्टम लेआउट का वर्णन करें। AI तुरंत इंटरैक्टिव नोड्स तैनात करेगा।",
    proBadge: "प्रो टियर फ़ीचर",
    shortcuts: "ब्लूप्रिंट",
    tabGraph: "आर्किटेक्चर मैप",
    tabAnimator: "एल्गोरिथम सिम्युलेटर"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';
type GenMode = 'graph' | 'animator';

export default function LogicFlowPage() {
  const supabase = createClient();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<GenMode>('graph');

  // States for Graph Mode
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // States for Animator Mode
  const [animatorSteps, setAnimatorSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [displayView, setDisplayView] = useState<GenMode | null>(null);

  const [workspaceTitle, setWorkspaceTitle] = useState('');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

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

  // Animator Core Engine Loop
  useEffect(() => {
    let interval: any;
    if (isPlaying && animatorSteps.length > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= animatorSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, animatorSteps.length]);

  // 🟢 AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchHistory = async () => {
    // A. Instant UI load from Session Storage
    const cachedHistory = sessionStorage.getItem('Prepia_logicflow_history');
    if (cachedHistory) {
      setHistoryList(JSON.parse(cachedHistory));
    }

    // B. Background Sync
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('logic_workspace')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setHistoryList(data);
      sessionStorage.setItem('Prepia_logicflow_history', JSON.stringify(data));
    }
  };

  const handleSearch = async (e: React.FormEvent, directPrompt?: string, forceMode?: GenMode) => {
    if (e) e.preventDefault();
    const activePrompt = directPrompt || prompt;
    const activeMode = forceMode || mode;
    if (!activePrompt.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setIsPlaying(false);
    setCurrentStep(0);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/logicflow/generate` : `${apiUrlBase}/api/logicflow/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ prompt: activePrompt, language, mode: activeMode }),
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
      if (!data.valid || !data.graph) throw new Error(data.error || "Generation error");

      setWorkspaceTitle(data.graph.title);

      if (data.graph.mode === 'animator') {
        setDisplayView('animator');
        setAnimatorSteps(data.graph.steps);
      } else {
        setDisplayView('graph');
        setNodes(data.graph.nodes);
        setEdges(data.graph.edges);
      }

      refreshTokens();
      sessionStorage.removeItem('Prepia_logicflow_history'); // Bust Cache
      setTimeout(() => fetchHistory(), 1500); // Slight delay to ensure DB triggers

    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert(`🚨 Timeout: Server took too long to build the architecture. Please try a simpler prompt.`);
      } else if (error.message && error.message !== "Failed to fetch" && !error.message.includes("Unexpected token")) {
        // Show the actual AI error instead of generic "Server busy"
        import('react-hot-toast').then((toast) => toast.default.error(error.message));
      } else {
        showPublicError();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('logic_workspace').delete().eq('id', id);
    if (historyList.length === 1) setDisplayView(null);
    sessionStorage.removeItem('Prepia_logicflow_history');
    fetchHistory();
  };

  const loadHistoryItem = (item: any) => {
    setIsPlaying(false);
    setCurrentStep(0);
    setWorkspaceTitle(item.title);

    // Check if it's an animator payload embedded inside nodes_json
    if (item.nodes_json && !Array.isArray(item.nodes_json) && item.nodes_json.mode === 'animator') {
      setDisplayView('animator');
      setMode('animator');
      setAnimatorSteps(item.nodes_json.steps);
    } else {
      setDisplayView('graph');
      setMode('graph');
      setNodes(item.nodes_json);
      setEdges(item.edges_json);
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

        {/* Left Input Sidebar Panel (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-blue-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-6 mt-2">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Network size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-xs font-bold text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-800">
            <button onClick={() => setMode('graph')} className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'graph' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
              {t.tabGraph}
            </button>
            <button onClick={() => setMode('animator')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'animator' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
              <Activity size={14}/> {t.tabAnimator}
            </button>
          </div>

          <div className="mb-6">
             <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-3">{t.shortcuts}</label>
             <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleSearch(null as any, "Bubble Sort Simulation", 'animator')} className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-2 rounded-lg text-xs font-bold text-slate-400 hover:text-amber-400 transition"><Cpu size={14}/> Bubble Sort</button>
                <button type="button" onClick={() => handleSearch(null as any, "Dijkstra Algorithm Simulation", 'animator')} className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-2 rounded-lg text-xs font-bold text-slate-400 hover:text-amber-400 transition"><Activity size={14}/> Dijkstra Path</button>
                <button type="button" onClick={() => handleSearch(null as any, "Microservices System Architecture", 'graph')} className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-2 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-400 transition"><Server size={14}/> System Arch</button>
                <button type="button" onClick={() => handleSearch(null as any, "E-commerce Auth Logic Flow", 'graph')} className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-2 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-400 transition"><GitFork size={14}/> Logic Flow</button>
             </div>
          </div>

          <form onSubmit={(e) => handleSearch(e)} className="space-y-5">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.promptLabel}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'graph' ? t.placeholderGraph : t.placeholderAnim}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-700 shadow-inner"
                rows={3}
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !prompt.trim()} className={`w-full py-4 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${mode === 'graph' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'}`}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-6 pt-6 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
              <History size={14} className="text-indigo-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4 bg-slate-900 rounded-xl">{t.noHistory}</p>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="group p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/40 flex justify-between items-center transition-all"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {item.nodes_json?.mode === 'animator' ? <Activity size={14} className="text-amber-500 shrink-0"/> : <Network size={14} className="text-indigo-500 shrink-0"/>}
                      <p className="text-sm font-bold text-slate-300 truncate max-w-[180px]">{item.title}</p>
                    </div>
                    <button onClick={(e) => deleteWorkspace(item.id, e)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Infinite ReactFlow OR Algorithm Animator */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-indigo-500"><Network size={16}/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar p-0 lg:p-0 pb-40 flex flex-col relative">
            {!displayView && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-10">
              <Network size={60} className="text-slate-800 mb-4" />
              <h3 className="text-2xl font-bold text-slate-500">{t.workspaceAwaits}</h3>
              <p className="text-slate-600 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold">{t.generating}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in duration-500">

               {/* Top Bar Workspace Header Title info */}
               <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-10 shadow-md">
                  <h3 className="text-md font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                    {displayView === 'animator' ? <Activity size={18} className="text-amber-500"/> : <Network size={18} className="text-indigo-500"/>}
                    {workspaceTitle}
                  </h3>
               </div>

               {/* 🟢 VIEW 1: ALGORITHM ANIMATOR */}
               {displayView === 'animator' && animatorSteps.length > 0 && (
                 <div className="flex-1 w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 relative">

                   {/* Data Visualization Bars */}
                   <div className="flex-1 w-full flex items-end justify-center gap-3 pb-20 pt-10">
                      <AnimatePresence>
                        {animatorSteps[currentStep]?.array.map((val: number, idx: number) => {
                          const isTarget = animatorSteps[currentStep].activeIndices?.includes(idx);
                          const maxVal = Math.max(...animatorSteps[currentStep].array);
                          return (
                            <motion.div
                              layout
                              key={val}
                              initial={{ opacity: 0.5, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              style={{ height: `${(val / maxVal) * 100}%` }}
                              className={`w-12 md:w-16 rounded-t-xl flex items-end justify-center pb-4 text-white font-black text-xl shadow-lg transition-colors ${
                                isTarget ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-amber-500/50' : 'bg-gradient-to-t from-indigo-700 to-indigo-500'
                              }`}
                            >
                              {val}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                   </div>

                   {/* Description & Controls Bar */}
                   <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl absolute bottom-8 z-20">
                     <p className="text-center text-lg font-bold text-slate-200 mb-6 h-8 flex items-center justify-center">
                       {animatorSteps[currentStep]?.description}
                     </p>

                     <div className="flex items-center justify-between gap-6">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95">
                          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                        </button>

                        <div className="flex-1 flex flex-col">
                           <input
                             type="range"
                             min={0}
                             max={animatorSteps.length - 1}
                             value={currentStep}
                             onChange={(e) => { setCurrentStep(Number(e.target.value)); setIsPlaying(false); }}
                             className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                           />
                           <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                             <span>Step 1</span>
                             <span>Step {currentStep + 1} of {animatorSteps.length}</span>
                           </div>
                        </div>

                        <button onClick={() => setPlaybackSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-black rounded-xl flex items-center gap-2 transition-colors border border-slate-700">
                          <FastForward size={18} /> {playbackSpeed}x
                        </button>
                     </div>
                   </div>

                 </div>
               )}

               {/* 🟢 VIEW 2: REACTFLOW GRAPH ENGINE (Lazy Loaded) */}
               {displayView === 'graph' && (
                 <div className="flex-1 w-full h-full bg-slate-950 relative">
                   <ReactFlow
                     nodes={nodes}
                     edges={edges}
                     onNodesChange={onNodesChange}
                     onEdgesChange={onEdgesChange}
                     fitView
                     snapToGrid
                     snapGrid={[15, 15]}
                   >
                     <Background color="#334155" gap={16} size={1.5} />
                     <Controls className="bg-slate-900 border border-slate-800 text-white rounded-lg shadow-xl" />
                     <MiniMap nodeColor={() => '#6366f1'} maskColor="rgba(15, 23, 42, 0.6)" className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hidden md:block" />
                   </ReactFlow>
                 </div>
               )}

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
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all active:scale-95 border border-indigo-400/50"
              >
                <Sparkles size={18} /> Build Logic
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
              {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-indigo-400"/> {t.historyTitle}</> : <><Sparkles size={18} className="text-indigo-400"/> New Logic Flow</>}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {isMobileDrawerOpen === 'history' ? (
              <div className="space-y-3">
                {historyList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                ) : (
                  historyList.map(item => {
                    const isActive = workspaceTitle === item.title;
                    return (
                      <div
                        key={item.id}
                        onClick={() => { loadHistoryItem(item); setIsMobileDrawerOpen('none'); }}
                        className={`group p-4 bg-slate-950 border rounded-xl cursor-pointer hover:shadow-md transition-all ${isActive ? 'border-indigo-500/50' : 'border-slate-800'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            {item.nodes_json?.mode === 'animator' ? <Activity size={14} className="text-amber-500 shrink-0"/> : <Network size={14} className="text-indigo-500 shrink-0"/>}
                            <h4 className={`font-bold text-sm truncate pr-2 ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>{item.title}</h4>
                          </div>
                          <button onClick={(e) => deleteWorkspace(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Mode Switcher */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setMode('graph')} className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'graph' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                    {t.tabGraph}
                  </button>
                  <button onClick={() => setMode('animator')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'animator' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Activity size={14}/> {t.tabAnimator}
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-3">{t.shortcuts}</label>
                  <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { handleSearch(null as any, "Bubble Sort Simulation", 'animator'); setIsMobileDrawerOpen('none'); }} className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-300"><Cpu size={14}/> Bubble Sort</button>
                      <button type="button" onClick={() => { handleSearch(null as any, "Dijkstra Algorithm Simulation", 'animator'); setIsMobileDrawerOpen('none'); }} className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-300"><Activity size={14}/> Dijkstra Path</button>
                      <button type="button" onClick={() => { handleSearch(null as any, "Microservices System Architecture", 'graph'); setIsMobileDrawerOpen('none'); }} className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-300"><Server size={14}/> System Arch</button>
                      <button type="button" onClick={() => { handleSearch(null as any, "E-commerce Auth Logic Flow", 'graph'); setIsMobileDrawerOpen('none'); }} className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-300"><GitFork size={14}/> Logic Flow</button>
                  </div>
                </div>

                <form onSubmit={(e) => { handleSearch(e); if(prompt.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2"><Sparkles size={12}/> {t.promptLabel}</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={mode === 'graph' ? t.placeholderGraph : t.placeholderAnim}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-600 shadow-inner"
                      rows={3}
                      required
                    />
                  </div>

                  <button type="submit" disabled={isLoading || !prompt.trim()} className={`w-full py-4 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${mode === 'graph' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'}`}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isLoading ? t.generating : t.generateBtn}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
