'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Globe2, Sparkles, Loader2, History, Trash2, ShieldCheck, Orbit, Info, Focus } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import dynamic from 'next/dynamic';

// 🟢 Safely Dynamic Import the 3D WebGL Library to prevent SSR Crash
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#020617] text-indigo-500">
      <Loader2 size={40} className="animate-spin mb-4" />
      <p className="font-mono text-xs uppercase tracking-widest">Initializing WebGL Engine...</p>
    </div>
  )
});

const translations = {
  English: {
    title: "3D Knowledge Universe",
    subtitle: "Explore interactive concept galaxies",
    promptLabel: "What do you want to explore?",
    placeholder: "e.g., Quantum Physics, World War 2, Machine Learning...",
    generateBtn: "Ignite Universe",
    generating: "Mapping Nodes...",
    historyTitle: "Explored Galaxies",
    noHistory: "No universes created yet.",
    canvasAwaits: "The Void Awaits",
    awaitsDesc: "Search a topic on the left. Watch as AI maps out a beautiful 3D network of connected knowledge.",
    proBadge: "PRO TIER FEATURE"
  },
  Bangla: {
    title: "থ্রিডি নলেজ ইউনিভার্স",
    subtitle: "ইন্টারঅ্যাকটিভ থ্রিডি কনসেপ্ট গ্যালাক্সি এক্সপ্লোর করুন",
    promptLabel: "আপনি কী এক্সপ্লোর করতে চান?",
    placeholder: "যেমন: Black Holes, French Revolution, AI...",
    generateBtn: "ইউনিভার্স তৈরি করুন",
    generating: "থ্রিডি ম্যাপ বানানো হচ্ছে...",
    historyTitle: "আপনার এক্সপ্লোর করা গ্যালাক্সিসমূহ",
    noHistory: "এখনো কোনো গ্যালাক্সি তৈরি করা হয়নি।",
    canvasAwaits: "শূন্যতা আপনার অপেক্ষায়",
    awaitsDesc: "বামে একটি টপিক সার্চ দিন। এআই জাদুর মতো থ্রিডি গ্রাফে পুরো টপিকটি আপনার সামনে ফুটিয়ে তুলবে।",
    proBadge: "প্রো-টিয়ার ফিচার"
  },
  Hindi: {
    title: "3D नॉलेज यूनिवर्स",
    subtitle: "इंटरएक्टिव कॉन्सेप्ट गैलेक्सी का अन्वेषण करें",
    promptLabel: "आप क्या खोजना चाहते हैं?",
    placeholder: "उदा. Solar System, Cold War, AI...",
    generateBtn: "यूनिवर्स बनाएं",
    generating: "नोड्स मैप किए जा रहे हैं...",
    historyTitle: "आपकी गैलेक्सी",
    noHistory: "अभी तक कोई यूनिवर्स नहीं बनाया गया।",
    canvasAwaits: "शून्यता आपकी प्रतीक्षा में है",
    awaitsDesc: "बाईं ओर एक विषय खोजें। AI तुरंत जुड़े हुए ज्ञान का एक 3D नेटवर्क तैयार करेगा।",
    proBadge: "प्रो टियर फ़ीचर"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function UniversePage() {
  const supabase = createClient();
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeUniverseId, setActiveUniverseId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  
  // Interactive Panel State
  const [selectedNode, setSelectedNode] = useState<any>(null);

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

  const fgRef = useRef<any>();

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('knowledge_universes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setHistoryList(data);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setSelectedNode(null);
    setGraphData(null);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/universe/generate` : `${apiUrlBase}/api/universe/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, language }),
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
      if (!data.valid || !data.graphData) throw new Error(data.error || "Failed to ignite universe");

      setGraphData(data.graphData);
      if (data.savedId) setActiveUniverseId(data.savedId);
      
      refreshTokens();
      fetchHistory();

    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("🚨 Space-Time Error: Server took too long to build the universe. Please try again.");
      } else {
        alert(`🚨 Space-Time Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUniverse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('knowledge_universes').delete().eq('id', id);
    if (activeUniverseId === id) {
      setActiveUniverseId(null);
      setGraphData(null);
      setSelectedNode(null);
    }
    fetchHistory();
  };

  // 🟢 Cinematic Camera Focus on Clicked Node
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    if (fgRef.current) {
      // Aim at node from outside it
      const distance = 40;
      const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
      
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
      );
    }
  }, [fgRef]);

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-50 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-slate-50 bg-slate-950 lg:border lg:border-slate-200 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">
        
        {/* Left Control & Info Panel (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative z-10">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-fuchsia-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Orbit size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-5 mb-8">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.promptLabel}</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.placeholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-700 shadow-inner"
                rows={3}
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !topic.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* 🟢 Dynamic Info Panel (Pops up when a 3D node is clicked) */}
          {selectedNode && (
             <div className="mb-8 p-5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl shadow-inner animate-in slide-in-from-left-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Info size={14}/> Node Insights</h4>
                <h3 className="text-lg font-bold text-white mb-2">{selectedNode.name}</h3>
                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                  {selectedNode.description || "No specific details mapped for this constellation."}
                </p>
             </div>
          )}

          {/* History Library */}
          <div className="mt-auto pt-6 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
              <History size={14} className="text-indigo-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4 bg-slate-900 rounded-xl">{t.noHistory}</p>
              ) : (
                historyList.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setActiveUniverseId(item.id);
                      setGraphData(item.graph_data);
                      setTopic(item.topic);
                      setSelectedNode(null);
                    }}
                    className="group p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/40 flex justify-between items-center transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe2 size={14} className="text-slate-500 group-hover:text-indigo-400 shrink-0"/>
                      <p className="text-sm font-bold text-slate-300 truncate max-w-[180px]">{item.topic}</p>
                    </div>
                    <button onClick={(e) => deleteUniverse(item.id, e)} className="text-slate-600 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: The 3D WebGL Canvas */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#020617]">
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-indigo-500"><Orbit size={16}/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col p-0 lg:p-0 relative">
          
          {/* Subtle Space Vignette Overlay */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-10"></div>
          
          {!graphData && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 z-20">
              <Orbit size={80} className="text-slate-800 mb-6 animate-[spin_10s_linear_infinite]" />
              <h3 className="text-3xl font-black text-slate-600">{t.canvasAwaits}</h3>
              <p className="text-slate-500 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center z-20">
              <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t.generating}</p>
            </div>
          ) : (
            <div className="w-full h-full relative animate-in fade-in duration-1000">
               
               <div className="absolute top-6 left-8 z-20 text-white flex flex-col pointer-events-none">
                  <h3 className="text-xl font-black tracking-wider uppercase opacity-80 flex items-center gap-2"><Focus size={16} className="text-indigo-500"/> Universe of {topic}</h3>
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-1">Left Click & Drag to Rotate • Scroll to Zoom • Click Node for Details</p>
               </div>

               {/* The 3D Engine */}
               <div className="absolute inset-0 z-0">
                  <ForceGraph3D
                    ref={fgRef}
                    graphData={graphData}
                    backgroundColor="#020617"
                    nodeAutoColorBy="group"
                    nodeRelSize={6}
                    linkColor={() => 'rgba(99, 102, 241, 0.4)'} // Indigo translucent links
                    linkWidth={1.5}
                    nodeLabel="name"
                    onNodeClick={handleNodeClick}
                    // Particles shooting across links for sci-fi effect
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.005}
                  />
               </div>

               {/* 🟢 Mobile Dynamic Info Panel */}
               {selectedNode && (
                 <div className="absolute bottom-24 left-4 right-4 z-20 lg:hidden p-5 bg-indigo-950/80 backdrop-blur-md border border-indigo-500/50 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Info size={14}/> Node Insights</h4>
                      <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{selectedNode.name}</h3>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar pr-2">
                      {selectedNode.description || "No specific details mapped for this constellation."}
                    </p>
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
                <Sparkles size={18} /> New Universe
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
              {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-indigo-400"/> {t.historyTitle}</> : <><Sparkles size={18} className="text-indigo-400"/> New Universe</>}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {isMobileDrawerOpen === 'history' ? (
              <div className="space-y-3">
                {historyList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                ) : (
                  historyList.map(item => {
                    const isActive = activeUniverseId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => { 
                          setActiveUniverseId(item.id);
                          setGraphData(item.graph_data);
                          setTopic(item.topic);
                          setSelectedNode(null);
                          setIsMobileDrawerOpen('none'); 
                        }} 
                        className={`group p-4 bg-slate-950 border rounded-xl cursor-pointer hover:shadow-md transition-all ${isActive ? 'border-indigo-500/50' : 'border-slate-800'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Globe2 size={14} className="text-slate-500 shrink-0"/>
                            <h4 className={`font-bold text-sm truncate pr-2 ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>{item.topic}</h4>
                          </div>
                          <button onClick={(e) => deleteUniverse(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <form onSubmit={(e) => { handleSearch(e); if(topic.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2"><Sparkles size={12}/> {t.promptLabel}</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-700 shadow-inner"
                    rows={3}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading || !topic.trim()} className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-600">
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
