'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Network, Loader2, Target, CheckCircle2, Save, Download, History, PlusCircle, Trash2 } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    newMap: "New Map",
    library: "Library",
    contextFiles: "Context Files (Optional)",
    savedMaps: "Your Saved Maps",
    noSavedMaps: "No maps saved yet.",
    placeholder: "What concept do you want to visualize? (e.g., SDLC Models)",
    generating: "Mapping...",
    generateMap: "Generate Map",
    visualizeAny: "Visualize Any Concept",
    visualizeDesc: "Type a topic above to generate an interactive, beautifully structured mind-map instantly.",
    computing: "Computing Graph Nodes...",
    downloadSVG: "Download SVG",
    saveToLib: "Save to Library",
    saving: "Saving...",
    complexityLimit: "Complexity Limit Exceeded",
    complexityDesc: "The generated diagram was too complex or contained invalid characters. Try simplifying your topic."
  },
  Bangla: {
    newMap: "নতুন ম্যাপ",
    library: "লাইব্রেরি",
    contextFiles: "কনটেক্সট ফাইল (ঐচ্ছিক)",
    savedMaps: "আপনার সেভ করা ম্যাপ",
    noSavedMaps: "কোনো ম্যাপ সেভ করা নেই।",
    placeholder: "আপনি কোন ধারণাটি ভিজুয়ালাইজ করতে চান? (যেমন: SDLC Models)",
    generating: "ম্যাপিং হচ্ছে...",
    generateMap: "ম্যাপ তৈরি করুন",
    visualizeAny: "যেকোনো টপিক ভিজুয়ালাইজ করুন",
    visualizeDesc: "উপরে একটি টপিক লিখুন এবং সাথে সাথে একটি ইন্টারঅ্যাকটিভ মাইন্ড-ম্যাপ তৈরি করুন।",
    computing: "গ্রাফ নোড প্রসেস করা হচ্ছে...",
    downloadSVG: "SVG ডাউনলোড করুন",
    saveToLib: "লাইব্রেরিতে সেভ করুন",
    saving: "সেভ হচ্ছে...",
    complexityLimit: "জটিলতার সীমা অতিক্রম করেছে",
    complexityDesc: "ম্যাপটি খুব বেশি জটিল হয়ে গেছে। দয়া করে আপনার টপিকটি কিছুটা সহজ করে লিখুন।"
  },
  Hindi: {
    newMap: "नया मैप",
    library: "लाइब्रेरी",
    contextFiles: "संदर्भ फ़ाइलें (वैकल्पिक)",
    savedMaps: "आपके सहेजे गए मैप",
    noSavedMaps: "कोई मैप नहीं मिला।",
    placeholder: "आप किस अवधारणा की कल्पना करना चाहते हैं? (उदा. SDLC Models)",
    generating: "मैपिंग हो रही है...",
    generateMap: "मैप बनाएं",
    visualizeAny: "किसी भी विषय की कल्पना करें",
    visualizeDesc: "तुरंत एक इंटरैक्टिव माइंड-मैप बनाने के लिए ऊपर एक विषय टाइप करें।",
    computing: "ग्राफ़ नोड्स की गणना हो रही है...",
    downloadSVG: "SVG डाउनलोड करें",
    saveToLib: "लाइब्रेरी में सहेजें",
    saving: "सहेजा जा रहा है...",
    complexityLimit: "जटिलता की सीमा पार हो गई",
    complexityDesc: "उत्पन्न आरेख बहुत जटिल था। कृपया अपने विषय को थोड़ा सरल बनाने का प्रयास करें।"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

function MindMapPageContent() {
  const supabase = createClient();
  const router = useRouter();
  const { tokens, tier, refreshTokens } = useTokens();
  
  // App States
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [savedMaps, setSavedMaps] = useState<any[]>([]);
  
  // Generation States
  const [topic, setTopic] = useState('');
  const lastGeneratedTopic = useRef('');

  const searchParams = useSearchParams();
  const contextParam = searchParams.get('context');
  const fileParamsString = searchParams.getAll('file').join(',');

  useEffect(() => {
    if (contextParam) setTopic(contextParam);
    if (fileParamsString) setSelectedFileIds(fileParamsString.split(','));
  }, [contextParam, fileParamsString]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [rawCode, setRawCode] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 🟢 Language State
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null); // For Fullscreen

  // 🟢 Super-Productivity States
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar
  
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editMapTopic, setEditMapTopic] = useState('');

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'files'|'history'|'actions'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    fetchFiles();
    fetchSavedMaps();

    // 🟢 Load Language & Sync
    const loadLanguage = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };

    loadLanguage();
    window.addEventListener('languageChanged', loadLanguage);
    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  // DYNAMIC MERMAID RENDERER (Safe & Sanitized)
  useEffect(() => {
    if (isStreaming || !rawCode || !isComplete) return; 

    let isMounted = true;
    const renderGraph = async () => {
      try {
        setHasError(false);
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        
        mermaid.initialize({ 
          startOnLoad: false, 
          theme: isDarkMode ? 'dark' : 'base',
          themeVariables: isDarkMode ? {} : {
            primaryColor: '#eef2ff',
            primaryTextColor: '#1e1b4b',
            primaryBorderColor: '#6366f1',
            lineColor: '#818cf8',
            secondaryColor: '#f3e8ff',
            tertiaryColor: '#ffffff',
            fontFamily: 'inherit'
          }
        });
        
        let initialClean = rawCode.replace(/```mermaid/gi, '').replace(/```/g, '');
        const thinkMatch = initialClean.match(/<think>[\s\S]*?<\/think>/);
        if (thinkMatch) {
          initialClean = initialClean.replace(thinkMatch[0], '');
        }
        let lines = initialClean.split('\n');
        let sanitizedLines = lines.map(line => {
          let indentMatch = line.match(/^(\s*)/);
          let indent = indentMatch ? indentMatch[1] : '';
          let content = line.substring(indent.length);
          // 🟢 REGEX FIX: Allow brackets and quotes for complex shapes!
          content = content.replace(/[{};]/g, '').trim();
          if (!content) return null;
          return indent + content;
        }).filter(Boolean);
        
        let cleanCode = sanitizedLines.join('\n');
        if (!cleanCode.toLowerCase().startsWith('mindmap')) {
          cleanCode = 'mindmap\n  ' + cleanCode.replace(/^mindmap/i, '').trim();
        }

        const id = `mermaid-chart-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanCode);
        
        if (isMounted && svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svg;
          
          const svgElement = svgContainerRef.current.querySelector('svg');
          if (svgElement) {
             svgElement.style.maxWidth = '100%';
             svgElement.style.height = 'auto';
             
             // 🟢 Infinity Drill-down Implementation
             const nodes = svgElement.querySelectorAll('.node');
             nodes.forEach(node => {
               (node as HTMLElement).style.cursor = 'pointer';
               (node as HTMLElement).classList.add('hover:opacity-80', 'transition-opacity');
               node.addEventListener('click', () => {
                 const nodeText = node.textContent?.trim();
                 if (nodeText) {
                    setTopic(`${topic} -> ${nodeText}`);
                    setTimeout(() => generateMindMap(), 0); // Trigger drill-down
                 }
               });
             });
          }
        }
      } catch (error) {
        console.error("Mermaid Render Error:", error);
        setHasError(true);
      }
    };
    
    renderGraph();
    return () => { isMounted = false; };
  }, [rawCode, isStreaming, isComplete, isDarkMode, topic]);

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed');
    if (data) setFiles(data);
  };

  // 🟢 AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchSavedMaps = async () => {
    // 1. Instant load from cache
    const cachedMaps = sessionStorage.getItem('Prepia_mindmaps_history');
    if (cachedMaps) {
      setSavedMaps(JSON.parse(cachedMaps));
    }

    // 2. Background sync
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('saved_mindmaps').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    
    if (data) {
      setSavedMaps(data);
      sessionStorage.setItem('Prepia_mindmaps_history', JSON.stringify(data));
    }
  };

  const toggleFile = (id: string) => {
    setSelectedFileIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const generateMindMap = async () => {
    if (!topic.trim()) return alert("Please enter a core topic to visualize!");

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsStreaming(true);
    setIsComplete(false);
    setRawCode('');
    setHasError(false);
    setActiveTab('create');
    lastGeneratedTopic.current = topic;
    if (svgContainerRef.current) svgContainerRef.current.innerHTML = '';

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/mind-map` : `${apiUrl}/api/mind-map`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, fileIds: selectedFileIds, language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let tempCode = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]' || !dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.error === 'INSUFFICIENT_TOKENS') {
                setRequiredTokensForModal(data.required || 15);
                setShowTokenModal(true);
                throw new Error("Insufficient tokens");
              } else if (data.error) {
                throw new Error(data.error);
              }
              if (data.status === 'complete') {
                setIsComplete(true);
                refreshTokens(); // Update token balance after generation
              }
              if (data.content) {
                tempCode += data.content;
                setRawCode(tempCode);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("🚨 Timeout: Server took too long to build the map. Try simplifying your topic.");
      } else {
        console.error(error);
      }
      setHasError(true);
    } finally {
      setIsStreaming(false);
      setIsComplete(true);

      // 🟢 Reset states and clear URL for clean UI after generation
      if (!hasError) {
         setTopic('');
         setSelectedFileIds([]);
         if (typeof window !== 'undefined') {
           window.history.replaceState(null, '', window.location.pathname);
         }
      }
    }
  };

  const saveCurrentMap = async () => {
    if (!rawCode || isStreaming) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from('saved_mindmaps').insert([{
        user_id: user.id,
        topic: (lastGeneratedTopic.current || topic).trim(),
        code: rawCode
      }]);
      
      if (error) throw error;
      alert("Map saved successfully!");
      
      sessionStorage.removeItem('Prepia_mindmaps_history'); // 🟢 Bust cache
      fetchSavedMaps();
    } catch (error) {
      console.error(error);
      alert("Failed to save map.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedMap = (savedMap: any) => {
    setActiveTab('create');
    setTopic(savedMap.topic);
    setRawCode(savedMap.code);
    setIsComplete(true);
    setIsStreaming(false);
    setHasError(false);
  };

  // 🟢 Advanced History Vault Delete & Edit
  const deleteSavedMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this map?')) return;
    try {
      await supabase.from('saved_mindmaps').delete().eq('id', id);
      setSavedMaps(prev => prev.filter(m => m.id !== id));
      sessionStorage.removeItem('Prepia_mindmaps_history');
    } catch (err) {
      console.error(err);
    }
  };

  const startEditMap = (map: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMapId(map.id);
    setEditMapTopic(map.topic);
  };

  const saveMapEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingMapId || !editMapTopic.trim()) {
      setEditingMapId(null);
      return;
    }
    try {
      await supabase.from('saved_mindmaps').update({ topic: editMapTopic.trim() }).eq('id', editingMapId);
      setSavedMaps(prev => prev.map(m => m.id === editingMapId ? { ...m, topic: editMapTopic.trim() } : m));
      sessionStorage.removeItem('Prepia_mindmaps_history');
      setEditingMapId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 🟢 Contextual AI Teacher Chat
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    if (tier !== 'PRO' && tokens < 5) {
      setRequiredTokensForModal(5);
      setShowTokenModal(true);
      return;
    }

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/mind-map-chat` : `${apiUrl}/api/mind-map-chat`;
      
      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, mapCode: rawCode, question: userMsg })
      });
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      
      setChatMessages(prev => [...prev, { role: 'ai', content: '' }]);
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]' || !dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.error === 'INSUFFICIENT_TOKENS') {
                setRequiredTokensForModal(data.required || 5);
                setShowTokenModal(true);
                throw new Error("Insufficient tokens");
              }
              if (data.status === 'complete') refreshTokens();
              
              if (data.content) {
                aiResponse += data.content;
                setChatMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = aiResponse;
                  return newMsgs;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
       console.error(error);
       setChatMessages(prev => [...prev, { role: 'ai', content: "Failed to load response." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapWrapperRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const downloadSVG = () => {
    if (!svgContainerRef.current) return;
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindmap_${topic.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPNG = () => {
    if (!svgContainerRef.current) return;
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    // Remove external font imports which taint the canvas but keep internal styles
    source = source.replace(/@import\s+url\([^)]+\);/gi, '');
    
    // Add explicit styling for foreignObject text to ensure it's visible if global CSS is missing
    source = source.replace(/<svg(.*?)>/, `<svg$1><style>.mermaid * { font-family: sans-serif !important; }</style>`);

    const svgBase64 = btoa(unescape(encodeURIComponent(source)));
    const url = `data:image/svg+xml;base64,${svgBase64}`;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgElement.getBoundingClientRect().width * 2; // High-Res
      canvas.height = svgElement.getBoundingClientRect().height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `mindmap_${topic.replace(/\s+/g, '_')}.png`;
          link.click();
        } catch (err) {
          console.error("Tainted Canvas Error, falling back to SVG:", err);
          downloadSVG(); // Fallback
          alert("Security policies prevented PNG export. Downloaded High-Res SVG instead!");
        }
      }
    };
    img.src = url;
  };

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] w-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden lg:border-slate-700 lg:border lg:rounded-3xl shadow-2xl mt-0 lg:mt-4 custom-scrollbar transition-colors duration-500 bg-slate-950 relative">
        
        {/* Mobile Sidebar Overlay (Deprecated for Bottom Sheet but keeping state) */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Interactive Sidebar (Desktop Only) */}
        <div className={`hidden lg:flex lg:w-[30%] bg-slate-950 border-r border-slate-700 p-5 flex-col transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Context Files Section */}
            <div className="shrink-10 mb-1">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-12 flex items-center gap-2">
                <Network size={14} className="text-indigo-400"/> {t.contextFiles}
              </h3>
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {files.map(file => (
                  <div key={file.id} onClick={() => toggleFile(file.id)} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all duration-200 hover:-translate-y-1 ${selectedFileIds.includes(file.id) ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-slate-900 border-transparent hover:border-indigo-200 shadow-sm'}`}>
                    <div className="mt-0.5 transition-transform duration-300">
                      {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-indigo-600 scale-110" size={18} /> : <div className="w-4 h-4 border-2 border-slate-300 rounded" />}
                    </div>
                    <p className={`text-sm font-bold truncate transition-colors ${selectedFileIds.includes(file.id) ? 'text-indigo-900' : 'text-slate-300'}`}>{file.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-slate-700 my-2"></div>

            {/* Saved Maps Section */}
            <div className="flex-1 overflow-hidden flex flex-col mt-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                <History size={14} className="text-indigo-400"/> {t.library}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-10">
                {savedMaps.length === 0 ? (
                  <div className="text-center p-6 bg-slate-900 border border-dashed border-slate-300 rounded-2xl animate-in fade-in zoom-in duration-500">
                    <Network className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-sm text-slate-500 font-medium">{t.noSavedMaps}</p>
                  </div>
                ) : (
                  savedMaps.map(map => (
                    <div key={map.id} onClick={() => loadSavedMap(map)} className="group p-4 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-indigo-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex justify-between items-center">
                      <div className="overflow-hidden flex-1 pr-2">
                        {editingMapId === map.id ? (
                           <div className="flex items-center gap-2">
                              <input 
                                autoFocus
                                value={editMapTopic}
                                onChange={(e) => setEditMapTopic(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.key === 'Enter' && saveMapEdit(e as any)}
                                className="w-full text-sm font-bold text-slate-200 border-b border-indigo-500 outline-none bg-transparent"
                              />
                              <button onClick={saveMapEdit} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><CheckCircle2 size={16} /></button>
                           </div>
                        ) : (
                          <>
                            <h4 className="font-bold text-slate-200 text-sm truncate transition-colors group-hover:text-indigo-700">{map.topic}</h4>
                            <p className="text-xs text-slate-400 mt-1 font-medium">{new Date(map.created_at).toLocaleDateString()}</p>
                          </>
                        )}
                      </div>
                      
                      {editingMapId !== map.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={(e) => startEditMap(map, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <PlusCircle size={14} className="rotate-45 transform" />
                          </button>
                          <button onClick={(e) => deleteSavedMap(map.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* Main Interactive Interface */}
        <div ref={scrollRef} onScroll={handleScroll} className="w-full lg:w-[70%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative overflow-y-auto custom-scrollbar bg-slate-900">
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-indigo-600"><Network size={16}/> {t.newMap}</h2>
              <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">{t.visualizeAny}</p>
            </div>
          </div>
          
          {/* Header Action Bar (Desktop only) */}
          <div className="hidden lg:flex p-4 md:p-6 border-b border-slate-700 gap-3 md:gap-4 items-center bg-slate-900 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
             <input 
               type="text" 
               value={topic} 
               onChange={e => setTopic(e.target.value)} 
               placeholder={t.placeholder} 
               className="flex-1 p-3 md:p-4 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-slate-200 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold transition-all duration-300 placeholder:font-medium placeholder:text-slate-400" 
             />
             <button 
               onClick={generateMindMap}
               disabled={isStreaming || !topic.trim()}
               className={`flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-400 text-white font-black rounded-xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ${!isStreaming && topic.trim() ? 'animate-[pulse_2s_infinite]' : ''} whitespace-nowrap`}
             >
               {isStreaming ? <Loader2 size={18} className="animate-spin"/> : <Network size={18} className="hidden md:block"/>}
               <span className="hidden md:inline">{isStreaming ? t.generating : t.generateMap}</span>
               <span className="md:hidden">{isStreaming ? '...' : 'Map'}</span>
             </button>
          </div>

          <div className="flex-1 overflow-auto relative custom-scrollbar">
             
             {/* Beautiful Empty State */}
             {!rawCode && !isStreaming && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-gradient-to-b from-transparent to-slate-100/50">
                   <div className="w-24 h-24 bg-slate-900 shadow-xl rounded-3xl flex items-center justify-center mb-6 border border-slate-800 transform -rotate-3 hover:rotate-0 transition duration-300">
                     <Network size={40} className="text-indigo-400" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-300">{t.visualizeAny}</h3>
                   <p className="text-base mt-2 max-w-md text-center text-slate-500 font-medium">{t.visualizeDesc}</p>
                </div>
             )}

             {/* Streaming Terminal View */}
             {isStreaming && (
                <div className="p-8 h-full flex flex-col">
                  <div className="flex-1 bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 font-mono text-sm text-emerald-400 overflow-y-auto">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700/50">
                       <Loader2 size={18} className="animate-spin text-emerald-500" />
                       <span className="text-slate-300 font-bold tracking-widest uppercase text-xs">{t.computing}</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{rawCode}</pre>
                  </div>
                </div>
             )}

              {/* Final Interactive Canvas */}
             {isComplete && rawCode && !hasError && (
                <div ref={mapWrapperRef} className={`min-h-full p-4 md:p-8 flex flex-col relative transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-slate-950'}`} 
                     style={{ backgroundImage: `radial-gradient(${isDarkMode ? '#334155' : '#cbd5e1'} 1px, transparent 1px)`, backgroundSize: '24px 24px' }}>
                   
                   {/* Floating Tool Bar */}
                   <div className="absolute top-4 right-4 md:top-10 md:right-10 flex flex-wrap justify-end gap-2 md:gap-3 z-40 animate-in fade-in slide-in-from-top-4 duration-500 bg-slate-900/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-700/50 max-w-[85%]">
                      <button onClick={() => router.push('/chat')} className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition shadow-md uppercase tracking-wider">
                         💬 <span className="hidden md:inline">Back to AI Chat</span>
                      </button>
                      <div className="w-px h-6 bg-slate-300 my-auto mx-1"></div>
                      
                      <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition" title="Toggle Theme">
                         {isDarkMode ? "☀️" : "🌙"}
                      </button>
                      <div className="w-px h-6 bg-slate-300 my-auto mx-1"></div>
                      
                      <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition" title="Fullscreen">
                         <Target size={18} />
                      </button>
                      <div className="w-px h-6 bg-slate-300 my-auto mx-1"></div>

                      <button onClick={downloadPNG} className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-slate-800 text-slate-300 font-bold text-sm rounded-lg hover:bg-slate-700 transition">
                         <Download size={16} /> <span className="hidden md:inline">PNG</span>
                      </button>
                      <button onClick={saveCurrentMap} disabled={isSaving} className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                         {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} 
                         <span className="hidden md:inline">{t.saveToLib}</span>
                      </button>
                   </div>

                   {/* Rendered Graph Container */}
                   <div className="flex-1 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 mt-16 md:mt-12 w-full">
                     <div className={`${isDarkMode ? 'bg-slate-800/80 border-slate-700 shadow-indigo-900/20' : 'bg-slate-900/80 border-white/40 shadow-2xl hover:shadow-indigo-500/10'} backdrop-blur-xl p-4 md:p-10 rounded-[2rem] border w-full max-w-full md:max-w-[90%] overflow-x-auto custom-scrollbar transition-all min-h-[60vh] flex items-center justify-center`}>
                       <div ref={svgContainerRef} className="flex justify-center min-w-fit md:min-w-[600px] w-full" />
                     </div>
                   </div>
                </div>
             )}

              {/* Error Fallback */}
             {isComplete && hasError && (
                 <div className="p-8 flex items-center justify-center h-full">
                     <div className="bg-slate-900 shadow-2xl p-8 rounded-3xl border border-red-100 max-w-lg text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <h3 className="font-black text-2xl text-slate-200 mb-2">{t.complexityLimit}</h3>
                        <p className="text-slate-500 font-medium">{t.complexityDesc}</p>
                        <pre className="mt-6 p-4 bg-slate-950 rounded-2xl text-left overflow-auto text-xs text-slate-400 border border-slate-700 max-h-48 custom-scrollbar">{rawCode}</pre>
                     </div>
                 </div>
             )}

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-white via-white/80 to-transparent ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            {/* Mobile Action Pills */}
            <div className="flex gap-2 overflow-x-auto mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('actions')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-indigo-50 border-indigo-200 text-indigo-600`}>
                <Network size={12}/> Generate
              </button>
              <button onClick={() => setIsMobileDrawerOpen('files')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedFileIds.length > 0 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-600' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                <Target size={12}/> Context {selectedFileIds.length > 0 && `(Selected)`}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('history')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-900 border-slate-700 text-slate-400">
                <History size={12}/> Library
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-[2rem] blur-md opacity-50 transition duration-500 group-focus-within:opacity-70"></div>
              <div className="relative flex shadow-xl rounded-[2rem] border transition-all backdrop-blur-xl overflow-hidden p-1 bg-slate-900/90 border-slate-700 focus-within:border-indigo-400 focus-within:bg-slate-900">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder={t.placeholder}
                  disabled={isStreaming}
                  className="w-full pl-4 pr-2 py-3 bg-transparent border-none focus:ring-0 outline-none disabled:opacity-50 text-sm font-medium text-slate-200 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
          
          </div>
        </div>

        {/* 🟢 Contextual AI Teacher (Sliding Side Panel) */}
        {isComplete && rawCode && !hasError && (
           <div className={`w-full sm:w-80 bg-slate-900 border-l border-slate-700 flex flex-col absolute md:relative right-0 inset-y-0 md:inset-auto md:h-auto z-50 md:z-10 shadow-[-10px_0_40px_rgba(0,0,0,0.06)] transform transition-transform duration-500 ease-out ${isChatOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 hidden md:flex'}`}>
              <div className="p-4 md:p-5 border-b border-slate-800 bg-gradient-to-r from-indigo-50 to-white flex items-center gap-2 md:gap-3">
                 <button onClick={() => setIsChatOpen(false)} className="md:hidden flex items-center gap-1.5 px-3 py-2 text-indigo-600 hover:bg-indigo-100 rounded-xl bg-indigo-50 shadow-sm border border-indigo-100">
                    <span className="text-xl font-bold leading-none mb-0.5">‹</span>
                    <span className="text-sm font-bold">Back</span>
                 </button>
                 <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-inner ml-2 md:ml-0">
                    <Target size={20} className="text-indigo-600" />
                 </div>
                 <div className="flex-1">
                   <h3 className="font-black text-sm text-slate-200">AI Teacher</h3>
                   <div className="flex items-center gap-1.5 mt-0.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold">Context Active</p>
                   </div>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-slate-950/50">
                 <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl rounded-tl-sm text-sm text-slate-400 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500 leading-relaxed">
                   Hi! I can see your map on <b>{topic}</b>. Ask me to explain any node or branch in detail!
                 </div>
                 
                 {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                       <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed ${
                          msg.role === 'user' 
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-indigo-500/20' 
                          : 'bg-slate-900 border border-slate-700 text-slate-300 rounded-tl-sm'
                       }`}>
                           {msg.content ? (
                             <div className={`prose max-w-none prose-sm prose-p:leading-relaxed prose-headings:font-bold prose-a:text-indigo-500 ${msg.role === 'user' ? 'text-white prose-p:text-white prose-strong:text-white prose-headings:text-white' : 'text-slate-300 prose-p:text-slate-300 prose-strong:text-white prose-headings:text-white'}`}>
                               <ReactMarkdown
                                 remarkPlugins={[remarkMath, remarkGfm]}
                                 rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
                               >
                                 {msg.content}
                               </ReactMarkdown>
                             </div>
                           ) : (
                              <div className="flex items-center gap-2 text-indigo-400">
                                <Loader2 size={16} className="animate-spin" /> Thinking...
                              </div>
                           )}
                       </div>
                    </div>
                 ))}
                 <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] relative">
                 <input 
                   type="text" 
                   value={chatInput}
                   onChange={e => setChatInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                   placeholder="Ask about a node..."
                   disabled={isChatLoading}
                   className="w-full bg-slate-950 border border-slate-700 p-3.5 pr-12 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 transition-all shadow-inner"
                 />
                 <button onClick={handleSendMessage} disabled={!chatInput.trim() || isChatLoading} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-0 transition-all shadow-md">
                   <Target size={14} />
                 </button>
              </div>
           </div>
        )}
        
        {/* Mobile Chat Toggle Button */}
        {isComplete && rawCode && !hasError && !isChatOpen && (
           <button onClick={() => setIsChatOpen(true)} className="md:hidden fixed bottom-8 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-transform z-50 ring-4 ring-white/50">
             <Target size={28} className="animate-pulse" />
           </button>
        )}
        
      </div>

      {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-200">
              {isMobileDrawerOpen === 'files' && <><Target size={18} className="text-indigo-500"/> Context Files</>}
              {isMobileDrawerOpen === 'history' && <><History size={18} className="text-indigo-500"/> Library</>}
              {isMobileDrawerOpen === 'actions' && <><Network size={18} className="text-indigo-500"/> Actions</>}
            </h3>
          </div>

          {isMobileDrawerOpen === 'files' && (
             <div className="space-y-6 pb-20">
               <div>
                 <h3 className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-indigo-500"><Network size={14}/> {t.contextFiles}</h3>
                 <div className="space-y-1.5">
                   {files.map(file => (
                    <div key={file.id} onClick={() => toggleFile(file.id)} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all duration-200 ${selectedFileIds.includes(file.id) ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-slate-900 border-slate-700 hover:border-indigo-200 shadow-sm'}`}>
                      <div className="mt-0.5 transition-transform duration-300">
                        {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-indigo-600 scale-110" size={18} /> : <div className="w-4 h-4 border-2 border-slate-300 rounded" />}
                      </div>
                      <p className={`text-sm font-bold truncate transition-colors ${selectedFileIds.includes(file.id) ? 'text-indigo-900' : 'text-slate-300'}`}>{file.name}</p>
                    </div>
                  ))}
                 </div>
               </div>
             </div>
          )}

          {isMobileDrawerOpen === 'history' && (
             <div className="space-y-3 pb-20">
                {savedMaps.length === 0 ? (
                  <div className="text-center p-6 bg-slate-900 border border-dashed border-slate-300 rounded-2xl">
                    <p className="text-sm text-slate-500 font-medium">{t.noSavedMaps}</p>
                  </div>
                ) : (
                  savedMaps.map(map => (
                    <div key={map.id} onClick={() => { loadSavedMap(map); setIsMobileDrawerOpen('none'); }} className="p-4 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer flex justify-between items-center shadow-sm">
                       <h4 className="font-bold text-slate-200 text-sm truncate">{map.topic}</h4>
                       <p className="text-xs text-slate-400 font-medium whitespace-nowrap ml-2">{new Date(map.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
             </div>
          )}

          {isMobileDrawerOpen === 'actions' && (
             <div className="space-y-3 pb-20">
               <button 
                 onClick={() => { generateMindMap(); setIsMobileDrawerOpen('none'); }}
                 disabled={isStreaming || !topic.trim()}
                 className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black rounded-xl shadow-lg disabled:opacity-50"
               >
                 {isStreaming ? <Loader2 size={18} className="animate-spin"/> : <Network size={18}/>}
                 {isStreaming ? t.generating : t.generateMap}
               </button>
             </div>
          )}

          {/* Sticky Done Button */}
          <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t from-white via-white to-transparent">
            <button onClick={() => setIsMobileDrawerOpen('none')} className="w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-500">
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}

export default function MindMapPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><MindMapPageContent /></Suspense>;
}
