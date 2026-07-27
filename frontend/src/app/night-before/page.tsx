'use client';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Zap, Map, Lightbulb, FileSignature, Target, Loader2, Play, Pause, Square, Headphones, CheckCircle2, Trash2, Volume2, Type, History, X, Info, ListTree, Circle, BookOpen, Menu, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { useTokens } from '@/hooks/useTokens';
import { getPublicErrorMessage, showPublicError } from '@/lib/errors/publicError';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    panicMode: "Panic Mode", nightBeforeOpt: "Night Before Exam Optimization",
    targetMaterials: "RAG Sources", syllabusVault: "Syllabus Vault",
    yourLibrary: "Your Library", noHistory: "No saved history yet.",
    generalGuide: "General Guide / Summary", placeholder: "Specific topic, or paste a difficult paragraph you want me to explain? (Optional)",
    library: "Library", captions: "Captions", liveTranscribe: "Live Transcribe",
    studyDesk: "Your Study Desk", studyDeskDesc: "Click \"Library\" to view past sessions, or select materials to generate a new study guide instantly.",
    extracting: "Extracting critical information...", synthesizing: "Synthesizing master response...",
    definition: "Definition", summaryBtn: "5-Min Summary", roadmapBtn: "Study Roadmap",
    realLifeBtn: "Explain like I'm 5", cheatSheetBtn: "Cheat Sheet", topQuestionsBtn: "Top 5 Questions",
    actionFailed: "Action Failed"
  },
  Bangla: {
    panicMode: "প্যানিক মোড", nightBeforeOpt: "পরীক্ষার আগের রাতের প্রস্তুতি",
    targetMaterials: "RAG সোর্স", syllabusVault: "সিলেবাস ভল্ট",
    yourLibrary: "আপনার লাইব্রেরি", noHistory: "কোনো হিস্ট্রি সেভ করা নেই।",
    generalGuide: "সাধারণ গাইড / সারসংক্ষেপ", placeholder: "স্পেসিফিক টপিক, অথবা কঠিন কোনো প্যারাগ্রাফ দিন যা বুঝিয়ে বলতে হবে? (ঐচ্ছিক)",
    library: "লাইব্রেরি", captions: "ক্যাপশন", liveTranscribe: "লাইভ ট্রান্সক্রাইব",
    studyDesk: "আপনার স্টাডি ডেস্ক", studyDeskDesc: "আগের সেশনগুলো দেখতে 'লাইব্রেরি' তে ক্লিক করুন, অথবা সাথে সাথে নতুন গাইড তৈরি করতে ম্যাটেরিয়াল সিলেক্ট করুন।",
    extracting: "গুরুত্বপূর্ণ তথ্য বের করা হচ্ছে...", synthesizing: "মাস্টার রেসপন্স তৈরি করা হচ্ছে...",
    definition: "সংজ্ঞা", summaryBtn: "৫-মিনিট সামারি", roadmapBtn: "স্টাডি রোডম্যাপ",
    realLifeBtn: "বাচ্চাদের মতো বোঝান", cheatSheetBtn: "চিট শিট", topQuestionsBtn: "টপ ৫ প্রশ্ন",
    actionFailed: "অ্যাকশন ফেইল হয়েছে"
  },
  Hindi: {
    panicMode: "पैनिक मोड", nightBeforeOpt: "परीक्षा से पहले की रात की तैयारी",
    targetMaterials: "RAG स्रोत", syllabusVault: "सिलेबस तिजोरी",
    yourLibrary: "आपकी लाइब्रेरी", noHistory: "अभी तक कोई इतिहास नहीं सहेजा गया।",
    generalGuide: "सामान्य गाइड / सारांश", placeholder: "विशिष्ट विषय, या कोई कठिन पैराग्राफ जिसे आप समझाना चाहते हैं? (वैकल्पिक)",
    library: "लाइब्रेरी", captions: "कैप्शन", liveTranscribe: "लाइव ट्रांसक्राइब",
    studyDesk: "आपका अध्ययन डेस्क", studyDeskDesc: "पिछले सत्र देखने के लिए 'लाइब्रेरी' पर क्लिक करें, या तुरंत नया स्टडी गाइड बनाने के लिए सामग्री चुनें।",
    extracting: "महत्वपूर्ण जानकारी निकाली जा रही है...", synthesizing: "मास्टर प्रतिक्रिया तैयार की जा रही है...",
    definition: "परिभाषा", summaryBtn: "5-मिनट सारांश", roadmapBtn: "स्टडी रोडमैप",
    realLifeBtn: "बच्चों की तरह समझाएं", cheatSheetBtn: "चीट शीट", topQuestionsBtn: "शीर्ष 5 प्रश्न",
    actionFailed: "कार्रवाई विफल"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function NightBeforePage() {
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();
  const [files, setFiles] = useState<any[]>([]);
  
  // 🟢 STATE: RAG Sources (Multi Select)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  // 🟢 FIXED STATE: Course is strictly Single Select (String)
  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
  
  // 🟢 FIXED STATE: Chapters and Topics are Multi Select (Array)
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const [topic, setTopic] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  
  const [results, setResults] = useState<{action: string, content: string, glossary?: any, id?: string}[]>([]);  
  const [historyList, setHistoryList] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create');
  const [uiTheme, setUiTheme] = useState<'dark'|'light'>('dark');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(true);
  const [currentCleanText, setCurrentCleanText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];
  
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const teleprompterRef = useRef<HTMLDivElement>(null);

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(5);

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'files'|'history'|'actions'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFilesAndSyllabuses();
    fetchHistory(); 
    
    const loadSettings = () => { 
      const savedLang = localStorage.getItem('Prepia_language'); if (savedLang) setLanguage(savedLang as LanguageType); 
      const savedTheme = localStorage.getItem('Prepia_theme'); if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
    };
    loadSettings(); 
    window.addEventListener('languageChanged', loadSettings);
    window.addEventListener('settingsChanged', loadSettings);

    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          if (!selectedVoice) {
            const preferred = availableVoices.find(v => v.name.includes('Natural') || v.name.includes('Google UK') || v.lang === 'en-US') || availableVoices[0];
            if (preferred) setSelectedVoice(preferred.name);
          }
        }
      };
      loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => { 
      if (synthRef.current) synthRef.current.cancel(); 
      window.removeEventListener('languageChanged', loadSettings); 
      window.removeEventListener('settingsChanged', loadSettings);
    };
  }, []);

  useEffect(() => {
    if (teleprompterRef.current && isPlaying && !isPaused) {
      const activeElement = teleprompterRef.current.querySelector('.active-word');
      if (activeElement) activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentCharIndex, isPlaying, isPaused]);

  useEffect(() => { resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [results, isLoading]);

  const fetchFilesAndSyllabuses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: fData } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed');
    if (fData) setFiles(fData);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/list` : `${apiUrlBase}/api/syllabus/list`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const sData = await res.json();
      if (sData.success) setSyllabuses(sData.syllabuses);
    } catch(e) {}
  };

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data, error } = await supabase.from('night_exam_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data && !error) setHistoryList(data);
  };

  const saveToHistory = async (action: string, topicStr: string, filesArr: string[], finalContent: string, glossaryData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const { data, error } = await supabase.from('night_exam_history').insert([{ 
        user_id: user.id, action, topic: topicStr.trim() || null, file_ids: filesArr, content: finalContent, glossary: glossaryData 
      }]).select();
      
      if (!error && data && data[0]) {
        setResults(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].action === action) updated[updated.length - 1].id = data[0].id;
          return updated;
        });
        setHistoryList(prev => [data[0], ...prev]);
      }
    } catch (err) {}
  };

  const deleteHistoryItem = async (id: string) => {
    if (!id) return; stopAudio();
    const { error } = await supabase.from('night_exam_history').delete().eq('id', id);
    if (!error) {
      setResults(prev => prev.filter(item => item.id !== id));
      setHistoryList(prev => prev.filter(item => item.id !== id));
    }
  };

  // 🟢 RAG SOURCES (Multiple Select Allowed)
  const toggleFile = (id: string) => setSelectedFileIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  // 🟢 FIXED: SINGLE SELECT LOGIC FOR COURSE (Strictly overrides previous selection)
  const handleSyllabusSelect = (id: string) => {
    setSelectedSyllabusId(prev => prev === id ? '' : id); // If clicked same, deselect. Else, set new.
    setSelectedChapterIds([]); // Automatically reset lower-level selections
    setSelectedTopics([]); 
  };

  // 🟢 FIXED: MULTI SELECT LOGIC FOR CHAPTER
  const toggleChapterSelection = (chapterId: string) => {
    setSelectedChapterIds(prev => prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]);
  };

  // 🟢 MULTI SELECT FOR TOPICS
  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > 50) {
      if (!isScrolled) setIsScrolled(true);
    } else {
      if (isScrolled) setIsScrolled(false);
    }
    
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const triggerAction = async (action: string) => {
    if (selectedFileIds.length === 0 && !topic.trim() && !selectedSyllabusId) 
      return alert("Please select a file, a syllabus course, or enter a specific topic first!");

    if (tier !== 'PRO' && tokens < 5) {
      setRequiredTokensForModal(5);
      setShowTokenModal(true);
      return;
    }
    
    stopAudio(); setIsLoading(true); setActiveAction(action); setResults([{ action, content: '', glossary: {} }]); 
    setIsScrolled(false); // Reset scroll state on new action 

    const currentTopic = topic;
    const currentFiles = [...selectedFileIds];
    
    // Extract Metadata Boundaries for Context Core
    const activeCourse = syllabuses.find(s => s.id === selectedSyllabusId);
    const availableChaptersForRequest = activeCourse?.chapters || [];
    
    const syllabusCourseNames = activeCourse ? [activeCourse.course_name] : [];
    const syllabusChapters = availableChaptersForRequest
      .filter((ch: any) => selectedChapterIds.includes(ch.id))
      .map((ch: any) => ch.title);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 Minutes Timeout Limit

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/night-before` : `${apiUrl}/api/night-before`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          action, topic: currentTopic, fileIds: currentFiles, language,
          syllabusCourseNames, syllabusChapters, syllabusTopics: selectedTopics 
        }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8');
      
      let fullResponse = ''; let displayContent = ''; let currentGlossary = {};
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]' || !dataStr) continue;
            let data: any;
            try { data = JSON.parse(dataStr); } catch (e) { continue; }
            if (data.error) {
              if (data.error === 'INSUFFICIENT_TOKENS') {
                setRequiredTokensForModal(data.required || 5);
                setShowTokenModal(true);
                setIsLoading(false);
                setActiveAction(null);
                setResults([]);
                return;
              }
              throw new Error(data.error);
            }
            if (data.content !== undefined) {
              fullResponse += data.content;
              if (fullResponse.includes('===GLOSSARY===')) {
                const parts = fullResponse.split('===GLOSSARY===');
                displayContent = parts[0].trim();
                try { currentGlossary = JSON.parse(parts[1].trim()); } catch (e) {}
              } else { displayContent = fullResponse; }
              setResults([{ action, content: displayContent, glossary: currentGlossary }]);
            }
          }
        }
      }
      if (displayContent.trim().length > 10) await saveToHistory(action, currentTopic, currentFiles, displayContent, currentGlossary);
      refreshTokens();
    } catch (error: any) {
      const message = getPublicErrorMessage();
      setResults([{ action, content: message, glossary: {} }]);
      showPublicError();
    } finally { 
      setIsLoading(false); setActiveAction(null); 
    }
  };

  const loadFromHistory = (historyItem: any) => {
    stopAudio(); setResults([{ id: historyItem.id, action: historyItem.action, content: historyItem.content, glossary: historyItem.glossary || {} }]);
    if (historyItem.topic) setTopic(historyItem.topic); 
    setActiveTab('create');
    setIsMobileSidebarOpen(false);
  };

  const cleanTextForAudio = (markdownText: string) => { return markdownText.replace(/[#*`_~>\[\]]/g, '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/-/g, ', ').trim(); };

  const playAudio = (text: string, index: number) => {
    if (!synthRef.current) return alert("Your browser does not support audio playback.");
    if (isPaused && currentPlayingIndex === index) { synthRef.current.resume(); setIsPaused(false); setIsPlaying(true); return; }
    synthRef.current.cancel();
    const cleanText = cleanTextForAudio(text); if (!cleanText) return;
    setCurrentCleanText(cleanText); setCurrentCharIndex(0);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isBangla = /[\u0980-\u09FF]/.test(cleanText); const isHindi = /[\u0900-\u097F]/.test(cleanText);
    let targetVoice = null;
    if (isBangla) targetVoice = voices.find(v => v.lang.includes('bn') || v.lang.includes('Bengali'));
    else if (isHindi) targetVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('Hindi'));
    else targetVoice = voices.find(v => v.name === selectedVoice) || voices.find(v => v.lang.includes('en'));
    if (targetVoice) utterance.voice = targetVoice;
    utterance.rate = isBangla || isHindi ? 0.85 : 0.95; utterance.pitch = 1.0; utterance.volume = 1.0;
    utterance.onboundary = (event) => { if (event.name === 'word') setCurrentCharIndex(event.charIndex); };
    utterance.onstart = () => { setIsPlaying(true); setIsPaused(false); setCurrentPlayingIndex(index); };
    utterance.onend = () => { setIsPlaying(false); setIsPaused(false); setCurrentPlayingIndex(null); setCurrentCharIndex(0); };
    utterance.onerror = () => { setIsPlaying(false); setIsPaused(false); setCurrentPlayingIndex(null); };
    synthRef.current.speak(utterance);
  };

  const pauseAudio = () => { if (synthRef.current && isPlaying) { synthRef.current.pause(); setIsPaused(true); setIsPlaying(false); } };
  const stopAudio = () => { if (synthRef.current) { synthRef.current.cancel(); setIsPlaying(false); setIsPaused(false); setCurrentPlayingIndex(null); setCurrentCharIndex(0); } };

  const renderTeleprompter = () => {
    const before = currentCleanText.substring(0, currentCharIndex); const after = currentCleanText.substring(currentCharIndex);
    const currentWordMatch = after.match(/^\S+/); const currentWord = currentWordMatch ? currentWordMatch[0] : '';
    const rest = after.substring(currentWord.length);
    return (
      <div className="text-xl md:text-2xl font-bold leading-relaxed tracking-wide text-slate-500 transition-all duration-150">
        <span>{before}</span><span className="active-word text-indigo-400 bg-indigo-900/40 px-1 rounded-md py-0.5 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-100">{currentWord}</span><span>{rest}</span>
      </div>
    );
  };

  const actions = [
    { id: 'summary', title: t.summaryBtn, icon: <Zap size={20} className="text-amber-500" /> },
    { id: 'roadmap', title: t.roadmapBtn, icon: <Map size={20} className="text-blue-500" /> },
    { id: 'real_life', title: t.realLifeBtn, icon: <Lightbulb size={20} className="text-yellow-500" /> },
    { id: 'cheat_sheet', title: t.cheatSheetBtn, icon: <FileSignature size={20} className="text-emerald-500" /> },
    { id: 'top_questions', title: t.topQuestionsBtn, icon: <Target size={20} className="text-red-500" /> },
  ];
  const getActionTitle = (id: string) => actions.find(a => a.id === id)?.title || 'Action';

  // 🟢 DERIVE HIERARCHAL OPTION VIEWS
  const activeCourse = syllabuses.find(s => s.id === selectedSyllabusId);
  const availableChapters = activeCourse?.chapters || [];
  
  // Topics available dynamically based on selected chapters (If none selected, show all course topics)
  const availableTopics = availableChapters
    .filter((c:any) => selectedChapterIds.length === 0 || selectedChapterIds.includes(c.id))
    .flatMap((c:any) => c.topics || []);

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className={`min-h-screen lg:min-h-0 lg:h-[calc(100vh-80px)] lg:p-4 transition-colors duration-500 ${uiTheme === 'dark' ? 'bg-slate-950 lg:bg-transparent' : 'bg-slate-50 lg:bg-transparent'}`}>
        <div className={`flex flex-col lg:flex-row h-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden lg:border-slate-200/60 lg:border lg:rounded-3xl shadow-2xl custom-scrollbar transition-colors duration-500 ${uiTheme === 'dark' ? 'bg-slate-950 lg:bg-slate-900 lg:border-slate-800' : 'bg-white lg:bg-white'}`}>
        
        {/* Sidebar */}
        <div className={`hidden lg:flex lg:w-[35%] lg:border-r p-5 lg:p-8 flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar relative shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.05)] transition-colors ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

          {/* Action Tabs */}
          <button onClick={() => { setActiveTab('create'); setIsMobileSidebarOpen(false); }} className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl shadow-sm font-bold transition mb-3 ${activeTab === 'create' ? 'bg-indigo-600 text-white' : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-400 border' : 'bg-white border border-slate-300 text-slate-700 hover:border-indigo-400')}`}>
            <PlusCircle size={18} /> New Session
          </button>
          <button onClick={() => { setActiveTab('library'); setIsMobileSidebarOpen(false); }} className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl shadow-sm font-bold transition mb-6 ${activeTab === 'library' ? 'bg-indigo-600 text-white' : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-400 border' : 'bg-white border border-slate-300 text-slate-700 hover:border-indigo-400')}`}>
            <History size={18} /> {t.library}
          </button>

          <div className={`mb-6 p-4 border rounded-2xl ${uiTheme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
            <h2 className={`font-black flex items-center gap-2 text-lg uppercase tracking-wider ${uiTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}><Zap size={20}/> {t.panicMode}</h2>
            <p className={`text-xs mt-1 font-medium ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.nightBeforeOpt}</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {/* RAG Sources (Multi-Select Allowed) */}
            <div>
              <h3 className={`text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`}><BookOpen size={14}/> {t.targetMaterials}</h3>
              <div className="space-y-1.5">
                {files.map(file => {
                  const isSelected = selectedFileIds.includes(file.id);
                  return (
                  <div key={file.id} onClick={() => toggleFile(file.id)} className={`group flex items-start gap-2 p-2 rounded-xl cursor-pointer border transition-all ${isSelected ? (uiTheme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-indigo-50 border-indigo-500') : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-transparent hover:border-slate-200')}`}>
                    <div className="mt-0.5">{isSelected ? <CheckCircle2 className={uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} size={16} /> : <div className={`w-3.5 h-3.5 border-2 rounded ${uiTheme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />}</div>
                    <div className="overflow-hidden"><p className={`text-xs font-bold truncate transition ${isSelected ? (uiTheme === 'dark' ? 'text-indigo-300' : 'text-indigo-900') : (uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-600')}`}>{file.name}</p></div>
                  </div>
                )})}
              </div>
            </div>

            {/* 🟢 Syllabus Vault (Course strictly 1, Chapter Multi, Topics Multi) */}
            {syllabuses.length > 0 && (
              <div className={`pt-2 border-t ${uiTheme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <h3 className={`text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${uiTheme === 'dark' ? 'text-amber-500' : 'text-amber-600'}`}><ListTree size={14}/> {t.syllabusVault}</h3>
                
                {/* Courses (Max 1 - Radio Button Behavior) */}
                <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Course (Single Select)</p>
                <div className="space-y-1.5">
                  {syllabuses.map(syl => {
                    const isSelected = selectedSyllabusId === syl.id;
                    return (
                    <div key={syl.id} onClick={() => handleSyllabusSelect(syl.id)} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-xs font-bold transition-all border ${isSelected ? (uiTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' : 'bg-amber-50 border-amber-500 text-amber-700') : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}`}>
                      {isSelected ? <CheckCircle2 size={14} className={uiTheme === 'dark' ? 'text-amber-400 shrink-0' : 'text-amber-600 shrink-0'}/> : <Circle size={14} className={`shrink-0 ${uiTheme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}/>}
                      <span className="truncate">{syl.course_name}</span>
                    </div>
                  )})}
                </div>

                {/* Chapters (Multiple) */}
                {selectedSyllabusId && availableChapters.length > 0 && (
                  <div className={`mt-3 pl-2 border-l-2 space-y-1.5 ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Chapters (Multi Select)</p>
                    {availableChapters.map((chap: any) => {
                      const isSelected = selectedChapterIds.includes(chap.id);
                      return (
                      <div key={chap.id} onClick={() => toggleChapterSelection(chap.id)} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-[11px] font-bold transition-all border ${isSelected ? (uiTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-700') : (uiTheme === 'dark' ? 'bg-slate-950 border-slate-800/50 text-slate-500 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300')}`}>
                        {isSelected ? <CheckCircle2 size={12} className={uiTheme === 'dark' ? 'text-amber-400 shrink-0' : 'text-amber-500 shrink-0'}/> : <Circle size={12} className={`shrink-0 ${uiTheme === 'dark' ? 'text-slate-700' : 'text-slate-400'}`}/>}
                        <span className="truncate">{chap.title}</span>
                      </div>
                    )})}
                  </div>
                )}

                {/* Topics (Multiple Allowed) */}
                {selectedSyllabusId && availableTopics.length > 0 && (
                  <div className={`mt-3 pl-4 border-l-2 ${uiTheme === 'dark' ? 'border-slate-800/50' : 'border-slate-200'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}><Target size={10}/> Topics (Multi Select)</p>
                    <div className="flex flex-wrap gap-1">
                      {availableTopics.map((topic: string, idx: number) => {
                        const isSelected = selectedTopics.includes(topic);
                        return (
                        <button key={idx} onClick={() => toggleTopicSelection(topic)} className={`text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded border transition-all ${isSelected ? (uiTheme === 'dark' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-500 text-emerald-700') : (uiTheme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300')}`}>
                          {topic}
                        </button>
                      )})}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div ref={scrollRef} onScroll={handleScroll} className={`w-full lg:w-[65%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative lg:overflow-y-auto custom-scrollbar transition-colors ${uiTheme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} ${uiTheme === 'dark' ? 'bg-slate-900/90 border-slate-700/50' : 'bg-white/90 border-slate-200/50'}`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-red-500"><Zap size={16}/> {t.panicMode}</h2>
              <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">{t.nightBeforeOpt}</p>
            </div>
          </div>

          {/* LIBRARY (HISTORY) VIEW */}
          {activeTab === 'library' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in zoom-in duration-300 custom-scrollbar">
              <h1 className={`text-3xl font-black mb-8 ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.yourLibrary}</h1>
              {historyList.length === 0 ? (
                <div className={`text-center py-20 rounded-3xl border ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <History className={`mx-auto mb-4 ${uiTheme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} size={48} />
                  <h3 className={`text-xl font-bold ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{t.noHistory}</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {historyList.map(h => (
                    <div key={h.id} onClick={() => loadFromHistory(h)} className={`p-6 border rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer group transition ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${uiTheme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>{getActionTitle(h.action)}</span>
                          <button onClick={(e) => {e.stopPropagation(); deleteHistoryItem(h.id);}} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"><Trash2 size={16}/></button>
                        </div>
                        <p className={`text-sm font-bold line-clamp-2 mt-3 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{h.topic || t.generalGuide}</p>
                      </div>
                      <div className={`mt-4 pt-4 border-t text-xs font-bold ${uiTheme === 'dark' ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                        {new Date(h.created_at).toLocaleDateString()} at {new Date(h.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE NEW OPTIMIZATION VIEW */}
          {activeTab === 'create' && (
            <>
              {/* Top Action Bar (Buttons above Input) */}
              <div className={`hidden lg:flex p-4 md:p-6 border-b z-10 flex-col gap-4 transition-all duration-300 ${isScrolled ? 'hidden md:flex' : 'flex'} ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md`}>
                
                {/* 5 Buttons - Responsive Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {actions.map(action => (
                    <button key={action.id} onClick={() => triggerAction(action.id)} disabled={isLoading || (selectedFileIds.length === 0 && !topic.trim() && !selectedSyllabusId)} className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold transition shadow-sm border disabled:opacity-50 disabled:cursor-not-allowed ${activeAction === action.id ? 'bg-indigo-600 text-white border-indigo-500' : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')}`}>
                      {activeAction === action.id ? <Loader2 size={16} className="animate-spin text-white"/> : action.icon} 
                      <span className="text-xs">{action.title}</span>
                    </button>
                  ))}
                </div>

                {/* Input and Settings */}
                <div className="flex flex-col md:flex-row gap-4 mt-2">
                  <div className="flex-1 relative">
                    <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={t.placeholder} rows={2} className={`w-full p-4 rounded-xl border outline-none resize-none custom-scrollbar shadow-inner transition ${uiTheme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400'}`} />
                  </div>
                  
                  <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0">
                    <button onClick={() => setIsCaptionsEnabled(!isCaptionsEnabled)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border w-full ${isCaptionsEnabled ? (uiTheme === 'dark' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-indigo-100 text-indigo-700 border-indigo-200') : (uiTheme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}`} title="Toggle Animated Subtitles"><Type size={14} /> {t.captions}</button>
                    {voices.length > 0 && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <Volume2 size={14} className={uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                        <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className={`bg-transparent text-xs font-bold outline-none cursor-pointer max-w-[120px] truncate ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {voices.filter(v => v.lang.startsWith('en')).map(v => <option key={v.name} value={v.name} className={uiTheme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800'}>{v.name.replace('Microsoft ', '').replace('Google ', '')}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Results Area */}
              <div className="flex-1 lg:overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth custom-scrollbar relative pb-40 lg:pb-8">
            {isPlaying && isCaptionsEnabled && currentCleanText && (
               <div className={`sticky top-0 z-30 mb-8 w-full backdrop-blur-xl border shadow-2xl rounded-2xl p-6 overflow-hidden ${uiTheme === 'dark' ? 'bg-slate-950/90 border-indigo-500/30 shadow-indigo-500/10' : 'bg-white/90 border-indigo-200 shadow-indigo-500/5'}`}>
                 <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className={`text-xs font-black uppercase tracking-widest ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.liveTranscribe}</span></div>
                 <div ref={teleprompterRef} className="max-h-40 overflow-y-auto custom-scrollbar pr-4 pb-4">{renderTeleprompter()}</div>
               </div>
            )}

            {results.length === 0 && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto animate-in fade-in zoom-in duration-500">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'}`}><History size={40} /></div>
                <h3 className={`text-2xl font-black tracking-tight mb-3 ${uiTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t.studyDesk}</h3>
                <p className={`text-lg leading-relaxed ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.studyDeskDesc}</p>
              </div>
            ) : (
              results.map((result, i) => {
                const isThisPlaying = currentPlayingIndex === i;
                return (
                <div key={i} className="animate-in slide-in-from-bottom-2 fade-in duration-300 relative group">
                  <div className="flex justify-between items-end mb-2">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-t-xl border border-b-0 text-xs font-bold uppercase tracking-wider ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-indigo-300' : 'bg-white border-slate-200 text-indigo-600'}`}>{getActionTitle(result.action)}</div>
                    {result.content && (
                      <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <Headphones size={14} className="text-indigo-500 mr-2" />
                        {!isThisPlaying || isPaused ? <button onClick={() => playAudio(result.content, i)} className={`transition ${uiTheme === 'dark' ? 'text-slate-300 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`} title="Play Audio"><Play size={16} className="fill-current" /></button> : <button onClick={pauseAudio} className={`transition ${uiTheme === 'dark' ? 'text-slate-300 hover:text-amber-400' : 'text-slate-500 hover:text-amber-500'}`} title="Pause Audio"><Pause size={16} className="fill-current" /></button>}
                        <button onClick={stopAudio} className={`transition border-r pr-2 mr-1 ${uiTheme === 'dark' ? 'text-slate-300 hover:text-red-400 border-slate-600' : 'text-slate-500 hover:text-red-500 border-slate-200'}`} title="Stop Audio"><Square size={14} className="fill-current" /></button>
                        {result.id && <button onClick={() => deleteHistoryItem(result.id!)} className={`transition ml-1 ${uiTheme === 'dark' ? 'text-slate-500 hover:text-red-500' : 'text-slate-400 hover:text-red-500'}`} title="Delete from History"><Trash2 size={14} /></button>}
                        {isThisPlaying && !isPaused && (
                          <div className="flex items-end gap-0.5 ml-2 h-3">
                            <div className="w-1 bg-indigo-500 h-full animate-[bounce_1s_infinite]"></div><div className="w-1 bg-indigo-500 h-2/3 animate-[bounce_1.2s_infinite]"></div><div className="w-1 bg-indigo-500 h-full animate-[bounce_0.8s_infinite]"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`p-6 border rounded-b-2xl rounded-tr-2xl shadow-lg transition-all ${isThisPlaying && !isPaused ? (uiTheme === 'dark' ? 'border-indigo-500/50 shadow-indigo-500/10' : 'border-indigo-400 shadow-indigo-500/5') : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}`}>
                    {result.content === '' ? (
                       <div className={`flex items-center gap-3 font-medium ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}><Loader2 size={18} className="animate-spin text-indigo-500" /> {t.extracting}</div>
                    ) : (
                      <div className={`prose max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-indigo-500 prose-li:marker:text-indigo-500 ${uiTheme === 'dark' ? 'prose-invert text-slate-200 prose-p:text-slate-200 prose-li:text-slate-200 prose-strong:text-indigo-300 prose-headings:text-white' : 'text-slate-800 prose-p:text-slate-800 prose-li:text-slate-800 prose-strong:text-indigo-700 prose-headings:text-slate-900'}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
                          components={{
                            strong: ({node, children, ...props}) => {
                              const term = String(children); const glossary = result.glossary || {}; const defKey = Object.keys(glossary).find(k => k.toLowerCase() === term.toLowerCase());
                              if (defKey) {
                                return (
                                  <span className={`relative group/word inline-block font-bold border-b border-dashed cursor-help transition-colors ${uiTheme === 'dark' ? 'text-indigo-300 border-indigo-400 hover:text-indigo-200 hover:border-indigo-300' : 'text-indigo-700 border-indigo-500 hover:text-indigo-600 hover:border-indigo-400'}`}>
                                    {children}
                                    <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 border text-sm font-medium rounded-xl opacity-0 group-hover/word:opacity-100 transition-all duration-200 pointer-events-none shadow-2xl z-50 scale-95 group-hover/word:scale-100 ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                                      <span className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-1 border-b pb-1 ${uiTheme === 'dark' ? 'text-indigo-400 border-slate-700' : 'text-indigo-600 border-slate-200'}`}><Info size={12}/> {t.definition}</span>
                                      {glossary[defKey]}
                                      <svg className={`absolute h-2 w-full left-0 top-full ${uiTheme === 'dark' ? 'text-slate-900' : 'text-white'}`} x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                                    </span>
                                  </span>
                                );
                              }
                              return <strong className={`font-bold ${uiTheme === 'dark' ? 'text-indigo-200' : 'text-indigo-700'}`} {...props}>{children}</strong>;
                            }
                          }}
                        >
                          {result.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
            
            {isLoading && results.length > 0 && results[results.length - 1].content === '' && (
              <div className={`flex items-center gap-3 font-medium p-4 rounded-2xl border ${uiTheme === 'dark' ? 'text-slate-400 bg-slate-800/50 border-slate-700/50' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                 <Loader2 size={18} className="animate-spin text-indigo-500" /> {t.synthesizing}
              </div>
            )}
            <div ref={resultsEndRef} />
          </div>
          </>
          )}

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-950 via-slate-950/80' : 'from-slate-50 via-slate-50/80'} to-transparent ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            {/* Mobile Action Pills */}
            <div className="flex gap-2 overflow-x-auto mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('actions')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${activeAction ? (uiTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                <Zap size={12}/> Generate
              </button>
              <button onClick={() => setIsMobileDrawerOpen('files')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${(selectedFileIds.length > 0 || selectedSyllabusId) ? (uiTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                <BookOpen size={12}/> Sources {(selectedFileIds.length > 0 || selectedSyllabusId) && `(Selected)`}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('history')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}>
                <History size={12}/> Library
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-[2rem] blur-md opacity-50 transition duration-500 ${uiTheme === 'dark' ? 'group-focus-within:opacity-100' : 'group-focus-within:opacity-70'}`}></div>
              <div className={`relative flex shadow-xl rounded-[2rem] border transition-all backdrop-blur-xl overflow-hidden p-1 ${uiTheme === 'dark' ? 'bg-slate-900/90 border-slate-700/50 focus-within:border-indigo-500/50' : 'bg-white/90 border-slate-200 focus-within:border-indigo-400 focus-within:bg-white'}`}>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder={t.placeholder}
                  disabled={isLoading}
                  className={`w-full pl-4 pr-2 py-3 bg-transparent border-none focus:ring-0 outline-none disabled:opacity-50 text-sm font-medium ${uiTheme === 'dark' ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[75vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-black tracking-tight flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
              {isMobileDrawerOpen === 'files' && <><BookOpen size={18} className="text-indigo-500"/> Select Knowledge</>}
              {isMobileDrawerOpen === 'history' && <><History size={18} className="text-indigo-500"/> Your Library</>}
              {isMobileDrawerOpen === 'actions' && <><Zap size={18} className="text-red-500"/> Action Menu</>}
            </h3>
          </div>

          {/* FILES & SYLLABUS DRAWER */}
          {isMobileDrawerOpen === 'files' && (
            <div className="space-y-6 pb-10">
              <div>
                <h3 className={`text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`}><BookOpen size={14}/> {t.targetMaterials}</h3>
                <div className="space-y-1.5">
                  {files.map(file => {
                    const isSelected = selectedFileIds.includes(file.id);
                    return (
                    <div key={file.id} onClick={() => toggleFile(file.id)} className={`group flex items-start gap-2 p-3 rounded-xl cursor-pointer border transition-all ${isSelected ? (uiTheme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-indigo-50 border-indigo-500') : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}`}>
                      <div className="mt-0.5">{isSelected ? <CheckCircle2 className={uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} size={16} /> : <div className={`w-3.5 h-3.5 border-2 rounded ${uiTheme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />}</div>
                      <div className="overflow-hidden"><p className={`text-sm font-bold truncate transition ${isSelected ? (uiTheme === 'dark' ? 'text-indigo-300' : 'text-indigo-900') : (uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-600')}`}>{file.name}</p></div>
                    </div>
                  )})}
                </div>
              </div>

              {syllabuses.length > 0 && (
                <div>
                  <h3 className={`text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 ${uiTheme === 'dark' ? 'text-amber-500' : 'text-amber-600'}`}><ListTree size={14}/> {t.syllabusVault}</h3>
                  <div className="space-y-1.5">
                    {syllabuses.map(syl => {
                      const isSelected = selectedSyllabusId === syl.id;
                      return (
                      <div key={syl.id} onClick={() => handleSyllabusSelect(syl.id)} className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer text-sm font-bold transition-all border ${isSelected ? (uiTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' : 'bg-amber-50 border-amber-500 text-amber-700') : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                        {isSelected ? <CheckCircle2 size={16} className={uiTheme === 'dark' ? 'text-amber-400 shrink-0' : 'text-amber-600 shrink-0'}/> : <Circle size={16} className={`shrink-0 ${uiTheme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}/>}
                        <span className="truncate">{syl.course_name}</span>
                      </div>
                    )})}
                  </div>

                  {selectedSyllabusId && availableChapters.length > 0 && (
                    <div className={`mt-3 pl-3 border-l-2 space-y-1.5 ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                      <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Chapters (Multi Select)</p>
                      {availableChapters.map((chap: any) => {
                        const isSelected = selectedChapterIds.includes(chap.id);
                        return (
                        <div key={chap.id} onClick={() => toggleChapterSelection(chap.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-[12px] font-bold transition-all border ${isSelected ? (uiTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-700') : (uiTheme === 'dark' ? 'bg-slate-950 border-slate-800/50 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                          {isSelected ? <CheckCircle2 size={14} className={uiTheme === 'dark' ? 'text-amber-400 shrink-0' : 'text-amber-500 shrink-0'}/> : <Circle size={14} className={`shrink-0 ${uiTheme === 'dark' ? 'text-slate-700' : 'text-slate-400'}`}/>}
                          <span className="truncate">{chap.title}</span>
                        </div>
                      )})}
                    </div>
                  )}
                  {selectedSyllabusId && availableTopics.length > 0 && (
                    <div className={`mt-3 pl-4 border-l-2 ${uiTheme === 'dark' ? 'border-slate-800/50' : 'border-slate-200'}`}>
                      <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}><Target size={10}/> Topics (Multi Select)</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTopics.map((topic: string, idx: number) => {
                          const isSelected = selectedTopics.includes(topic);
                          return (
                          <button key={idx} onClick={() => toggleTopicSelection(topic)} className={`text-[11px] font-black tracking-wide px-2 py-1 rounded-md border transition-all ${isSelected ? (uiTheme === 'dark' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-500 text-emerald-700') : (uiTheme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                            {topic}
                          </button>
                        )})}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* HISTORY DRAWER */}
          {isMobileDrawerOpen === 'history' && (
            <div className="space-y-3 pb-10">
              {historyList.length === 0 ? (
                <div className={`text-center mt-4 p-6 border-2 border-dashed rounded-3xl ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}><p className="text-sm text-slate-500 font-medium">{t.noHistory}</p></div>
              ) : (
                historyList.map((item) => (
                  <div key={item.id} onClick={() => {
                      loadFromHistory(item); setIsMobileDrawerOpen('none'); scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-sm flex flex-col ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-bold line-clamp-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{item.topic || t.generalGuide}</p>
                      <div className="flex gap-2 ml-2" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => deleteHistoryItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                       <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${uiTheme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{getActionTitle(item.action)}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase mt-2">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ACTIONS DRAWER */}
          {isMobileDrawerOpen === 'actions' && (
            <div className="space-y-3 pb-10">
               {actions.map(action => (
                <button key={action.id} onClick={() => { setIsMobileDrawerOpen('none'); triggerAction(action.id); }} disabled={isLoading || (selectedFileIds.length === 0 && !topic.trim() && !selectedSyllabusId)} className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl font-bold transition shadow-sm border disabled:opacity-50 disabled:cursor-not-allowed ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 active:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 active:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    {activeAction === action.id ? <Loader2 size={20} className="animate-spin text-indigo-500"/> : action.icon} 
                    <span className="text-sm">{action.title}</span>
                  </div>
                  <Play size={16} className={uiTheme === 'dark' ? 'text-slate-600' : 'text-slate-300'} />
                </button>
              ))}
            </div>
          )}

          {/* Sticky Done Button */}
          <div className={`sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-900 via-slate-900 to-transparent' : 'from-white via-white to-transparent'}`}>
            <button onClick={() => setIsMobileDrawerOpen('none')} className="w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white">
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>
      </div>
    </SecureLayout>
  );
}
