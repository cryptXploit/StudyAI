'use client';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Sparkles, Loader2, FileText, CheckCircle2, Copy, Check, History, Trash2, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
// @ts-ignore: CSS module import for KaTeX styling
import 'katex/dist/katex.min.css';
import { useTokens } from '@/hooks/useTokens';
import { getPublicErrorMessage, showPublicError } from '@/lib/errors/publicError';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import UploadCTA from '@/components/dashboard/UploadCTA';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    storyMode: "StoryMode",
    learnNarratives: "Learn through narratives",
    whatToLearn: "What do you want to learn?",
    placeholder: "e.g., How does an Antenna work? or Mitochondrial DNA...",
    chooseVibe: "Choose the Vibe",
    sourceNotes: "Source Notes (Optional)",
    generating: "Weaving the story...",
    generateStory: "Generate Magic Story",
    yourLibrary: "Your Story Library",
    noStories: "No stories saved yet.",
    yourStoryAwaits: "Your Story Awaits",
    awaitsDesc: "Select a topic and style, or choose from your library.",
    copyStory: "Save Story",
    copied: "Copied!",
    styles: {
      emotional: { label: '😢 Emotional', desc: 'Heart-touching narrative' },
      scifi: { label: '🚀 Sci-Fi', desc: 'Futuristic & Technological' },
      mystery: { label: '🕵️ Mystery', desc: 'Suspenseful investigation' },
      comedy: { label: '😂 Comedy', desc: 'Funny & ridiculous situations' },
      fantasy: { label: '🧙‍♂️ Fantasy', desc: 'Magic and mythology' },
      mathematical: { label: '🔢 Mathematical', desc: 'Logic and structured reality' }
    }
  },
  Bangla: {
    storyMode: "স্টোরি মোড",
    learnNarratives: "গল্পের মাধ্যমে শিখুন",
    whatToLearn: "আপনি কী শিখতে চান?",
    placeholder: "যেমন: অ্যান্টেনা কীভাবে কাজ করে? অথবা মাইটোকন্ড্রিয়া...",
    chooseVibe: "গল্পের স্টাইল নির্বাচন করুন",
    sourceNotes: "সোর্স নোট (ঐচ্ছিক)",
    generating: "গল্প বোনা হচ্ছে...",
    generateStory: "ম্যাজিক স্টোরি তৈরি করুন",
    yourLibrary: "আপনার গল্পের লাইব্রেরি",
    noStories: "এখনও কোনো গল্প সেভ করা হয়নি।",
    yourStoryAwaits: "আপনার গল্প অপেক্ষায় আছে",
    awaitsDesc: "একটি টপিক ও স্টাইল নির্বাচন করুন, অথবা লাইব্রেরি থেকে বেছে নিন।",
    copyStory: "গল্প কপি করুন",
    copied: "কপি হয়েছে!",
    styles: {
      emotional: { label: '😢 আবেগময়', desc: 'হৃদয়স্পর্শী কাহিনী' },
      scifi: { label: '🚀 সাই-ফাই', desc: 'ভবিষ্যৎ ও প্রযুক্তিগত' },
      mystery: { label: '🕵️ রহস্য', desc: 'উত্তেজনাপূর্ণ তদন্ত' },
      comedy: { label: '😂 কমেডি', desc: 'মজার ও হাস্যকর পরিস্থিতি' },
      fantasy: { label: '🧙‍♂️ ফ্যান্টাসি', desc: 'জাদু ও পুরাণ' },
      mathematical: { label: '🔢 গাণিতিক', desc: 'যুক্তি ও কাঠামোগত বাস্তব' }
    }
  },
  Hindi: {
    storyMode: "स्टोरी मोड",
    learnNarratives: "कहानियों के माध्यम से सीखें",
    whatToLearn: "आप क्या सीखना चाहते हैं?",
    placeholder: "उदा. एंटीना कैसे काम करता है? या माइटोकॉन्ड्रियल डीएनए...",
    chooseVibe: "कहानी की शैली चुनें",
    sourceNotes: "स्रोत नोट्स (वैकल्पिक)",
    generating: "कहानी बुनी जा रही है...",
    generateStory: "मैजिक कहानी बनाएं",
    yourLibrary: "आपकी कहानी लाइब्रेरी",
    noStories: "अभी तक कोई कहानी सहेजी नहीं गई है।",
    yourStoryAwaits: "आपकी कहानी की प्रतीक्षा है",
    awaitsDesc: "एक विषय और शैली चुनें, या अपनी लाइब्रेरी से चुनें।",
    copyStory: "कहानी कॉपी करें",
    copied: "कॉपी हो गया!",
    styles: {
      emotional: { label: '😢 भावुक', desc: 'दिल को छू लेने वाली कथा' },
      scifi: { label: '🚀 विज्ञान-कथा', desc: 'भविष्यवादी और तकनीकी' },
      mystery: { label: '🕵️ रहस्य', desc: 'रहस्यपूर्ण जांच' },
      comedy: { label: '😂 कॉमेडी', desc: 'मजेदार और हास्यास्पद स्थितियां' },
      fantasy: { label: '🧙‍♂️ फंतासी', desc: 'जादू और पौराणिक कथाएं' },
      mathematical: { label: '🔢 गणितीय', desc: 'तर्क और संरचित वास्तविकता' }
    }
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const STORY_STYLE_KEYS = ['emotional', 'scifi', 'mystery', 'comedy', 'fantasy', 'mathematical'] as const;

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
}, (prev, next) => prev.content === next.content);

export default function StoryGeneratorPage() {
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();
  const [topic, setTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<typeof STORY_STYLE_KEYS[number]>('scifi');
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  const [story, setStory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [storyHistory, setStoryHistory] = useState<any[]>([]);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editStoryTopic, setEditStoryTopic] = useState('');

  // 🟢 Language & Theme State
  const [language, setLanguage] = useState<LanguageType>('English');
  const [uiTheme, setUiTheme] = useState<'dark'|'light'>('dark');
  const t = translations[language] || translations['English'];
  
  const storyEndRef = useRef<HTMLDivElement>(null);
  const targetTextRef = useRef('');
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'vibe'|'files'|'library'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const storyAreaRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!storyAreaRef.current) return;
    const currentScrollY = storyAreaRef.current.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  useEffect(() => { 
    fetchFiles(); 
    fetchStoryHistory(); 

    // 🟢 Load Language, Theme & Sync
    const loadSettings = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
      const savedTheme = localStorage.getItem('Prepia_theme');
      if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
    };

    loadSettings();
    window.addEventListener('languageChanged', loadSettings);
    window.addEventListener('settingsChanged', loadSettings);
    return () => { window.removeEventListener('languageChanged', loadSettings); window.removeEventListener('settingsChanged', loadSettings); };
  }, []);

  useEffect(() => {
    if (story) storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [story]);

  // Smooth Ticker Engine
  useEffect(() => {
    if (isLoading) {
      animationIntervalRef.current = setInterval(() => {
        if (story.length < targetTextRef.current.length) {
          setStory(targetTextRef.current.substring(0, story.length + 5));
        }
      }, 15);
    } else {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    }
    return () => { if (animationIntervalRef.current) clearInterval(animationIntervalRef.current); };
  }, [isLoading, story]);

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed').order('created_at', { ascending: false });
    if (data) setFiles(data);
  };

  const fetchStoryHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_stories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setStoryHistory(data);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(story);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fixSpaces = (text: string) => {
    if (!text) return text;
    const spaceRatio = (text.match(/ /g) || []).length / text.length;
    if (spaceRatio < 0.05) {
      return text.replace(/([.,!?:;])([a-zA-Z])/g, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2');
    }
    return text;
  };

  const deleteStory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('user_stories').delete().eq('id', id);
    setStoryHistory(prev => prev.filter(s => s.id !== id));
  };

  const saveStoryEdit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editStoryTopic.trim()) {
      try {
        const { error } = await supabase.from('user_stories').update({ topic: editStoryTopic }).eq('id', id);
        if (!error) await fetchStoryHistory();
      } catch (err) {}
    }
    setEditingStoryId(null);
  };

  const generateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setStory('');
    targetTextRef.current = '';
    setIsLoading(true);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 Minutes Timeout Limit

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let apiUrlBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      apiUrlBase = apiUrlBase.replace(/\/+$/, ''); 
      const fetchUrl = apiUrlBase.endsWith('/api') 
        ? `${apiUrlBase}/story/generate` 
        : `${apiUrlBase}/api/story/generate`;
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        // Passed 'language' into the payload
        body: JSON.stringify({ topic, style: selectedStyle, fileIds: selectedFileIds, language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
         const errText = await response.text();
         try {
           const errJson = JSON.parse(errText);
           if (errJson.error === 'INSUFFICIENT_TOKENS') {
             setRequiredTokensForModal(errJson.required || 15);
             setShowTokenModal(true);
             setIsLoading(false);
             return;
           }
         } catch(e) {}
         throw new Error(`Server Error (${response.status}): ${errText}`);
      }
      if (!response.body) throw new Error('No response from server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]' || !dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);
              if (data.content) targetTextRef.current += data.content;
            } catch (e) {}
          }
        }
      }
      setStory(fixSpaces(targetTextRef.current));
      refreshTokens();
      setTimeout(() => fetchStoryHistory(), 1500);

    } catch (error: any) {
      const message = getPublicErrorMessage();
      setStory(message);
      showPublicError();
    } finally {
      setIsLoading(false);
      targetTextRef.current = '';
    }
  };

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className={`flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] w-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden ${uiTheme === 'dark' ? 'bg-slate-950 lg:border-slate-800' : 'bg-white lg:bg-slate-50 lg:border-slate-200/60'} lg:border lg:rounded-3xl shadow-2xl mt-0 lg:mt-4 custom-scrollbar transition-colors duration-500`}>
        
        {/* Left Panel: Controls & History (Desktop Only) */}
        <div className={`hidden lg:flex lg:w-[35%] ${uiTheme === 'dark' ? 'bg-slate-950 lg:border-slate-800/80' : 'bg-white lg:border-slate-200'} lg:border-r p-5 lg:p-6 flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar relative shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md transition-colors duration-500`}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.storyMode}</h2>
              <p className={`text-xs font-bold ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.learnNarratives}</p>
            </div>
          </div>

          <form onSubmit={generateStory} className="space-y-6">
            {/* Topic Input */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.whatToLearn}</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.placeholder}
                className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-amber-500/50 outline-none resize-none font-medium transition-all ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'}`}
                rows={3}
              />
            </div>

            {/* Style Selection */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.chooseVibe}</label>
              <div className="grid grid-cols-2 gap-3">
                {STORY_STYLE_KEYS.map(styleId => (
                  <div 
                    key={styleId}
                    onClick={() => setSelectedStyle(styleId)}
                    className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedStyle === styleId ? 'bg-amber-500/20 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : (uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-300')}`}
                  >
                    <p className={`text-sm font-bold ${selectedStyle === styleId ? 'text-amber-500' : (uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-800')}`}>{t.styles[styleId].label}</p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.styles[styleId].desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* File Source (Optional) */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.sourceNotes}</label>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                {files.map(file => (
                  <div key={file.id} onClick={() => {
                      if (selectedFileIds.includes(file.id)) setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                      else setSelectedFileIds([...selectedFileIds, file.id]);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${selectedFileIds.includes(file.id) ? 'bg-amber-500/20 border-amber-500/50' : (uiTheme === 'dark' ? 'border-transparent hover:bg-slate-900' : 'border-transparent hover:bg-slate-100')}`}
                  >
                    <div className="flex-shrink-0">
                      {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-amber-500" size={16} /> : <FileText className="text-slate-500" size={16} />}
                    </div>
                    <p className={`text-xs font-semibold truncate ${selectedFileIds.includes(file.id) ? 'text-amber-500' : (uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-700')}`}>{file.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isLoading || !topic.trim()} className={`w-full py-4 font-black tracking-wide uppercase text-[13px] rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 disabled:bg-slate-800 disabled:text-slate-500' : 'bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-300'}`}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.generating : t.generateStory}
            </button>
          </form>

          {/* Story Library (History) */}
          <div className={`mt-8 pt-8 border-t ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-sm font-black mb-3 flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <History size={16} className="text-amber-500" /> {t.yourLibrary}
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1 pb-4">
              {storyHistory.length === 0 ? (
                <p className={`text-xs font-medium text-center py-4 rounded-xl border border-dashed ${uiTheme === 'dark' ? 'bg-slate-900/50 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  {t.noStories}
                </p>
              ) : (
                storyHistory.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setStory(fixSpaces(item.content));
                      setTopic(item.topic);
                      setSelectedStyle(item.style);
                    }}
                    className={`group p-3 border rounded-xl cursor-pointer transition-all shadow-sm ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10' : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      {editingStoryId === item.id ? (
                        <input autoFocus type="text" value={editStoryTopic} onChange={(e) => setEditStoryTopic(e.target.value)} onClick={(e) => e.stopPropagation()} className={`w-full text-xs p-1 bg-transparent border-b outline-none ${uiTheme === 'dark' ? 'border-slate-500 text-white' : 'border-slate-300 text-slate-800'}`} />
                      ) : (
                        <p className={`text-sm font-bold truncate flex-1 ${uiTheme === 'dark' ? 'text-slate-300 group-hover:text-amber-400' : 'text-slate-700 group-hover:text-amber-700'}`}>{item.topic}</p>
                      )}
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ml-2">
                        {editingStoryId === item.id ? (
                          <button onClick={(e) => saveStoryEdit(e, item.id)} className="text-emerald-500 hover:text-emerald-400 p-1"><Check size={14}/></button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setEditingStoryId(item.id); setEditStoryTopic(item.topic); }} className="text-slate-500 hover:text-amber-500 p-1"><Edit3 size={14}/></button>
                        )}
                        <button onClick={(e) => deleteStory(item.id, e)} className="text-slate-500 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                      {t.styles[item.style as typeof STORY_STYLE_KEYS[number]]?.label.split(' ')[1] || item.style} • {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Story Output */}
        <div ref={storyAreaRef} onScroll={handleScroll} className={`w-full lg:w-[65%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative lg:overflow-y-auto custom-scrollbar transition-colors duration-500 ${uiTheme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 lg:bg-white text-slate-800'}`}>
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} ${uiTheme === 'dark' ? 'border-slate-700/50 bg-slate-900/80' : 'border-slate-200/50 bg-white/90'}`}>
            <div className="flex flex-col">
              <h2 className={`text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${uiTheme === 'dark' ? 'from-amber-100 to-amber-500' : 'from-amber-600 to-amber-400'}`}>{t.storyMode}</h2>
              <p className="text-[9px] font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-widest"><Sparkles size={10} className="text-amber-500"/> {t.learnNarratives}</p>
            </div>
          </div>

          <div className="p-5 lg:p-10 flex-1 relative pb-32 lg:pb-10">
            {!story && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-4 min-h-[50vh]">
                <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                   <BookOpen size={48} className="text-amber-500" />
                </div>
                <h3 className={`text-2xl lg:text-3xl font-black tracking-tight ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>{t.yourStoryAwaits}</h3>
                <p className="text-slate-500 mt-3 max-w-sm font-medium">{t.awaitsDesc}</p>
              </div>
          ) : (
            <div className={`max-w-2xl mx-auto w-full relative animate-in fade-in slide-in-from-bottom-4 duration-700 ${uiTheme === 'dark' ? 'dark' : ''}`}>
              {/* Copy Button */}
              {story && !isLoading && (
                <button onClick={handleCopy} className={`absolute -top-4 -right-4 p-2 border rounded-lg shadow-sm transition-all flex items-center gap-2 z-10 ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  <span className="text-xs font-bold">{copied ? t.copied : t.copyStory}</span>
                </button>
              )}
              
              <div className={`prose prose-lg max-w-none font-sans prose-headings:font-black prose-p:leading-relaxed first-letter:text-5xl first-letter:font-black first-letter:float-left first-letter:mr-2 ${uiTheme === 'dark' ? 'prose-invert text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-200 first-letter:text-amber-400' : 'prose-slate text-slate-700 prose-headings:text-slate-800 prose-strong:text-slate-900 first-letter:text-amber-500'}`}>
                <MemoizedMarkdown content={story} />
              </div>
              <div ref={storyEndRef} className="h-20" />
            </div>
          )}
          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-950 via-slate-950/80 to-transparent' : 'from-slate-50 via-slate-50/80 to-transparent'} ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            
            {/* Mobile Action Pills */}
            <div className="flex gap-2 overflow-x-auto mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('vibe')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedStyle ? (uiTheme === 'dark' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                🎭 {t.styles[selectedStyle]?.label.split(' ')[1] || 'Vibe'}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('files')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedFileIds.length > 0 ? (uiTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                <FileText size={12}/> Files {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('library')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'}`}>
                <History size={12}/> Library
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-[2rem] blur-md opacity-50 group-focus-within:opacity-100 transition duration-500 ${uiTheme === 'dark' ? 'group-focus-within:opacity-100' : 'group-focus-within:opacity-70'}`}></div>
              <form onSubmit={generateStory} className={`relative flex items-end shadow-xl rounded-[2rem] border focus-within:ring-2 focus-within:ring-amber-500/50 transition-all backdrop-blur-xl ${uiTheme === 'dark' ? 'bg-slate-900/90 border-slate-700/50 focus-within:border-amber-500/50' : 'bg-white/90 border-slate-200 focus-within:border-amber-400 focus-within:bg-white'}`}>
                <textarea
                  value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateStory(e); } }}
                  placeholder={t.placeholder}
                  disabled={isLoading}
                  className={`w-full pl-5 pr-14 py-3.5 max-h-24 min-h-[50px] bg-transparent border-none focus:ring-0 resize-none outline-none disabled:opacity-50 text-sm font-medium ${uiTheme === 'dark' ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`} rows={1}
                />
                <button type="submit" disabled={!topic.trim() || isLoading} className={`absolute right-1.5 bottom-1.5 p-2.5 rounded-full transition-all shadow-md disabled:shadow-none flex items-center justify-center active:scale-95 ${uiTheme === 'dark' ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white shadow-[0_4px_15px_rgba(245,158,11,0.3)]'}`}>
                  {isLoading ? <Loader2 size={16} className="animate-spin text-white" /> : <Sparkles size={16} className="text-white" />}
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
              {isMobileDrawerOpen === 'vibe' && <>🎭 Choose the Vibe</>}
              {isMobileDrawerOpen === 'files' && <><FileText size={18} className="text-amber-500"/> RAG Knowledge Base</>}
              {isMobileDrawerOpen === 'library' && <><History size={18} className="text-amber-500"/> Your Library</>}
            </h3>
          </div>

          {/* VIBE DRAWER */}
          {isMobileDrawerOpen === 'vibe' && (
            <div className="grid grid-cols-2 gap-3 pb-10">
              {STORY_STYLE_KEYS.map(styleId => (
                <div 
                  key={styleId}
                  onClick={() => setSelectedStyle(styleId)}
                  className={`p-3 rounded-xl cursor-pointer border-2 transition-all active:scale-95 flex flex-col items-center text-center ${selectedStyle === styleId ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : (uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200')}`}
                >
                  <p className={`text-sm font-bold ${selectedStyle === styleId ? 'text-amber-500' : (uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-800')}`}>{t.styles[styleId].label}</p>
                </div>
              ))}
            </div>
          )}

          {/* FILES DRAWER */}
          {isMobileDrawerOpen === 'files' && (
            <div className="space-y-2 pb-10">
              {files.length === 0 ? (
                <UploadCTA type="source" title="No Sources Found" description="Upload PDFs or Documents in your workspace to enable AI to chat with them." />
              ) : (
                files.map(file => (
                  <div key={file.id} onClick={() => {
                      if (selectedFileIds.includes(file.id)) setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                      else setSelectedFileIds([...selectedFileIds, file.id]);
                    }}
                    className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all active:scale-95 ${selectedFileIds.includes(file.id) ? 'bg-amber-500/10 border-amber-500/50 shadow-sm' : (uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-transparent shadow-sm')}`}
                  >
                    <div className="mt-0.5">{selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-amber-500" size={20} /> : <div className={`w-5 h-5 border-2 rounded-full ${uiTheme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />}</div>
                    <div className="overflow-hidden"><p className={`text-sm font-bold truncate ${selectedFileIds.includes(file.id) ? 'text-amber-500' : (uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700')}`}>{file.name}</p></div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LIBRARY DRAWER */}
          {isMobileDrawerOpen === 'library' && (
            <div className="space-y-3 pb-10">
              {storyHistory.length === 0 ? (
                <div className={`text-center mt-4 p-6 border-2 border-dashed rounded-3xl ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}><p className="text-sm text-slate-500 font-medium">No Stories Saved</p></div>
              ) : (
                storyHistory.map((item) => (
                  <div key={item.id} onClick={() => {
                      setStory(fixSpaces(item.content));
                      setTopic(item.topic);
                      setSelectedStyle(item.style);
                      setIsMobileDrawerOpen('none');
                    }}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-sm ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    <p className={`text-sm font-black truncate line-clamp-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{item.topic}</p>
                    <p className="text-[10px] font-bold text-amber-500 uppercase mt-2">
                      {t.styles[item.style as typeof STORY_STYLE_KEYS[number]]?.label.split(' ')[1] || item.style} • {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sticky Done Button */}
          <div className={`sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-900 via-slate-900 to-transparent' : 'from-white via-white to-transparent'}`}>
            <button onClick={() => setIsMobileDrawerOpen('none')} className={`w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-amber-500 text-slate-900`}>
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>

    </SecureLayout>
  );
}
