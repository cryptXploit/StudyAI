'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Map, MapPin, Swords, Shield, Trophy, CheckCircle, Circle, Plus, Loader2, Star, ListTree, Target, CheckCircle2, Trash2, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const translations = {
  English: {
    title: "Syllabus Quest Map", subtitle: "Turn your boring syllabus into an epic RPG adventure!",
    myQuests: "My Active Quests", noQuests: "No active quests. Forge one or load from Dashboard!",
    completed: "Completed", progress: "Progress", levelUp: "Milestone Reached! +10 Aura ✨", selectToView: "Select a quest to view your map.",
    forgeMethod: "Select Forge Method", typeManual: "Manual Type (Free)", typeDashboard: "Dashboard Vault (Pro)",
    courseName: "Course/Subject Name", chapters: "Chapters & Topics", createSyllabus: "Forge Quest Map",
    addChapter: "Add Chapter", loadDashboard: "Load from Dashboard Library", startQuest: "Start Selected Quest",
    chapterNamePlaceholder: "Chapter Name",
    topicsPlaceholder: "Topics (Optional - one per line)",
    chPrefix: "Ch",
    chooseSyllabus: "-- Choose Syllabus --",
    selectChaptersOptional: "Select Chapters (Optional)",
    selectTopicsOptional: "Select Topics (Optional)",
    tracker: "Tracker",
    syllabusQuest: "Syllabus Quest",
    chatBtn: "Chat",
    epicQuestLine: "Epic Quest Line",
    chapterPrefixText: "Chapter",
    questMastered: "Quest Mastered!",
    questMasteredDesc: "You have conquered the entire syllabus. A true scholar!",
    forgeTab: "Forge"
  },
  Bangla: {
    title: "সিলেবাস কোয়েস্ট ম্যাপ", subtitle: "বোরিং সিলেবাসকে বানান এপিক আরপিজি (RPG) অ্যাডভেঞ্চার!",
    myQuests: "আমার চলমান কোয়েস্ট", noQuests: "কোনো কোয়েস্ট নেই। তৈরি করুন অথবা ড্যাশবোর্ড থেকে লোড করুন!",
    completed: "সম্পন্ন", progress: "অগ্রগতি", levelUp: "মাইলস্টোন সম্পন্ন! +১০ অরা ✨", selectToView: "আপনার ম্যাপ দেখতে একটি কোয়েস্ট সিলেক্ট করুন।",
    forgeMethod: "তৈরির মাধ্যম সিলেক্ট করুন", typeManual: "ম্যানুয়াল টাইপ (Free)", typeDashboard: "ড্যাশবোর্ড ভল্ট (Pro)",
    courseName: "কোর্সের নাম", chapters: "চ্যাপ্টার ও টপিক", createSyllabus: "কোয়েস্ট ম্যাপ তৈরি করুন",
    addChapter: "চ্যাপ্টার যুক্ত করুন", loadDashboard: "ড্যাশবোর্ড লাইব্রেরি থেকে লোড করুন", startQuest: "সিলেক্টেড কোয়েস্ট শুরু করুন",
    chapterNamePlaceholder: "চ্যাপ্টারের নাম",
    topicsPlaceholder: "টপিক (ঐচ্ছিক - প্রতি লাইনে একটি)",
    chPrefix: "চ্যাপ্টার",
    chooseSyllabus: "-- সিলেবাস বেছে নিন --",
    selectChaptersOptional: "চ্যাপ্টার বেছে নিন (ঐচ্ছিক)",
    selectTopicsOptional: "টপিক বেছে নিন (ঐচ্ছিক)",
    tracker: "ট্র্যাকার",
    syllabusQuest: "সিলেবাস কোয়েস্ট",
    chatBtn: "চ্যাট",
    epicQuestLine: "এপিক কোয়েস্ট লাইন",
    chapterPrefixText: "অধ্যায়",
    questMastered: "কোয়েস্ট সম্পন্ন!",
    questMasteredDesc: "আপনি সম্পূর্ণ সিলেবাস জয় করেছেন। একজন সত্যিকারের স্কলার!",
    forgeTab: "তৈরি"
  },
  Hindi: {
    title: "सिलेबस क्वेस्ट मैप", subtitle: "अपने उबाऊ सिलेबस को महाकाव्य आरपीजी रोमांच में बदलें!",
    myQuests: "मेरे सक्रिय क्वेस्ट", noQuests: "कोई सक्रिय क्वेस्ट नहीं। एक बनाएं या डैशबोर्ड से लोड करें!",
    completed: "पूरा हुआ", progress: "प्रगति", levelUp: "मील का पत्थर पार! +10 ऑरा ✨", selectToView: "अपना मैप देखने के लिए एक क्वेस्ट चुनें।",
    forgeMethod: "बनाने का तरीका चुनें", typeManual: "मैनुअल टाइप (Free)", typeDashboard: "डैशबोर्ड तिजोरी (Pro)",
    courseName: "कोर्स का नाम", chapters: "अध्याय और विषय", createSyllabus: "क्वेस्ट मैप बनाएं",
    addChapter: "अध्याय जोड़ें", loadDashboard: "डैशबोर्ड लाइब्रेरी से लोड करें", startQuest: "चयनित क्वेस्ट शुरू करें",
    chapterNamePlaceholder: "अध्याय का नाम",
    topicsPlaceholder: "विषय (वैकल्पिक - प्रति पंक्ति एक)",
    chPrefix: "अध्याय",
    chooseSyllabus: "-- सिलेबस चुनें --",
    selectChaptersOptional: "अध्याय चुनें (वैकल्पिक)",
    selectTopicsOptional: "विषय चुनें (वैकल्पिक)",
    tracker: "ट्रैकर",
    syllabusQuest: "सिलेबस क्वेस्ट",
    chatBtn: "चैट",
    epicQuestLine: "महाकाव्य क्वेस्ट लाइन",
    chapterPrefixText: "अध्याय",
    questMastered: "क्वेस्ट पूर्ण!",
    questMasteredDesc: "आपने पूरा सिलेबस जीत लिया है। एक सच्चे विद्वान!",
    forgeTab: "बनाएं"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function SyllabusQuestPage() {
  const supabase = createClient();
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  const [quests, setQuests] = useState<any[]>([]);
  const [activeQuest, setActiveQuest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🟢 HIERARCHICAL FORGE MODE TOGGLE (Free vs Pro)
  const [forgeMode, setForgeMode] = useState<'manual' | 'dashboard'>('dashboard');

  // 🟢 MODE 1: MANUAL TYPE STATE (FREE)
  const [courseName, setCourseName] = useState('');
  const [chapterList, setChapterList] = useState<{id: string, chapterName: string, topics: string[]}[]>([]);
  const [tempChapterName, setTempChapterName] = useState('');
  const [tempTopicsText, setTempTopicsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 MODE 2: DASHBOARD SYLLABUS SELECTION STATES (PRO)
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Floating XP Animation State
  const [xpPopups, setXpPopups] = useState<{id: number, x: number, y: number}[]>([]);

  // 🟢 MOBILE UI STATES
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'forge'|'quests'>('none');
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

  const [completedTopics, setCompletedTopics] = useState<Record<string, string[]>>({});

  const saveCompletedTopics = (newState: Record<string, string[]>) => {
    setCompletedTopics(newState);
    localStorage.setItem('syllabus_completed_topics', JSON.stringify(newState));
  };

  useEffect(() => {
    const loadLanguage = () => { const savedLang = localStorage.getItem('Prepia_language'); if (savedLang) setLanguage(savedLang as LanguageType); };
    loadLanguage(); window.addEventListener('languageChanged', loadLanguage);

    const savedTopics = localStorage.getItem('syllabus_completed_topics');
    if (savedTopics) {
      try { setCompletedTopics(JSON.parse(savedTopics)); } catch (e) {}
    }

    fetchQuests();
    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  const fetchQuests = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/list` : `${apiUrlBase}/api/syllabus/list`;

      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const text = await res.text();

      try {
        const data = JSON.parse(text);
        if (data.success) {
          setQuests(data.syllabuses);
          if (activeQuest) {
            const updated = data.syllabuses.find((q: any) => q.id === activeQuest.id);
            if (updated) setActiveQuest(updated);
          }
        }
      } catch (parseErr) {}
    } catch (e) {}
    setIsLoading(false);
  };

  // ==========================================
  // 🟢 LOGIC: MANUAL TYPE (FREE)
  // ==========================================
  const handleAddChapter = () => {
    if (!tempChapterName.trim()) return;
    const topicsArray = tempTopicsText.split('\n').map(t => t.trim()).filter(t => t !== '');
    setChapterList([...chapterList, { id: Date.now().toString(), chapterName: tempChapterName.trim(), topics: topicsArray }]);
    setTempChapterName(''); setTempTopicsText('');
  };

  const handleRemoveChapter = (id: string) => { setChapterList(chapterList.filter(c => c.id !== id)); };

  const handleCreateManualQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || chapterList.length === 0) return;
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/create` : `${apiUrlBase}/api/syllabus/create`;

      const res = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ courseName, chapters: chapterList, language })
      });
      const data = await res.json();

      if (data.success) {
        setCourseName(''); setChapterList([]);
        await fetchQuests();
        // Auto-select newly created quest
        const newQuest = { ...data.course, chapters: data.course.chapters || [] };
        setActiveQuest(newQuest);
      } else {
        console.error("Syllabus Create Error:", data.error);
        showPublicError(data);
      }
    } catch (e: any) {
      console.error("Syllabus Create Exception:", e);
      showPublicError();
    }
    setIsSubmitting(false);
  };

  // ==========================================
  // 🟢 LOGIC: DASHBOARD IMPORT (PRO)
  // ==========================================
  const toggleChapterSelection = (chapterId: string) => {
    setSelectedChapterIds(prev => prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]);
  };

  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const handleStartDashboardQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSyllabusId) return;

    const sourceQuest = quests.find(q => q.id === selectedSyllabusId);
    if (!sourceQuest) return;

    let filteredChapters = sourceQuest.chapters;
    if (selectedChapterIds.length > 0) {
      filteredChapters = sourceQuest.chapters.filter((c: any) => selectedChapterIds.includes(c.id));
    }

    setActiveQuest({ ...sourceQuest, chapters: filteredChapters, activeTopicsFilter: selectedTopics });
  };

  // ==========================================
  // 🟢 LOGIC: GAMIFICATION RPG INTERACTION
  // ==========================================
  const toggleChapterCompletion = async (chapter: any, e: React.MouseEvent) => {
    const newStatus = !chapter.is_completed;
    const updatedQuest = { ...activeQuest, chapters: activeQuest.chapters.map((c: any) => c.id === chapter.id ? { ...c, is_completed: newStatus } : c) };
    setActiveQuest(updatedQuest);
    setQuests(quests.map(q => q.id === updatedQuest.id ? { ...q, chapters: q.chapters.map((c:any) => c.id === chapter.id ? { ...c, is_completed: newStatus } : c) } : q));

    // 🟢 Toggle all topics inside this chapter
    const newCompletedTopics = { ...completedTopics };
    if (newStatus && chapter.topics) {
      newCompletedTopics[chapter.id] = [...chapter.topics];
    } else {
      newCompletedTopics[chapter.id] = [];
    }
    saveCompletedTopics(newCompletedTopics);

    if (newStatus) {
      const newPopup = { id: Date.now(), x: e.clientX - 50, y: e.clientY - 50 };
      setXpPopups(prev => [...prev, newPopup]); setTimeout(() => setXpPopups(prev => prev.filter(p => p.id !== newPopup.id)), 1500);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); const oscillator = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode); gainNode.connect(audioCtx.destination); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); oscillator.start(); gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5); oscillator.stop(audioCtx.currentTime + 0.5);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/complete` : `${apiUrlBase}/api/syllabus/complete`;
      await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ chapterId: chapter.id, isCompleted: newStatus }) });
    } catch (e) { fetchQuests(); }
  };

  const toggleTopicCompletion = async (chapter: any, topicName: string, e: React.MouseEvent) => {
    const currentTopics = completedTopics[chapter.id] || [];
    const isCurrentlyDone = currentTopics.includes(topicName);

    let updatedChapterTopics: string[];
    if (isCurrentlyDone) {
      updatedChapterTopics = currentTopics.filter(t => t !== topicName);
    } else {
      updatedChapterTopics = [...currentTopics, topicName];
    }

    const newCompletedTopics = { ...completedTopics, [chapter.id]: updatedChapterTopics };
    saveCompletedTopics(newCompletedTopics);

    // If all topics are completed, automatically complete the chapter!
    const allTopicsCompleted = chapter.topics && chapter.topics.length > 0 && chapter.topics.every((t: string) => updatedChapterTopics.includes(t));

    // If completing this topic triggers chapter completion (and it wasn't already completed)
    if (allTopicsCompleted && !chapter.is_completed) {
      await toggleChapterCompletion(chapter, e);
    }
    // Or if un-completing this topic triggers chapter un-completion (and it was completed)
    else if (!allTopicsCompleted && chapter.is_completed) {
      await toggleChapterCompletion(chapter, e);
    } else {
      // Just play a tiny sound for topic tick
      if (!isCurrentlyDone) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); const oscillator = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode); gainNode.connect(audioCtx.destination); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); oscillator.start(); gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1); oscillator.stop(audioCtx.currentTime + 0.1);
        } catch(e) {}
      }
    }
  };

  const activeCourseDropdown = quests.find(q => q.id === selectedSyllabusId);
  const availableTopicsDropdown = activeCourseDropdown?.chapters?.filter((c:any) => selectedChapterIds.length === 0 || selectedChapterIds.includes(c.id))?.flatMap((c:any) => c.topics || []) || [];

  const renderForgeSection = () => (
    <>
      <div className="flex flex-col gap-3 mb-4">
         <h3 className="text-sm font-black tracking-widest text-slate-400 uppercase flex items-center gap-2"><Swords size={16} className="text-amber-500"/> {t.forgeMethod}</h3>

         {/* Toggle Buttons */}
         <div className="flex gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <button onClick={() => setForgeMode('manual')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${forgeMode === 'manual' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
              {t.typeManual}
            </button>
            <button onClick={() => setForgeMode('dashboard')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${forgeMode === 'dashboard' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
              <Crown size={14}/> {t.typeDashboard}
            </button>
         </div>
      </div>

      {/* 🟢 MODE 1: MANUAL FORGE (FREE) */}
      {forgeMode === 'manual' ? (
        <form onSubmit={handleCreateManualQuest} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div>
            <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder={t.courseName} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none text-white placeholder:text-slate-600 transition-colors"/>
          </div>

          <AnimatePresence>
            {courseName.length >= 2 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2 space-y-3">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2">
                  <input value={tempChapterName} onChange={e => setTempChapterName(e.target.value)} placeholder={t.chapterNamePlaceholder} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs font-bold text-white focus:border-indigo-500 outline-none" />
                  <textarea value={tempTopicsText} onChange={e => setTempTopicsText(e.target.value)} placeholder={t.topicsPlaceholder} rows={2} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-slate-300 focus:border-indigo-500 outline-none resize-none" />
                  <button type="button" onClick={handleAddChapter} disabled={!tempChapterName.trim()} className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs font-black uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 border border-indigo-500/30">
                    <Plus size={14}/> {t.addChapter}
                  </button>
                </div>

                {/* List of Added Chapters */}
                {chapterList.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {chapterList.map((chap, idx) => (
                      <div key={chap.id} className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-200 text-xs mb-1">{t.chPrefix} {idx + 1}: {chap.chapterName}</h4>
                          {chap.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {chap.topics.map((tp, i) => <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">{tp}</span>)}
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => handleRemoveChapter(chap.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting || chapterList.length === 0} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Swords size={18}/>} {t.createSyllabus}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      ) : (
        // 🟢 MODE 2: DASHBOARD SYLLABUS VAULT (PRO)
        <form onSubmit={handleStartDashboardQuest} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div>
            <label className="block text-[10px] font-black tracking-widest text-amber-500 uppercase mb-2 flex items-center gap-1.5"><ListTree size={14}/> {t.loadDashboard}</label>
            <select value={selectedSyllabusId} onChange={(e) => { setSelectedSyllabusId(e.target.value); setSelectedChapterIds([]); setSelectedTopics([]); }} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold focus:border-amber-500 outline-none text-slate-300">
               <option value="">{t.chooseSyllabus}</option>
               {quests.map(q => <option key={q.id} value={q.id}>{q.course_name}</option>)}
            </select>
          </div>

          {/* Chapters (Multiple Toggle) */}
          {selectedSyllabusId && activeCourseDropdown?.chapters?.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5"><CheckCircle2 size={14}/> {t.selectChaptersOptional}</label>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {activeCourseDropdown.chapters.map((chap: any) => (
                  <div key={chap.id} onClick={() => toggleChapterSelection(chap.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-bold transition-all border ${selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0 ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                    {(selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0) ? <CheckCircle2 size={14} className="text-amber-400 shrink-0"/> : <Circle size={14} className="text-slate-600 shrink-0"/>}
                    <span className="truncate">{chap.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics (Multiple Select) */}
          {selectedSyllabusId && availableTopicsDropdown.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Target size={14}/> {t.selectTopicsOptional}</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {availableTopicsDropdown.map((topic: string, idx: number) => (
                  <button key={idx} type="button" onClick={() => toggleTopicSelection(topic)} className={`text-[10px] font-black tracking-wide px-2 py-1 rounded-md border transition-all ${selectedTopics.includes(topic) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={!selectedSyllabusId} className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-4">
            <Map size={18}/> {t.startQuest}
          </button>
        </form>
      )}
    </>
  );

  const renderQuestsList = () => (
    <>
      <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2"><Shield size={16}/> {t.myQuests}</h3>
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-600" size={32}/></div>
      ) : quests.length === 0 ? (
        <p className="text-xs font-medium text-slate-500 text-center p-6 bg-slate-950 rounded-2xl border border-slate-800 border-dashed">{t.noQuests}</p>
      ) : (
        <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 pb-6">
          {quests.map(quest => {
            const completedCount = quest.chapters?.filter((c:any)=>c.is_completed).length || 0;
            const totalCount = quest.chapters?.length || 1;
            const progress = Math.round((completedCount/totalCount)*100);
            const isActive = activeQuest?.id === quest.id;

            return (
              <div key={quest.id} onClick={() => { setActiveQuest(quest); setIsMobileDrawerOpen('none'); }} className={`p-4 rounded-2xl border cursor-pointer transition-all ${isActive ? 'bg-slate-800 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] scale-[0.99]' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                <h4 className="font-black text-slate-200 truncate mb-2 text-sm">{quest.course_name}</h4>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                  <span>{t.progress}</span>
                  <span className={progress === 100 ? 'text-amber-400' : 'text-emerald-400'}>{progress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <SecureLayout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] max-w-7xl mx-auto overflow-hidden bg-slate-950 lg:border lg:border-slate-800 lg:rounded-3xl lg:shadow-2xl lg:mt-4 font-sans text-slate-200 relative">

        {/* Mobile Smart Header */}
        <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] shrink-0`}>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><Map size={16} className="text-amber-500"/> {t.tracker}</h2>
            <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.syllabusQuest}</p>
          </div>
          <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-amber-600 text-slate-900 shadow-md hover:bg-amber-500">{t.chatBtn}</button>
        </div>

        {/* Floating XP Popups */}
        <AnimatePresence>
          {xpPopups.map(popup => (
            <motion.div key={popup.id} initial={{ opacity: 1, y: popup.y, x: popup.x, scale: 0.5 }} animate={{ opacity: 0, y: popup.y - 100, scale: 1.5 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeOut" }} className="fixed z-50 pointer-events-none font-black text-2xl text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] flex items-center gap-1">
              <Star fill="currentColor" size={24}/> +10 ✨
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Desktop Sidebar: Quests & Forge */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-900 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Map size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{t.title}</h2>
              <p className="text-xs font-bold text-amber-500/80">{t.subtitle}</p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-8 shadow-inner">
            {renderForgeSection()}
          </div>
          <div className="flex-1 flex flex-col">
            {renderQuestsList()}
          </div>
        </div>

        {/* Right Panel: RPG Quest Map Engine */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 lg:w-2/3 h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] relative overflow-y-auto custom-scrollbar flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/90 to-slate-950 pointer-events-none"></div>

          {!activeQuest ? (
            <div className="flex-1 flex flex-col items-center justify-center z-10 opacity-50 h-[600px] lg:h-auto">
               <MapPin size={64} className="mb-4 text-slate-600"/>
               <p className="font-bold text-slate-400">{t.selectToView}</p>
            </div>
          ) : (
            <div className="z-10 p-6 md:p-10 flex flex-col items-center w-full pb-32">

               <div className="text-center mb-12 md:mb-16 animate-in slide-in-from-top-10 mt-6 md:mt-0">
                 <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-600 drop-shadow-sm mb-2">{activeQuest.course_name}</h1>
                 <p className="text-amber-500/70 font-bold uppercase tracking-widest text-xs md:text-sm flex items-center justify-center gap-2"><Trophy size={16}/> {t.epicQuestLine}</p>
               </div>

               {/* Map Path Generation */}
               <div className="relative w-full max-w-md mx-auto">
                 <div className="absolute top-0 bottom-0 left-1/2 w-1.5 bg-slate-800 -translate-x-1/2 rounded-full overflow-hidden">
                    <div className="w-full bg-amber-500 transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                         style={{ height: `${(activeQuest.chapters?.filter((c:any)=>c.is_completed).length / (activeQuest.chapters?.length || 1)) * 100}%` }}>
                    </div>
                 </div>

                 <div className="space-y-12">
                   {activeQuest.chapters?.map((chapter: any, index: number) => {
                     const isLeft = index % 2 === 0;
                     const isDone = chapter.is_completed;

                     return (
                       <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, type: "spring" }} key={chapter.id} className={`relative flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'}`}>
                         <button onClick={(e) => toggleChapterCompletion(chapter, e)} className={`absolute left-1/2 -translate-x-1/2 z-20 w-10 md:w-12 h-10 md:h-12 rounded-full border-4 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 ${isDone ? 'bg-amber-500 border-amber-200 text-slate-900 shadow-[0_0_30px_rgba(245,158,11,0.6)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-amber-500/50 hover:text-amber-500'}`}>
                           {isDone ? <CheckCircle size={20} className="animate-in zoom-in" /> : <Circle size={20} />}
                         </button>

                         <div className={`w-[calc(50%-28px)] md:w-[calc(50%-40px)] ${isLeft ? 'pr-4 md:pr-6 text-right' : 'pl-4 md:pl-6 text-left'}`}>
                           <div className={`p-3 md:p-4 rounded-2xl border transition-all duration-500 ${isDone ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10' : 'bg-slate-900 border-slate-800 opacity-70'}`}>
                             <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest block mb-1 ${isDone ? 'text-amber-400' : 'text-slate-500'}`}>{t.chapterPrefixText} {index + 1}</span>
                             <h3 className={`font-bold text-xs md:text-base mb-2 transition-colors ${isDone ? 'text-white' : 'text-slate-400'}`}>{chapter.title}</h3>

                             {/* 🟢 TOPICS AS HIERARCHICAL SUBNODES */}
                             {chapter.topics && chapter.topics.length > 0 && (
                               <div className="mt-4 space-y-2">
                                 {chapter.topics.map((t:string, i:number) => {
                                   const isTopicSelected = activeQuest.activeTopicsFilter?.includes(t);
                                   const isTopicDone = (completedTopics[chapter.id] || []).includes(t) || isDone; // If chapter is done, visually all topics are done
                                   return (
                                     <div key={i} onClick={(e) => toggleTopicCompletion(chapter, t, e)} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isTopicDone ? 'bg-amber-500/20 border-amber-500/40 shadow-sm' : (isTopicSelected ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-slate-950 border-slate-700/50 hover:border-amber-500/30')}`}>
                                       <button className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isTopicDone ? 'bg-amber-500 border-amber-400 text-slate-900' : 'bg-slate-900 border-slate-600 text-transparent'}`}>
                                          <CheckCircle2 size={12} className={isTopicDone ? 'opacity-100 animate-in zoom-in' : 'opacity-0'}/>
                                       </button>
                                       <span className={`text-xs font-bold text-left leading-snug ${isTopicDone ? 'text-amber-100' : 'text-slate-400'}`}>
                                         {t}
                                       </span>
                                     </div>
                                   );
                                 })}
                               </div>
                             )}
                           </div>
                         </div>
                       </motion.div>
                     );
                   })}
                 </div>
               </div>

               {activeQuest.chapters?.every((c:any) => c.is_completed) && activeQuest.chapters?.length > 0 && (
                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-20 flex flex-col items-center bg-gradient-to-t from-amber-500/20 to-transparent p-10 rounded-full">
                    <Trophy size={80} className="text-amber-400 drop-shadow-[0_0_40px_rgba(251,191,36,0.8)] animate-pulse mb-4"/>
                    <h2 className="text-2xl font-black text-amber-300 text-center">{t.questMastered}</h2>
                    <p className="text-amber-500/80 font-bold mt-2 text-center max-w-xs text-sm">{t.questMasteredDesc}</p>
                 </motion.div>
               )}
            </div>
          )}
        </div>

        {/* Mobile Floating Input Dock */}
        <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
          <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
            <button
              onClick={() => setIsMobileDrawerOpen('quests')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 border border-slate-700"
            >
              <Shield size={18} /> {t.myQuests}
            </button>
            <button
              onClick={() => setIsMobileDrawerOpen('forge')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 border border-amber-400/50"
            >
              <Swords size={18} /> {t.forgeTab}
            </button>
          </div>
        </div>

        {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
        <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />

          {/* Forge Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'forge' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderForgeSection()}
          </div>

          {/* Quests Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'quests' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderQuestsList()}
          </div>
        </div>

      </div>
    </SecureLayout>
  );
}
