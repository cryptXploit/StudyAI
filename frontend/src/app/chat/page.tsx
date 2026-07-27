'use client';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Send, Bot, Loader2, PlusCircle, FileText, CheckCircle2, User, Copy, Check, ListTree, Circle, Target, BookOpen, History, Trash2, X, MonitorPlay, Edit3, Sparkles, Zap, BrainCircuit, Layers, Network, Beaker, Swords, Headphones, Radar, Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SuggestionEngine, Suggestion } from '@/lib/suggestionEngine';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { toast } from 'react-hot-toast';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    startNewChat: "Start New Chat", chatHistory: "Chat History", knowledgeBase: "RAG Sources",
    syllabusVault: "Syllabus Vault", selected: "Selected", noMaterials: "No materials indexed yet.",
    indexed: "Indexed", studyAssistant: "Study Assistant", secureSession: "Secure Session Active",
    howCanIAssist: "How can I assist you?", assistDesc: "Select your study materials from the sidebar and ask me to explain concepts, solve problems, or summarize topics.",
    copyAnswer: "Copy Answer", copied: "Copied!", thinking: "Thinking and retrieving memory...",
    placeholderEmpty: "Please select a file or syllabus to start...", placeholderActive: "Ask anything about selected topics...",
    noHistory: "No chat history found."
  },
  Bangla: {
    startNewChat: "নতুন চ্যাট শুরু করুন", chatHistory: "চ্যাট হিস্ট্রি", knowledgeBase: "RAG সোর্স",
    syllabusVault: "সিলেবাস ভল্ট", selected: "নির্বাচিত", noMaterials: "এখনও কোনো ম্যাটেরিয়াল ইনডেক্স করা হয়নি।",
    indexed: "ইনডেক্সড", studyAssistant: "স্টাডি অ্যাসিস্ট্যান্ট", secureSession: "নিরাপদ সেশন চালু আছে",
    howCanIAssist: "আমি আপনাকে কীভাবে সাহায্য করতে পারি?", assistDesc: "সাইডবার থেকে আপনার স্টাডি ম্যাটেরিয়াল বেছে নিন এবং আমাকে ধারণাগুলো ব্যাখ্যা করতে বা সমস্যা সমাধান করতে বলুন।",
    copyAnswer: "উত্তর কপি করুন", copied: "কপি হয়েছে!", thinking: "চিন্তা করছি এবং মেমরি খুঁজছি...",
    placeholderEmpty: "শুরু করতে একটি ফাইল বা সিলেবাস নির্বাচন করুন...", placeholderActive: "নির্বাচিত টপিক সম্পর্কে জিজ্ঞাসা করুন...",
    noHistory: "কোনো চ্যাট হিস্ট্রি নেই।"
  },
  Hindi: {
    startNewChat: "नई चैट शुरू करें", chatHistory: "चैट इतिहास", knowledgeBase: "RAG स्रोत",
    syllabusVault: "सिलेबस तिजोरी", selected: "चयनित", noMaterials: "अभी तक कोई सामग्री अनुक्रमित नहीं है।",
    indexed: "अनुक्रमित", studyAssistant: "स्टडी असिस्टेंट", secureSession: "सुरक्षित सत्र सक्रिय है",
    howCanIAssist: "मैं आपकी कैसे सहायता कर सकता हूँ?", assistDesc: "साइडबार से अपनी अध्ययन सामग्री चुनें और मुझे अवधारणाओं को समझाने या समस्याओं को हल करने के लिए कहें।",
    copyAnswer: "उत्तर कॉपी करें", copied: "कॉपी हो गया!", thinking: "सोच रहा हूँ और मेमोरी खोज रहा हूँ...",
    placeholderEmpty: "शुरू करने के लिए कृपया एक फ़ाइल या सिलेबस चुनें...", placeholderActive: "चयनित विषयों के बारे में कुछ भी पूछें...",
    noHistory: "कोई चैट इतिहास नहीं मिला।"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const MemoizedMarkdown = React.memo(({ content }: { content: string }) => {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} rehypePlugins={[rehypeKatex]}
      components={{
        table: ({node, ...props}) => <div className="overflow-x-auto my-6 border border-slate-700/50 rounded-xl shadow-sm bg-slate-900/50"><table className="min-w-full divide-y divide-slate-700/50 text-sm" {...props}/></div>,
        th: ({node, ...props}) => <th className="bg-slate-800/80 px-4 py-3 text-left font-bold text-slate-300 uppercase tracking-wider" {...props}/>,
        td: ({node, ...props}) => <td className="px-4 py-3 border-t border-slate-700/50 text-slate-400 font-medium" {...props}/>,
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
        code: ({node, inline, className, children, ...props}: any) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <div className="relative group my-6 rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 backdrop-blur border-b border-slate-800 text-xs font-mono text-slate-400">
                <span>{match ? match[1] : 'code'}</span>
                <button onClick={() => navigator.clipboard.writeText(String(children))} className="hover:text-indigo-400 transition-colors flex items-center gap-1"><Copy size={12}/> Copy</button>
              </div>
              <pre className="p-4 bg-slate-950/90 overflow-x-auto text-sm font-mono text-indigo-300">
                <code {...props}>{children}</code>
              </pre>
            </div>
          ) : (
            <code className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono text-[13px] border border-indigo-500/20" {...props}>{children}</code>
          );
        },
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 bg-indigo-500/10 py-3 px-5 rounded-r-2xl my-6 text-slate-300 italic shadow-inner font-medium" {...props}/>
      }}
    >
      {content}
    </ReactMarkdown>
  );
}, (prevProps, nextProps) => prevProps.content === nextProps.content);

export default function ChatPage() {
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();

  // 🟢 FIXED: Added simulation and suggestions objects to messages state
  const [messages, setMessages] = useState<{role: string, content: string, simulation?: any, suggestions?: Suggestion[]}[]>([]);
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  
  // 🟢 SYLLABUS VAULT STATES
  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // 🟢 LEARNING RESOURCES (Zero Cost Magnet Search)
  const [learningResources, setLearningResources] = useState<any[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<any | null>(null);

  // 🟢 CHAT HISTORY STATES
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'files'|'syllabus'|'menu'>('none');

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];
  const [uiTheme, setUiTheme] = useState<'dark'|'light'>('dark');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [displayedAIResponse, setDisplayedAIResponse] = useState('');
  const targetTextRef = useRef('');
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = () => {
    if (!chatAreaRef.current) return;
    const currentScrollY = chatAreaRef.current.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(2);

  useEffect(() => {
    fetchFilesAndSyllabuses();
    fetchChatHistory();

    const savedMessages = localStorage.getItem('Prepia_chat_messages');
    const savedSession = localStorage.getItem('Prepia_session_id');
    const savedFiles = localStorage.getItem('Prepia_selected_files');
    
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedSession) setSessionId(savedSession);
    else setSessionId(crypto.randomUUID());
    if (savedFiles) setSelectedFileIds(JSON.parse(savedFiles));

    const loadSettings = () => { 
      const savedLang = localStorage.getItem('Prepia_language'); if (savedLang) setLanguage(savedLang as LanguageType); 
      const savedTheme = localStorage.getItem('Prepia_theme'); if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
    };
    loadSettings();
    window.addEventListener('languageChanged', loadSettings);
    window.addEventListener('settingsChanged', loadSettings);
    return () => { window.removeEventListener('languageChanged', loadSettings); window.removeEventListener('settingsChanged', loadSettings); };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('Prepia_chat_messages', JSON.stringify(messages));
      localStorage.setItem('Prepia_session_id', sessionId);
      localStorage.setItem('Prepia_selected_files', JSON.stringify(selectedFileIds));
    }
  }, [messages, sessionId, selectedFileIds]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, displayedAIResponse, isLoading]);

  useEffect(() => {
    if (isLoading) {
      animationIntervalRef.current = setInterval(() => {
        if (displayedAIResponse.length < targetTextRef.current.length) {
          const nextChunk = targetTextRef.current.substring(0, displayedAIResponse.length + 4);
          setDisplayedAIResponse(nextChunk);
        }
      }, 15);
    } else {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    }
    return () => { if (animationIntervalRef.current) clearInterval(animationIntervalRef.current); };
  }, [isLoading, displayedAIResponse]);

  const fetchFilesAndSyllabuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: fData } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed').order('created_at', { ascending: false });
      if (fData) setFiles(fData);

      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/list` : `${apiUrlBase}/api/syllabus/list`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const sData = await res.json();
      if (sData.success) setSyllabuses(sData.syllabuses);

      // 🟢 PRE-FETCH LEARNING RESOURCES (For Zero API Cost matching)
      const { data: resourcesData } = await supabase.from('learning_resources').select('*').eq('is_active', true);
      if (resourcesData) setLearningResources(resourcesData);

    } catch(e: any) {
      if (e?.message?.includes('Failed to fetch') || e?.message?.includes('Network Error')) {
        toast.error("Network Error: Could not fetch study materials.");
      }
    }
  };

  const fetchChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const { data } = await supabase.from('chat_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setChatHistory(data);
    } catch(e: any) {
      if (e?.message?.includes('Failed to fetch') || e?.message?.includes('Network Error')) {
        toast.error("Network Error: Could not fetch chat history.");
      }
    }
  };

  const loadSession = async (sId: string) => {
    try {
      const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sId).order('created_at', { ascending: true });
      if (data) {
         setMessages(data.map(m => ({ role: m.role, content: m.content })));
         setSessionId(sId);
         setIsHistoryOpen(false);
      }
    } catch(e) {}
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('chat_sessions').delete().eq('id', id);
    setChatHistory(prev => prev.filter(s => s.id !== id));
    if (sessionId === id) handleNewChat();
  };

  const saveSessionEdit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editSessionTitle.trim()) {
      try {
        const { error } = await supabase.from('chat_sessions').update({ title: editSessionTitle }).eq('id', id);
        if (!error) await fetchChatHistory();
      } catch (err) {}
    }
    setEditingSessionId(null);
  };

  const handleNewChat = () => {
    setMessages([]); setDisplayedAIResponse(''); targetTextRef.current = '';
    setSessionId(crypto.randomUUID()); setSelectedFileIds([]);
    localStorage.removeItem('Prepia_chat_messages'); localStorage.removeItem('Prepia_session_id'); localStorage.removeItem('Prepia_selected_files');
  };

  const handleCopyText = (text: string, index: number) => { navigator.clipboard.writeText(text); setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000); };

  const fixMissingSpaces = (text: string) => {
    if (!text) return text;
    const spaceRatio = (text.match(/ /g) || []).length / text.length;
    if (spaceRatio < 0.05) { 
      return text.replace(/([.,!?:;])([a-zA-Z])/g, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/('s)([a-zA-Z])/gi, '$1 $2').replace(/([a-zA-Z])\(/g, '$1 (')
        .replace(/\)([a-zA-Z])/g, ') $1').replace(/([a-zA-Z])-([a-zA-Z])/g, '$1 - $2').replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2').replace(/([0-9])([a-zA-Z])/g, '$1 $2').replace(/([a-zA-Z])([0-9])/g, '$1 $2');
    }
    return text;
  };

  // 🟢 ZERO-COST MAGNET SEARCH (Matches keywords in frontend)
  const findMatchingSimulation = (text: string) => {
    if (!learningResources.length) return null;
    const lowerText = text.toLowerCase();
    let bestMatch = null;
    let maxHits = 0;

    learningResources.forEach(res => {
      const keys = res.keywords.split(',').map((k:string) => k.trim().toLowerCase()).filter(Boolean);
      let hits = 0;
      keys.forEach(k => { if (lowerText.includes(k)) hits++; });
      if (hits > maxHits) { maxHits = hits; bestMatch = res; }
    });

    return bestMatch;
  };

  // 🟢 TOGGLES
  const toggleFile = (id: string) => setSelectedFileIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const handleSyllabusSelect = (id: string) => {
    setSelectedSyllabusId(prev => prev === id ? '' : id);
    setSelectedChapterIds([]); setSelectedTopics([]); 
  };
  const toggleChapterSelection = (chapterId: string) => {
    setSelectedChapterIds(prev => prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]);
  };
  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 2) {
      setRequiredTokensForModal(2);
      setShowTokenModal(true);
      return;
    }

    const userMessage = input.trim();
    setInput(''); 
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setDisplayedAIResponse(''); targetTextRef.current = ''; setIsLoading(true);

    // Scroll chat area to full screen on mobile
    chatAreaRef.current?.scrollIntoView({ behavior: 'smooth' });

    // 🟢 Trigger Magnet Simulation Fetch
    const matchedSimulation = findMatchingSimulation(userMessage);
    setActiveSimulation(matchedSimulation);

    const activeCourse = syllabuses.find(s => s.id === selectedSyllabusId);
    const availableChaptersForRequest = activeCourse?.chapters || [];
    const syllabusCourseName = activeCourse ? activeCourse.course_name : '';
    const syllabusChapters = availableChaptersForRequest.filter((ch: any) => selectedChapterIds.includes(ch.id)).map((ch: any) => ch.title);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      apiUrl = apiUrl.replace(/\/+$/, ''); 
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/chat` : `${apiUrl}/api/chat`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          query: userMessage, fileIds: selectedFileIds, conversationId: sessionId, language,
          syllabusCourseName, syllabusChapters, syllabusTopics: selectedTopics 
        })
      });

      if (!response.ok) { 
        const errText = await response.text(); 
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errJson.required || 2);
            setShowTokenModal(true);
            setIsLoading(false);
            setMessages(prev => prev.slice(0, -1)); // Remove the user message optimistically added
            return;
          }
        } catch(e) {}
        throw new Error(`Server Error (${response.status}): ${errText}`); 
      }
      
      if (!response.body) throw new Error('No response body received.');

      const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8'); let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; 
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]' || !dataStr) continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.error) throw new Error(data.error);
                if (data.content) targetTextRef.current += data.content; 
              } catch (e) { throw e; }
          }
        }
      }

      const finalContent = fixMissingSpaces(targetTextRef.current);
      if (finalContent && finalContent.trim().length > 0) {
        const generatedSuggestions = SuggestionEngine.analyzeAndSuggest(finalContent, language);
        setMessages(prev => [...prev, { role: 'assistant', content: finalContent, simulation: matchedSimulation, suggestions: generatedSuggestions }]);
        fetchChatHistory(); 
        refreshTokens();
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "🚨 **Model Constraint Reached:** Try asking a more specific question!" }]);
      }
    } catch (error: any) {
      const partialContent = targetTextRef.current ? `${targetTextRef.current}\n\n` : '';
      const busyMessage = language === 'Bangla'
        ? 'আমাদের AI Study Engine এই মুহূর্তে একটু ব্যস্ত। কয়েক সেকেন্ড পরে একই প্রশ্নটি আবার চেষ্টা করুন।'
        : language === 'Hindi'
          ? 'हमारा AI Study Engine इस समय थोड़ा व्यस्त है। कृपया कुछ सेकंड बाद अपना प्रश्न फिर से पूछें।'
          : 'Our AI Study Engine is handling high demand right now. Please try the same question again in a few moments.';
      setMessages(prev => [...prev, { role: 'assistant', content: fixMissingSpaces(`${partialContent}✨ ${busyMessage}`) }]);
    } finally { 
      setIsLoading(false); 
      setDisplayedAIResponse(''); 
      targetTextRef.current = ''; 
      setActiveSimulation(null);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion, msgContent: string) => {
    // Premium Feature: Passing Context to the target page via URL Params
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || msgContent;
    const contextTopic = encodeURIComponent(lastUserMessage.substring(0, 100)); 
    const fileParams = selectedFileIds.map(id => `file=${id}`).join('&');
    const queryStr = [contextTopic ? `context=${contextTopic}` : '', fileParams].filter(Boolean).join('&');
    router.push(`${suggestion.path}?${queryStr}`);
  };

  const activeCourse = syllabuses.find(s => s.id === selectedSyllabusId);
  const availableChapters = activeCourse?.chapters || [];
  const availableTopics = availableChapters.filter((c:any) => selectedChapterIds.length === 0 || selectedChapterIds.includes(c.id)).flatMap((c:any) => c.topics || []);

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className={`flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] w-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden ${uiTheme === 'dark' ? 'bg-slate-950 lg:border-slate-800' : 'bg-white lg:bg-slate-50 lg:border-slate-200/60'} lg:border lg:rounded-3xl shadow-2xl mt-0 lg:mt-4 custom-scrollbar transition-colors duration-500 relative`}>
        
        {/* HISTORY SIDEBAR */}
        {isHistoryOpen && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsHistoryOpen(false)} />}
        <div className={`absolute top-0 right-0 h-full w-80 ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-l shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className={`p-5 border-b ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'} flex justify-between items-center`}>
             <h3 className={`font-black flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}><History size={18} className="text-indigo-500"/> {t.chatHistory}</h3>
             <button onClick={() => setIsHistoryOpen(false)} className="text-slate-500 hover:text-slate-400 transition"><X size={20}/></button>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
             {chatHistory.length === 0 ? <p className="text-sm text-slate-500 text-center mt-10">{t.noHistory}</p> : (
               chatHistory.map(h => (
                 <div key={h.id} onClick={() => loadSession(h.id)} className={`p-3 border rounded-xl cursor-pointer group transition ${sessionId === h.id ? (uiTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-indigo-50 border-indigo-200') : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-indigo-400/50' : 'bg-white border-slate-100 hover:border-indigo-200')}`}>
                   <div className="flex justify-between items-start">
                     {editingSessionId === h.id ? (
                       <input autoFocus type="text" value={editSessionTitle} onChange={(e) => setEditSessionTitle(e.target.value)} onClick={(e) => e.stopPropagation()} className={`w-full text-xs p-1 bg-transparent border-b outline-none ${uiTheme === 'dark' ? 'border-slate-500 text-white' : 'border-slate-300 text-slate-800'}`} />
                     ) : (
                       <p className={`text-sm font-bold line-clamp-1 flex-1 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{h.title || "Chat Session"}</p>
                     )}
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ml-2">
                       {editingSessionId === h.id ? (
                         <button onClick={(e) => saveSessionEdit(e, h.id)} className="text-emerald-500 hover:text-emerald-400 p-1"><Check size={14}/></button>
                       ) : (
                         <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(h.id); setEditSessionTitle(h.title || "Chat Session"); }} className="text-slate-500 hover:text-indigo-400 p-1"><Edit3 size={14}/></button>
                       )}
                       <button onClick={(e) => deleteSession(h.id, e)} className="text-slate-500 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                     </div>
                   </div>
                   <span className="text-[10px] font-bold text-slate-500 mt-1 block">{new Date(h.created_at).toLocaleDateString()}</span>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Sidebar (Desktop Only) */}
        <div className={`hidden lg:flex lg:w-[35%] ${uiTheme === 'dark' ? 'bg-slate-950 lg:border-slate-800/80' : 'bg-slate-50 lg:border-slate-200'} lg:border-r p-5 lg:p-8 flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar relative shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md transition-colors duration-500`}>
          <div className="flex gap-2 mb-6 mt-4 lg:mt-0">
            <button onClick={handleNewChat} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition font-black tracking-wide uppercase text-[13px] text-white">
              <PlusCircle size={18} /> {t.startNewChat}
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className={`px-4 py-3 rounded-xl shadow-sm transition ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'}`} title={t.chatHistory}>
              <History size={18} />
            </button>
          </div>

          <h3 className="text-[11px] font-black tracking-widest text-indigo-400 uppercase mb-3 flex items-center gap-1.5"><BookOpen size={14}/> {t.knowledgeBase}</h3>
          <div className="space-y-2 mb-6">
            {files.length === 0 ? (
              <div className={`text-center mt-4 p-4 border-2 border-dashed rounded-xl ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200'}`}><p className="text-sm text-slate-500 font-medium">{t.noMaterials}</p></div>
            ) : (
              files.map(file => (
                <div key={file.id} onClick={() => toggleFile(file.id)} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedFileIds.includes(file.id) ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-transparent hover:border-slate-200 shadow-sm')}`}>
                  <div className="mt-0.5">{selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-indigo-400" size={18} /> : <div className={`w-4 h-4 border-2 rounded ${uiTheme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />}</div>
                  <div className="overflow-hidden"><p className={`text-sm font-bold truncate transition ${selectedFileIds.includes(file.id) ? 'text-indigo-300' : (uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-700')}`}>{file.name || file.original_name || file.file_name || 'Untitled'}</p></div>
                </div>
              ))
            )}
          </div>

          {/* 🟢 Syllabus Vault */}
          {syllabuses.length > 0 && (
            <div className={`pt-4 border-t ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-[11px] font-black tracking-widest text-amber-500 uppercase mb-3 flex items-center gap-1.5"><ListTree size={14}/> {t.syllabusVault}</h3>
              
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Course (Max 1)</p>
              <div className="space-y-1.5">
                {syllabuses.map(syl => (
                  <div key={syl.id} onClick={() => handleSyllabusSelect(syl.id)} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-xs font-bold transition-all border ${selectedSyllabusId === syl.id ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}`}>
                    {selectedSyllabusId === syl.id ? <CheckCircle2 size={14} className="text-amber-500 shrink-0"/> : <Circle size={14} className="text-slate-500 shrink-0"/>}
                    <span className="truncate">{syl.course_name}</span>
                  </div>
                ))}
              </div>

              {selectedSyllabusId && availableChapters.length > 0 && (
                <div className={`mt-3 pl-2 border-l-2 ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'} space-y-1.5`}>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Chapters (Multi Select)</p>
                  {availableChapters.map((chap: any) => (
                    <div key={chap.id} onClick={() => toggleChapterSelection(chap.id)} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-[11px] font-bold transition-all border ${selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : (uiTheme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                      {(selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0) ? <CheckCircle2 size={12} className="text-amber-400 shrink-0"/> : <Circle size={12} className="text-slate-600 shrink-0"/>}
                      <span className="truncate">{chap.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedSyllabusId && availableTopics.length > 0 && (
                <div className={`mt-3 pl-4 border-l-2 ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Target size={10}/> Topics (Multi Select)</p>
                  <div className="flex flex-wrap gap-1">
                    {availableTopics.map((topic: string, idx: number) => (
                      <button key={idx} onClick={() => toggleTopicSelection(topic)} className={`text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded border transition-all ${selectedTopics.includes(topic) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div ref={chatAreaRef} onScroll={handleScroll} className={`w-full lg:w-[65%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative lg:overflow-y-auto custom-scrollbar transition-colors duration-500 ${uiTheme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 lg:bg-white text-slate-800'}`}>
          <div className={`h-[60px] lg:h-[72px] mx-3 mt-3 lg:mx-0 lg:mt-0 rounded-2xl lg:rounded-none lg:border-b flex items-center justify-between px-4 lg:px-8 z-20 sticky backdrop-blur-2xl shadow-lg lg:shadow-none transition-all duration-300 border ${isHeaderVisible ? 'top-3 lg:top-0 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} ${uiTheme === 'dark' ? 'border-slate-700/50 bg-slate-900/80 lg:border-slate-800 lg:bg-slate-950/70' : 'border-slate-200/50 bg-white/90 lg:border-slate-100 lg:bg-white/70'}`}>
            <div className="flex flex-col">
              <h2 className={`text-lg lg:text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${uiTheme === 'dark' ? 'from-slate-100 to-slate-400' : 'from-slate-800 to-slate-500'}`}>{t.studyAssistant}</h2>
              <p className="text-[9px] lg:text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 uppercase tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>{t.secureSession}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMobileDrawerOpen('menu')} className={`lg:hidden p-2 rounded-xl transition-colors shadow-sm backdrop-blur-md border ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white/50 border-slate-200 text-slate-600'}`}><BookOpen size={16}/></button>
              <button onClick={() => setIsHistoryOpen(true)} className={`lg:hidden p-2 rounded-xl transition-colors shadow-sm backdrop-blur-md border ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white/50 border-slate-200 text-slate-600'}`}><History size={16}/></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth custom-scrollbar pb-32">
            {messages.length === 0 && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto animate-in fade-in zoom-in duration-500 opacity-80">
                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]"><Bot size={40} /></div>
                <h3 className={`text-3xl font-black tracking-tight mb-3 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`}>{t.howCanIAssist}</h3>
                <p className="text-slate-500 text-lg leading-relaxed">{t.assistDesc}</p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 lg:gap-5 max-w-4xl mx-auto animate-in slide-in-from-bottom-2 fade-in duration-300 group relative ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' ? (
                       <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><Bot size={20} /></div>
                    ) : (
                       <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-600 border-slate-300'}`}><User size={20} /></div>
                    )}
                    
                    <div className={`p-4 lg:p-5 text-[15px] shadow-sm relative ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-3xl rounded-tr-sm' : (uiTheme === 'dark' ? 'bg-slate-900/80 border border-slate-800 text-slate-300 rounded-3xl rounded-tl-sm w-full overflow-hidden' : 'bg-white border border-slate-200 text-slate-800 rounded-3xl rounded-tl-sm w-full overflow-hidden')}`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                      ) : (
                        <div className={`prose max-w-none font-sans prose-p:leading-relaxed prose-headings:font-bold ${uiTheme === 'dark' ? 'prose-invert text-slate-300 prose-headings:text-white prose-a:text-indigo-400 prose-strong:text-slate-100' : 'prose-slate text-slate-800 prose-a:text-indigo-600 prose-strong:text-slate-900'}`}>
                          <MemoizedMarkdown content={msg.content} />
                        </div>
                      )}

                      {/* 🟢 SIMULATION RENDERER FOR ASSISTANT MESSAGES */}
                      {msg.role === 'assistant' && msg.simulation && (
                        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                          <div className="flex items-center gap-2 text-cyan-400 font-black uppercase tracking-widest text-xs mb-3">
                            <MonitorPlay size={16} /> Interactive Concept: {msg.simulation.title}
                          </div>
                          {/* 🟢 SPONSORSHIP BADGE (COMMENTED OUT FOR NOW)
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-3 w-fit">
                            Sponsored By <span className="text-white">EduCorp</span>
                          </div>
                          */}
                          <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video relative">
                            <iframe src={msg.simulation.embed_url} width="100%" height="100%" className="absolute inset-0 border-none" allowFullScreen />
                          </div>
                        </div>
                      )}

                      {/* 🟢 INTELLIGENT SUGGESTED ACTIONS (ANTI-LAYOUT CHIPS) */}
                      {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-5 flex flex-col gap-2 border-t border-slate-700/30 pt-4">
                          <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-black mb-1">Suggested Next Steps</p>
                          {msg.suggestions.map((suggestion, sIdx) => {
                             const IconMap: Record<string, any> = {
                               'quiz': BrainCircuit, 'podcast': Headphones, 'flashcards': Layers, 'molecule': Beaker,
                               'battle': Swords, 'purifier': FileText, 'map': Network, 'oracle': Radar, 'live-podcast': Mic, 'notes': FileText
                             };
                             const Icon = IconMap[suggestion.iconType] || Sparkles;
                             return (
                               <button 
                                 key={sIdx}
                                 onClick={() => handleSuggestionClick(suggestion, msg.content)}
                                 className="text-left w-full p-3 rounded-xl border shadow-sm flex items-center justify-between group/chip transition-all duration-300 hover:translate-x-1 active:scale-95 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500 hover:border-indigo-400"
                               >
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center group-hover/chip:text-white transition-colors">
                                      <Icon size={16} />
                                   </div>
                                   <span className="text-sm font-bold text-indigo-300 group-hover/chip:text-white transition-colors">{suggestion.text}</span>
                                 </div>
                                 <div className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded group-hover/chip:text-white group-hover/chip:bg-white/20 transition-colors">
                                   {suggestion.feature}
                                 </div>
                               </button>
                             );
                          })}
                        </div>
                      )}

                      {msg.role === 'assistant' && msg.content && (
                        <button onClick={() => handleCopyText(msg.content, i)} className={`absolute top-3 right-3 p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 duration-200 ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white border' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800'}`} title={t.copyAnswer}>
                          {copiedIndex === i ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 lg:gap-5 max-w-4xl mx-auto animate-in fade-in duration-200 relative group">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><Bot size={20} /></div>
                    <div className={`p-4 lg:p-5 rounded-3xl rounded-tl-sm w-full shadow-sm min-h-[60px] ${uiTheme === 'dark' ? 'bg-slate-900/80 border border-slate-800 text-slate-300' : 'bg-white border border-slate-200 text-slate-800'}`}>
                      {!displayedAIResponse ? (
                        <div className="flex items-center gap-2 text-slate-400 font-medium"><Loader2 size={16} className="animate-spin text-indigo-500" /> {t.thinking}</div>
                      ) : (
                        <>
                          <div className={`prose max-w-none font-sans prose-p:leading-relaxed prose-headings:font-bold ${uiTheme === 'dark' ? 'prose-invert text-slate-300' : 'prose-slate text-slate-800'}`}>
                            <MemoizedMarkdown content={displayedAIResponse} />
                          </div>
                          
                          {/* 🟢 SIMULATION RENDERER DURING STREAMING */}
                          {activeSimulation && (
                            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                              <div className="flex items-center gap-2 text-cyan-400 font-black uppercase tracking-widest text-xs mb-3">
                                <MonitorPlay size={16} /> Interactive Concept: {activeSimulation.title}
                              </div>
                              <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video relative">
                                <iframe src={activeSimulation.embed_url} width="100%" height="100%" className="absolute inset-0 border-none" allowFullScreen />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Chat Input Section */}
          <div className={`absolute bottom-0 left-0 w-full p-3 lg:p-6 lg:border-t lg:backdrop-blur-xl z-20 pointer-events-none transition-all duration-500 ${uiTheme === 'dark' ? 'lg:bg-slate-950/80 lg:border-slate-800' : 'lg:bg-white/90 lg:border-slate-100'} bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-950 via-slate-950/80 to-transparent' : 'from-slate-50 via-slate-50/80 to-transparent'} lg:bg-none`}>
            
            {/* Mobile Action Pills */}
            <div className="flex gap-2 overflow-x-auto lg:hidden mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('files')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedFileIds.length > 0 ? (uiTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                <FileText size={12}/> Files {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('syllabus')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedSyllabusId ? (uiTheme === 'dark' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                <ListTree size={12}/> Syllabus {selectedSyllabusId && <CheckCircle2 size={12} className="ml-1"/>}
              </button>
              <button onClick={handleNewChat} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'}`}>
                <PlusCircle size={12}/> New Chat
              </button>
            </div>

            <div className="max-w-4xl mx-auto relative group pointer-events-auto">
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-[2rem] blur-md opacity-50 group-focus-within:opacity-100 transition duration-500 ${uiTheme === 'dark' ? 'group-focus-within:opacity-100' : 'group-focus-within:opacity-70'}`}></div>
              <form onSubmit={handleSubmit} className={`relative flex items-end shadow-xl lg:shadow-sm rounded-[2rem] border focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all backdrop-blur-xl ${uiTheme === 'dark' ? 'bg-slate-900/90 border-slate-700/50 focus-within:border-indigo-500/50' : 'bg-white/90 border-slate-200 focus-within:border-indigo-400 focus-within:bg-white'}`}>
                <textarea
                  value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder={selectedFileIds.length > 0 || selectedSyllabusId ? t.placeholderActive : t.placeholderEmpty}
                  disabled={isLoading}
                  className={`w-full pl-6 pr-16 py-4 max-h-32 min-h-[60px] bg-transparent border-none focus:ring-0 resize-none outline-none disabled:opacity-50 font-medium ${uiTheme === 'dark' ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`} rows={1}
                />
                <button type="submit" disabled={!input.trim() || isLoading} className={`absolute right-2 bottom-2 p-3 rounded-full transition-all shadow-md disabled:shadow-none flex items-center justify-center active:scale-95 ${uiTheme === 'dark' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)]'}`}>
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[70vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'} ${uiTheme === 'dark' ? 'bg-slate-900 border-t border-slate-700' : 'bg-white border-t border-slate-200'}`}>
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-black tracking-tight flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              {isMobileDrawerOpen === 'files' ? <><FileText size={18} className="text-indigo-500"/> RAG Knowledge Base</> : <><ListTree size={18} className="text-amber-500"/> Syllabus Vault</>}
            </h3>
            <button onClick={() => setIsMobileDrawerOpen('none')} className={`p-1.5 rounded-full transition-colors ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><X size={16}/></button>
          </div>

          {isMobileDrawerOpen === 'files' && (
            <div className="space-y-3 pb-10">
              {files.length === 0 ? (
                <div className={`text-center mt-4 p-6 border-2 border-dashed rounded-3xl ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}><p className="text-sm text-slate-500 font-medium">{t.noMaterials}</p></div>
              ) : (
                files.map(file => (
                  <div key={file.id} onClick={() => toggleFile(file.id)} className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all active:scale-95 ${selectedFileIds.includes(file.id) ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-transparent shadow-sm')}`}>
                    <div className="mt-0.5">{selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-indigo-500" size={20} /> : <div className={`w-5 h-5 border-2 rounded-full ${uiTheme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />}</div>
                    <div className="overflow-hidden"><p className={`text-base font-bold truncate ${selectedFileIds.includes(file.id) ? 'text-indigo-400' : (uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700')}`}>{file.name || file.original_name || file.file_name || 'Untitled'}</p></div>
                  </div>
                ))
              )}
            </div>
          )}

          {isMobileDrawerOpen === 'syllabus' && (
            <div className="pb-10">
              {syllabuses.length === 0 ? (
                 <div className={`text-center mt-4 p-6 border-2 border-dashed rounded-3xl ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}><p className="text-sm text-slate-500 font-medium">No Syllabus Found</p></div>
              ) : (
                <>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Course (Max 1)</p>
                  <div className="space-y-2 mb-6">
                    {syllabuses.map(syl => (
                      <div key={syl.id} onClick={() => handleSyllabusSelect(syl.id)} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer text-sm font-bold transition-all border-2 active:scale-95 ${selectedSyllabusId === syl.id ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-700 shadow-sm')}`}>
                        {selectedSyllabusId === syl.id ? <CheckCircle2 size={18} className="text-amber-500 shrink-0"/> : <Circle size={18} className="text-slate-400 shrink-0"/>}
                        <span className="truncate">{syl.course_name}</span>
                      </div>
                    ))}
                  </div>

                  {selectedSyllabusId && availableChapters.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-t border-slate-200 dark:border-slate-800 pt-4">Chapters (Multi Select)</p>
                      {availableChapters.map((chap: any) => (
                        <div key={chap.id} onClick={() => toggleChapterSelection(chap.id)} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer text-sm font-bold transition-all border-2 active:scale-95 ${selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-100 text-slate-600')}`}>
                          {(selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0) ? <CheckCircle2 size={16} className="text-amber-400 shrink-0"/> : <Circle size={16} className="text-slate-500 shrink-0"/>}
                          <span className="truncate">{chap.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSyllabusId && availableTopics.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-t border-slate-200 dark:border-slate-800 pt-4"><Target size={14}/> Topics (Multi Select)</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTopics.map((topic: string, idx: number) => (
                          <button key={idx} onClick={() => toggleTopicSelection(topic)} className={`text-[11px] font-black tracking-wide px-3 py-2 rounded-xl border-2 transition-all active:scale-95 ${selectedTopics.includes(topic) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Mobile Bottom Sheet Done Button */}
          <div className={`sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-900 via-slate-900 to-transparent' : 'from-white via-white to-transparent'}`}>
            <button onClick={() => setIsMobileDrawerOpen('none')} className={`w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 ${uiTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'}`}>
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
