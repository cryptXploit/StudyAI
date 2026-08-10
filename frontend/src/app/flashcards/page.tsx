'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Layers, Loader2, CheckCircle2, History, X, RefreshCcw, Smile, Meh, Frown, Sparkles, Info, Puzzle, BookOpen, Trophy, Trash2, Pencil, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import UploadCTA from '@/components/dashboard/UploadCTA';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    brainDeck: "Brain Deck",
    spacedRepetition: "Spaced Repetition Flashcards",
    contextFiles: "Context Files",
    savedDecks: "Saved Decks",
    noDecks: "No decks found.",
    cards: "Cards",
    placeholder: "Enter a topic to generate a Flashcard Deck (e.g. OOP Concepts)",
    generating: "Generating...",
    buildDeck: "Build Deck",
    masterAnyTopic: "Master Any Topic",
    useActiveRecall: "Use Active Recall and Spaced Repetition to memorize facts 10x faster.",
    extracting: "Extracting Core Entities...",
    activeRecallMode: "Active Recall Mode",
    tapToFlip: "Tap to flip",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    definition: "Definition",
    deckCompleted: "Deck Completed! Great job! 🎉",
    classicFlip: "Classic Flip",
    matchGame: "Match Game",
    dragAnswerHere: "Drag correct answer here",
    gameComplete: "Awesome! You matched all correctly! 🎉",
    playAgain: "Play Again",
    backToChat: "Back to AI Chat",
    filesTab: "Files",
    library: "Library",
    knowledgeBase: "Knowledge Base",
    noIndexedNotes: "No Indexed Notes Found",
    incorrect: "Incorrect",
    matched: "Matched"
  },
  Bangla: {
    brainDeck: "ব্রেইন ডেক",
    spacedRepetition: "স্পেসড রিপিটেশন ফ্ল্যাশকার্ড",
    contextFiles: "কনটেক্সট ফাইল",
    savedDecks: "সেভ করা ডেক",
    noDecks: "কোনো ডেক পাওয়া যায়নি।",
    cards: "কার্ডস",
    placeholder: "একটি টপিক লিখুন (যেমন: OOP Concepts)",
    generating: "জেনারেট হচ্ছে...",
    buildDeck: "ডেক তৈরি করুন",
    masterAnyTopic: "যেকোনো টপিক মাস্টার করুন",
    useActiveRecall: "অ্যাকটিভ রিকল ব্যবহার করে ১০ গুণ দ্রুত মুখস্থ করুন।",
    extracting: "কোর এন্টিটি এক্সট্র্যাক্ট হচ্ছে...",
    activeRecallMode: "অ্যাকটিভ রিকল মোড",
    tapToFlip: "উল্টাতে ট্যাপ করুন",
    hard: "কঠিন",
    good: "ভালো",
    easy: "সহজ",
    definition: "সংজ্ঞা",
    deckCompleted: "ডেক সম্পন্ন হয়েছে! দারুণ কাজ! 🎉",
    classicFlip: "ক্লাসিক ফ্লিপ",
    matchGame: "ম্যাচিং গেম",
    dragAnswerHere: "সঠিক উত্তরটি টেনে এখানে বসান",
    gameComplete: "অসাধারণ! আপনি সব কটি সঠিকভাবে মিলিয়েছেন! 🎉",
    playAgain: "আবার খেলুন",
    backToChat: "এআই চ্যাটে ফিরে যান",
    filesTab: "ফাইল",
    library: "লাইব্রেরি",
    knowledgeBase: "নলেজ বেস",
    noIndexedNotes: "কোনো ইনডেক্স করা নোট পাওয়া যায়নি",
    incorrect: "ভুল",
    matched: "মিলেছে"
  },
  Hindi: {
    brainDeck: "ब्रेन डेक",
    spacedRepetition: "स्पेस्ड रिपीटिशन फ्लैशकार्ड",
    contextFiles: "संदर्भ फ़ाइलें",
    savedDecks: "सहेजे गए डेक",
    noDecks: "कोई डेक नहीं मिला।",
    cards: "कार्ड",
    placeholder: "एक विषय दर्ज करें (उदा. OOP Concepts)",
    generating: "उत्पन्न हो रहा है...",
    buildDeck: "डेक बनाएं",
    masterAnyTopic: "किसी भी विषय में महारत हासिल करें",
    useActiveRecall: "10 गुना तेजी से याद करने के लिए एक्टिव रिकॉल का उपयोग करें।",
    extracting: "मुख्य संस्थाएं निकाली जा रही हैं...",
    activeRecallMode: "एक्टिव रिकॉल मोड",
    tapToFlip: "पलटने के लिए टैप करें",
    hard: "कठिन",
    good: "अच्छा",
    easy: "आसान",
    definition: "परिभाषा",
    deckCompleted: "डेक पूरा हुआ! बहुत बढ़िया! 🎉",
    classicFlip: "क्लासिक फ्लिप",
    matchGame: "मैच गेम",
    dragAnswerHere: "सही उत्तर को खींचकर यहां छोड़ें",
    gameComplete: "बहुत बढ़िया! आपने सभी का सही मिलान किया! 🎉",
    playAgain: "फिर से खेलें",
    backToChat: "एआई चैट पर वापस जाएं",
    filesTab: "फ़ाइलें",
    library: "पुस्तकालय",
    knowledgeBase: "ज्ञानकोष",
    noIndexedNotes: "कोई अनुक्रमित नोट्स नहीं मिले",
    incorrect: "गलत",
    matched: "मिलान किया गया"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

interface Flashcard { q: string; a: string; }

function FlashcardsPageContent() {
  const supabase = createClient();
  const router = useRouter();

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [topic, setTopic] = useState('');

  const searchParams = useSearchParams();
  const contextParam = searchParams.get('context');
  const fileParamsString = searchParams.getAll('file').join(',');

  useEffect(() => {
    if (contextParam) setTopic(contextParam);
    if (fileParamsString) setSelectedFileIds(fileParamsString.split(','));
  }, [contextParam, fileParamsString]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(5);

  const [isLoading, setIsLoading] = useState(false);
  const [rawStream, setRawStream] = useState('');

  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [glossary, setGlossary] = useState<Record<string, string>>({});

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeDef, setActiveDef] = useState<string | null>(null);

  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile Context Files Toggle

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'files'|'history'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const currentScrollY = scrollRef.current.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // Language State
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  // Match Game States
  const [viewMode, setViewMode] = useState<'flip' | 'match'>('flip');
  const [shuffledAnswers, setShuffledAnswers] = useState<{a: string, originalIndex: number}[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [wrongMatch, setWrongMatch] = useState<number | null>(null);

  useEffect(() => {
    fetchFiles();
    fetchHistory();

    const loadLanguage = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };

    loadLanguage();
    window.addEventListener('languageChanged', loadLanguage);
    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  // Shuffle answers when deck is loaded or game restarted
  useEffect(() => {
    if (deck.length > 0) {
      initGame();
    }
  }, [deck]);

  const initGame = () => {
    const shuffled = deck.map((card, i) => ({ a: card.a, originalIndex: i }))
                         .sort(() => Math.random() - 0.5);
    setShuffledAnswers(shuffled);
    setMatchedPairs([]);
    setWrongMatch(null);
  };

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed');
    if (data) setFiles(data);
  };

  // 🟢 AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchHistory = async () => {
    const cachedHistory = sessionStorage.getItem('Prepia_flashcards_history');
    if (cachedHistory) {
      setHistoryList(JSON.parse(cachedHistory));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('flashcard_decks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

    if (data) {
      setHistoryList(data);
      sessionStorage.setItem('Prepia_flashcards_history', JSON.stringify(data));
    }
  };

  const toggleFile = (id: string) => setSelectedFileIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const generateDeck = async () => {
    if (selectedFileIds.length === 0 && !topic.trim()) return alert("Select a file or type a topic!");

    if (tier !== 'PRO' && tokens < 5) {
      setRequiredTokensForModal(5);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setDeck([]);
    setGlossary({});
    setRawStream('');
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setViewMode('flip');

    const currentTopic = topic;
    const currentFiles = [...selectedFileIds];

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/flashcards` : `${apiUrl}/api/flashcards`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic: currentTopic, fileIds: currentFiles, language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullJSON = '';

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
              if (data.error) {
                if (data.error === 'INSUFFICIENT_TOKENS' || data.error === 'OUT_OF_TOKENS') {
                  setRequiredTokensForModal(data.required || data.requiredTokens || 5);
                  setShowTokenModal(true);
                  setIsLoading(false);
                  return;
                }
                throw new Error(data.error);
              }
              if (data.content) {
                fullJSON += data.content;
                setRawStream(fullJSON);
              }
            } catch (e) {}
          }
        }
      }

      let parsedData;
      try {
        const cleanJSON = fullJSON.replace(/```json/gi, '').replace(/```/g, '').replace(/,\s*([\]}])/g, '$1').trim();
        parsedData = JSON.parse(cleanJSON);
      } catch (err: any) {
        // Fallback robust parser for malformed JSON from AI
        let extractedCards: any[] = [];
        const blocks: string[] = fullJSON.match(/\{[\s\S]*?\}/g) ?? [];
        blocks.forEach((block: string) => {
           let q = "", a = "";
           const qMatch = block.match(/(?:"|')?q(?:"|')?\s*:\s*(["'])((?:(?=(\\?))\3[\s\S])*?)\1/i);
           if (qMatch) q = qMatch[2];
           const aMatch = block.match(/(?:"|')?a(?:"|')?\s*:\s*(["'])((?:(?=(\\?))\3[\s\S])*?)\1/i);
           if (aMatch) a = aMatch[2];
           if (q && a) extractedCards.push({ q, a });
        });

        if (extractedCards.length > 0) {
           parsedData = { cards: extractedCards, glossary: {} };
        } else {
           throw new Error("Invalid format received. " + err.message);
        }
      }

      const generatedCards = parsedData.cards || parsedData;
      const generatedGlossary = parsedData.glossary || {};

      if (Array.isArray(generatedCards) && generatedCards.length > 0) {
        setDeck(generatedCards);
        setGlossary(generatedGlossary);
        refreshTokens();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('flashcard_decks').insert([{
            user_id: user.id,
            topic: currentTopic,
            file_ids: currentFiles,
            cards: { cards: generatedCards, glossary: generatedGlossary }
          }]).select();

          if (data) {
            setHistoryList(prev => [data[0], ...prev]);
            sessionStorage.removeItem('Prepia_flashcards_history'); // 🟢 Bust Cache
          }
        }

        // 🟢 Reset states and clear URL for clean UI after generation
        setTopic('');
        setSelectedFileIds([]);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        throw new Error("Invalid format received.");
      }
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

  const loadFromHistory = (item: any) => {
    setTopic(item.topic || '');
    setDeck(item.cards.cards || item.cards);
    setGlossary(item.cards.glossary || {});
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsLibraryOpen(false);
    setViewMode('flip');
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex < deck.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        alert(t.deckCompleted);
        setCurrentCardIndex(0);
      }
    }, 300);
  };

  const deleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this deck?')) return;
    setHistoryList(prev => prev.filter(h => h.id !== id));
    sessionStorage.removeItem('Prepia_flashcards_history');
    await supabase.from('flashcard_decks').delete().eq('id', id);
  };

  const editHistory = async (e: React.MouseEvent, id: string, currentTopic: string) => {
    e.stopPropagation();
    const newTopic = prompt('Enter new topic name:', currentTopic);
    if (!newTopic || newTopic.trim() === currentTopic) return;

    setHistoryList(prev => prev.map(h => h.id === id ? { ...h, topic: newTopic.trim() } : h));
    sessionStorage.removeItem('Prepia_flashcards_history');
    await supabase.from('flashcard_decks').update({ topic: newTopic.trim() }).eq('id', id);
  };

  // Native HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, originalIndex: number) => {
    e.dataTransfer.setData('cardIndex', originalIndex.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, questionIndex: number) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('cardIndex'));

    if (draggedIndex === questionIndex) {
      // Correct Match
      setMatchedPairs(prev => [...prev, questionIndex]);
    } else {
      // Wrong Match
      setWrongMatch(questionIndex);
      setTimeout(() => setWrongMatch(null), 800);
    }
  };

  return (
    <SecureLayout>
      <OutOfTokensModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        requiredTokens={requiredTokensForModal}
      />
      <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] w-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden bg-slate-900 lg:bg-slate-950 lg:border-slate-700/60 lg:border lg:rounded-3xl shadow-2xl mt-0 lg:mt-4 custom-scrollbar transition-colors duration-500">

        {/* Left Panel (Desktop Only) */}
        <div className="hidden lg:flex lg:w-[35%] bg-slate-900 lg:border-r border-slate-700/60 p-5 lg:p-8 flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar relative shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <h2 className="text-indigo-600 font-black flex items-center gap-2 text-lg"><Layers size={20}/> {t.brainDeck}</h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">{t.spacedRepetition}</p>
          </div>

          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t.contextFiles}</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {files.map(file => (
              <div key={file.id} onClick={() => toggleFile(file.id)} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedFileIds.includes(file.id) ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-slate-900 border-transparent hover:border-slate-300'}`}>
                <div className="mt-0.5">{selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-indigo-600" size={18} /> : <div className="w-4 h-4 border-2 border-slate-300 rounded" />}</div>
                <p className={`text-sm font-bold truncate ${selectedFileIds.includes(file.id) ? 'text-indigo-900' : 'text-slate-300'}`}>{file.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Interface */}
        <div ref={scrollRef} onScroll={handleScroll} className="w-full lg:w-[65%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative lg:overflow-y-auto custom-scrollbar bg-slate-950/50">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} border-slate-700/50 bg-slate-900/90`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">{t.brainDeck}</h2>
              <p className="text-[9px] font-bold text-indigo-500 flex items-center gap-1.5 uppercase tracking-widest"><Layers size={10} className="text-indigo-500"/> {t.spacedRepetition}</p>
            </div>
          </div>

          <div className="hidden lg:flex p-4 md:p-6 border-b border-slate-700 flex-col md:flex-row gap-4 items-center bg-slate-900 z-10 shadow-sm shrink-0">
             <div className="flex flex-1 gap-4 w-full">
               <input
                 type="text"
                 value={topic}
                 onChange={e => setTopic(e.target.value)}
                 placeholder={t.placeholder}
                 className="flex-1 p-4 rounded-xl border border-slate-300 bg-slate-950 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-bold placeholder:font-medium"
               />
               <button onClick={() => setIsLibraryOpen(true)} className="flex items-center gap-2 px-4 py-4 rounded-xl font-black uppercase tracking-wider border bg-slate-900 text-slate-400 border-slate-300 hover:bg-slate-950 hover:text-indigo-600 shadow-sm shrink-0">
                 <History size={18} />
               </button>
             </div>

             <button onClick={generateDeck} disabled={isLoading || (selectedFileIds.length === 0 && !topic.trim())} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-xl transition shadow-lg whitespace-nowrap shrink-0">
               {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}
               {isLoading ? t.generating : t.buildDeck}
             </button>
          </div>

          <div className="flex-1 overflow-auto relative p-4 md:p-8 flex flex-col items-center custom-scrollbar pb-40 lg:pb-8">

             {deck.length === 0 && !isLoading && (
                <div className="m-auto text-center animate-in fade-in zoom-in duration-500">
                   <div className="w-24 h-24 bg-slate-900 shadow-xl rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-700 transform rotate-3">
                     <Layers size={40} className="text-indigo-500" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-200">{t.masterAnyTopic}</h3>
                   <p className="text-base mt-2 max-w-sm mx-auto text-slate-500 font-medium">{t.useActiveRecall}</p>
                </div>
             )}

             {isLoading && deck.length === 0 && (
                <div className="w-full max-w-3xl m-auto h-full flex flex-col">
                  <div className="flex-1 bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 font-mono text-sm text-emerald-400 overflow-y-auto">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700/50">
                       <Loader2 size={18} className="animate-spin text-emerald-500" />
                       <span className="text-slate-300 font-bold uppercase tracking-widest text-xs">{t.extracting}</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{rawStream}</pre>
                  </div>
                </div>
             )}

             {deck.length > 0 && !isLoading && (
               <div className={`w-full ${viewMode === 'match' ? 'max-w-6xl' : 'max-w-2xl'} flex flex-col items-center animate-in fade-in zoom-in duration-500`}>

                 {/* Mode Toggle Buttons & Back to Chat */}
                 <div className="flex flex-col md:flex-row w-full justify-between items-center mb-8 gap-4">
                    <button
                      onClick={() => router.push('/chat')}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md uppercase tracking-wider"
                    >
                      💬 {t.backToChat}
                    </button>
                    <div className="flex bg-slate-700/60 p-1.5 rounded-2xl shadow-inner">
                      <button
                      onClick={() => setViewMode('flip')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'flip' ? 'bg-slate-900 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                    >
                      <BookOpen size={16} /> {t.classicFlip}
                    </button>
                    <button
                      onClick={() => setViewMode('match')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'match' ? 'bg-slate-900 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                    >
                      <Puzzle size={16} /> {t.matchGame}
                    </button>
                 </div>
                 </div>

                 {/* ============================================== */}
                 {/* MODE 1: CLASSIC FLIP                           */}
                 {/* ============================================== */}
                 {viewMode === 'flip' && (
                   <div className="w-full">
                     <div className="w-full flex justify-between items-center mb-6 px-4">
                       <h4 className="font-black text-slate-400 uppercase tracking-widest">Card {currentCardIndex + 1} of {deck.length}</h4>
                       <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{t.activeRecallMode}</span>
                     </div>

                     <div className="relative w-full h-80 cursor-pointer group [perspective:1000px]" onClick={() => setIsFlipped(!isFlipped)}>
                       <div className={`w-full h-full transition-transform duration-500 [transform-style:preserve-3d] shadow-2xl rounded-3xl ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>

                         <div className="absolute inset-0 w-full h-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
                            <span className="absolute top-6 left-6 text-slate-300"><RefreshCcw size={24}/></span>
                            <h2 className="text-3xl font-black text-slate-200 leading-tight">
                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}>{deck[currentCardIndex].q}</ReactMarkdown>
                            </h2>
                            <p className="absolute bottom-6 text-slate-400 font-bold text-sm">{t.tapToFlip}</p>
                         </div>

                         <div className="absolute inset-0 w-full h-full bg-indigo-600 border-2 border-indigo-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] text-white">
                            <div className="prose prose-invert prose-p:text-2xl prose-p:font-medium prose-p:leading-relaxed max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
                                components={{
                                  strong: ({node, children, ...props}) => {
                                    const term = String(children);
                                    const defKey = Object.keys(glossary).find(k => k.toLowerCase() === term.toLowerCase());

                                    if (defKey) {
                                      const isActive = activeDef === defKey;
                                      return (
                                        <span 
                                          className="relative inline-block font-bold text-indigo-200 border-b border-dashed border-indigo-300 cursor-pointer transition-colors hover:text-white hover:border-white"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDef(isActive ? null : defKey);
                                          }}
                                        >
                                          {children}
                                          {isActive && (
                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 border border-slate-700 text-slate-200 text-sm font-medium rounded-xl shadow-2xl z-50 text-left animate-in fade-in slide-in-from-bottom-2 cursor-auto" onClick={e => e.stopPropagation()}>
                                              <span className="flex items-center gap-2 text-xs font-black text-indigo-500 uppercase tracking-widest mb-1 border-b border-slate-800 pb-1">
                                                <Info size={12}/> {t.definition}
                                              </span>
                                              {glossary[defKey]}
                                              <svg className="absolute text-white h-2 w-full left-0 top-full drop-shadow-sm" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                                            </span>
                                          )}
                                        </span>
                                      );
                                    }
                                    return <strong className="font-bold text-white" {...props}>{children}</strong>;
                                  }
                                }}
                              >
                                {deck[currentCardIndex].a}
                              </ReactMarkdown>
                            </div>
                         </div>
                       </div>
                     </div>

                     <div className={`flex justify-center gap-4 mt-8 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                       <button onClick={(e) => { e.stopPropagation(); handleNextCard(); }} className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-700 rounded-2xl hover:bg-red-50 hover:border-red-200 transition shadow-sm w-28 group">
                         <Frown size={28} className="text-red-400 group-hover:text-red-500"/>
                         <span className="font-black text-sm text-slate-400 group-hover:text-red-600">{t.hard}</span>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); handleNextCard(); }} className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-700 rounded-2xl hover:bg-amber-50 hover:border-amber-200 transition shadow-sm w-28 group">
                         <Meh size={28} className="text-amber-400 group-hover:text-amber-500"/>
                         <span className="font-black text-sm text-slate-400 group-hover:text-amber-600">{t.good}</span>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); handleNextCard(); }} className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-700 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition shadow-sm w-28 group">
                         <Smile size={28} className="text-emerald-400 group-hover:text-emerald-500"/>
                         <span className="font-black text-sm text-slate-400 group-hover:text-emerald-600">{t.easy}</span>
                       </button>
                     </div>
                   </div>
                 )}

                 {/* ============================================== */}
                 {/* MODE 2: MATCH GAME                             */}
                 {/* ============================================== */}
                 {viewMode === 'match' && (
                   <div className="w-full flex flex-col">
                     {matchedPairs.length === deck.length ? (
                       <div className="text-center py-20 animate-in zoom-in duration-500">
                         <Trophy size={60} className="text-yellow-500 mx-auto mb-6" />
                         <h2 className="text-3xl font-black text-slate-200 mb-4">{t.gameComplete}</h2>
                         <button onClick={initGame} className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition">
                           {t.playAgain}
                         </button>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                         {/* LEFT: Questions & Drop Zones */}
                         <div className="space-y-4">
                           {deck.map((card, i) => (
                             <div
                               key={`q-${i}`}
                               className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                                 matchedPairs.includes(i)
                                   ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                   : wrongMatch === i
                                     ? 'bg-red-50 border-red-500 shake-animation'
                                     : 'bg-slate-900 border-slate-700'
                               }`}
                             >
                               <h3 className="font-bold text-slate-200 text-lg mb-3">
                                 <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}>{card.q}</ReactMarkdown>
                               </h3>

                               {matchedPairs.includes(i) ? (
                                 <div className="p-4 bg-emerald-600 text-white rounded-xl font-medium animate-in zoom-in duration-300">
                                   <div className="flex items-center gap-2 mb-1 opacity-80 text-sm">
                                      <CheckCircle2 size={16} /> {t.matched}
                                   </div>
                                   <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}>{card.a}</ReactMarkdown>
                                 </div>
                               ) : (
                                 <div
                                   onDragOver={handleDragOver}
                                   onDrop={(e) => handleDrop(e, i)}
                                   className="w-full h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-950 flex items-center justify-center text-slate-400 font-medium transition hover:border-indigo-400 hover:bg-indigo-50/50"
                                 >
                                   {wrongMatch === i ? (
                                     <span className="text-red-500 flex items-center gap-2"><X size={18}/> {t.incorrect}</span>
                                   ) : (
                                     <span className="flex items-center gap-2"><Puzzle size={18}/> {t.dragAnswerHere}</span>
                                   )}
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>

                         {/* RIGHT: Draggable Answers */}
                         <div className="space-y-4 lg:sticky lg:top-8 h-fit">
                           {shuffledAnswers.filter(ans => !matchedPairs.includes(ans.originalIndex)).map((ans, idx) => (
                             <div
                               key={`ans-${ans.originalIndex}`}
                               draggable
                               onDragStart={(e) => handleDragStart(e, ans.originalIndex)}
                               className="p-5 bg-slate-900 border-2 border-indigo-100 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md transition-all animate-in slide-in-from-right-4 duration-300"
                             >
                               <div className="flex items-start gap-3">
                                 <div className="mt-1 text-indigo-400"><Layers size={20} /></div>
                                 <div className="prose prose-slate prose-sm font-medium text-slate-300 max-w-none pointer-events-none">
                                   <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}>{ans.a}</ReactMarkdown>
                                 </div>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 )}

               </div>
             )}
          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            {/* Mobile Action Pills */}
            <div className="flex gap-2 overflow-x-auto mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('files')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedFileIds.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                <BookOpen size={12}/> {t.filesTab} {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('history')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-900 border-slate-700 text-slate-400">
                <History size={12}/> {t.library}
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-[2rem] blur-md opacity-50 group-focus-within:opacity-70 transition duration-500"></div>
              <div className="relative flex shadow-xl rounded-[2rem] border focus-within:ring-2 focus-within:ring-indigo-400 transition-all backdrop-blur-xl bg-slate-900/90 border-slate-700 focus-within:bg-slate-900 overflow-hidden p-1">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder={t.placeholder}
                  disabled={isLoading}
                  className="w-full pl-4 pr-2 py-3 bg-transparent border-none focus:ring-0 outline-none disabled:opacity-50 text-sm font-medium text-slate-200 placeholder:text-slate-400"
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); generateDeck(); } }}
                />
                <button onClick={generateDeck} disabled={isLoading || (selectedFileIds.length === 0 && !topic.trim())} className="p-2 m-1 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white transition-colors shadow-sm shrink-0 flex items-center justify-center">
                   {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[75vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col bg-slate-900 border-t border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-200">
              {isMobileDrawerOpen === 'files' && <><BookOpen size={18} className="text-indigo-500"/> {t.knowledgeBase}</>}
              {isMobileDrawerOpen === 'history' && <><History size={18} className="text-indigo-500"/> {t.savedDecks}</>}
            </h3>
          </div>

          {/* FILES DRAWER */}
          {isMobileDrawerOpen === 'files' && (
            <div className="space-y-2 pb-10">
              {files.length === 0 ? (
                <UploadCTA type="source" title="No Sources Found" description="Upload PDFs or Documents in your workspace to enable AI to chat with them." />
              ) : (
                files.map(file => (
                  <div key={file.id} onClick={() => toggleFile(file.id)}
                    className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all active:scale-95 ${selectedFileIds.includes(file.id) ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-slate-950 border-transparent shadow-sm'}`}
                  >
                    <div className="mt-0.5">{selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-indigo-500" size={18} /> : <div className="w-4 h-4 border-2 rounded border-slate-300" />}</div>
                    <div className="overflow-hidden"><p className={`text-sm font-bold truncate ${selectedFileIds.includes(file.id) ? 'text-indigo-500' : 'text-slate-300'}`}>{file.name || 'Untitled'}</p></div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* HISTORY DRAWER */}
          {isMobileDrawerOpen === 'history' && (
            <div className="space-y-3 pb-10">
              {historyList.length === 0 ? (
                <div className="text-center mt-4 p-6 border-2 border-dashed rounded-3xl border-slate-700 bg-slate-950"><p className="text-sm text-slate-500 font-medium">{t.noDecks}</p></div>
              ) : (
                historyList.map((item) => (
                  <div key={item.id} onClick={() => {
                      loadFromHistory(item); setIsMobileDrawerOpen('none'); scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-4 border-2 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-sm bg-slate-900 border-slate-700 text-slate-300 flex flex-col"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold line-clamp-2 text-slate-200">{item.topic}</p>
                      <div className="flex gap-2 ml-2" onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => editHistory(e, item.id, item.topic)} className="text-slate-400 hover:text-indigo-500 transition-colors p-1"><Pencil size={12}/></button>
                        <button onClick={(e) => deleteHistory(e, item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                       <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">{(item.cards.cards || item.cards)?.length} {t.cards}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase mt-2">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sticky Done Button */}
          <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t from-white via-white to-transparent">
            <button onClick={() => setIsMobileDrawerOpen('none')} className="w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white">
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>

    </SecureLayout>
  );
}

export default function FlashcardsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><FlashcardsPageContent /></Suspense>;
}
