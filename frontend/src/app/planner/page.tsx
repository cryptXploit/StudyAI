'use client';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { History, CalendarDays, Sparkles, Loader2, CheckCircle2, Circle, Clock, Target, Trash2, ShieldCheck, FileText } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    title: "Magic Study Planner",
    subtitle: "AI-Powered Day-by-Day Routine Maker",
    topicLabel: "What do you want to study?",
    topicPlaceholder: "e.g., Quantum Mechanics, SAT Math, Chapter 5...",
    dateLabel: "Exam / Target Date",
    generateBtn: "Generate Magic Routine",
    generating: "Crafting your routine...",
    historyTitle: "Your Active Routines",
    noHistory: "No routines created yet.",
    routineAwaits: "Your Routine Awaits",
    awaitsDesc: "Set your target topic and date on the left. AI will craft a perfect daily checklist for you.",
    daysLeft: "days left",
    overallProgress: "Overall Progress",
    proBadge: "PRO TIER FEATURE"
  },
  Bangla: {
    title: "ম্যাজিক স্টাডি প্ল্যানার",
    subtitle: "এআই সাপোর্টেড ডাইনামিক রুটিন মেকার",
    topicLabel: "আপনি কী পড়তে চান?",
    topicPlaceholder: "যেমন: HSC Physics Chapter 2, IELTS Reading...",
    dateLabel: "পরীক্ষার তারিখ / টার্গেট",
    generateBtn: "ম্যাজিক রুটিন তৈরি করুন",
    generating: "রুটিন বানানো হচ্ছে...",
    historyTitle: "আপনার অ্যাক্টিভ রুটিনসমূহ",
    noHistory: "এখনো কোনো রুটিন তৈরি করা হয়নি।",
    routineAwaits: "আপনার রুটিনের অপেক্ষায়",
    awaitsDesc: "বামে আপনার টপিক এবং টার্গেট ডেট দিন। এআই আপনার জন্য একটি নিখুঁত চেকলিস্ট বানিয়ে দেবে।",
    daysLeft: "দিন বাকি",
    overallProgress: "সর্বমোট অগ্রগতি",
    proBadge: "প্রো-টিয়ার ফিচার"
  },
  Hindi: {
    title: "मैजिक स्टडी प्लानर",
    subtitle: "AI-संचालित रूटीन मेकर",
    topicLabel: "आप क्या पढ़ना चाहते हैं?",
    topicPlaceholder: "उदा. Calculus, NEET Biology...",
    dateLabel: "परीक्षा की तिथि / लक्ष्य",
    generateBtn: "रूटीन जेनरेट करें",
    generating: "रूटीन बनाया जा रहा है...",
    historyTitle: "आपके सक्रिय रूटीन",
    noHistory: "अभी तक कोई रूटीन नहीं बनाया गया।",
    routineAwaits: "रूटीन की प्रतीक्षा में",
    awaitsDesc: "बाईं ओर अपना विषय और लक्ष्य तिथि निर्धारित करें। AI आपके लिए एक उत्तम चेकलिस्ट तैयार करेगा।",
    daysLeft: "दिन बचे हैं",
    overallProgress: "कुल प्रगति",
    proBadge: "प्रो टियर फ़ीचर"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function PlannerPage() {
  const supabase = createClient();
  const [topic, setTopic] = useState('');
  const [examDate, setExamDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [routineData, setRoutineData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  
  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(10);

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

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('study_routines').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setHistoryList(data);
  };

  const calculateDays = (targetDate: string) => {
    const today = new Date();
    const exam = new Date(targetDate);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1; // Minimum 1 day
  };

  const submitPlanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !examDate || isLoading) return;

    const daysLeft = calculateDays(examDate);
    if (daysLeft > 60) {
      alert("For optimal AI performance, select an exam date within 60 days.");
      return;
    }

    if (tier !== 'PRO' && tokens < 10) {
      setRequiredTokensForModal(10);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 1.5 Minutes Timeout Limit for large JSON

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/planner/generate` : `${apiUrlBase}/api/planner/generate`;
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, days: daysLeft, language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 10);
            setShowTokenModal(true);
            setIsLoading(false);
            return;
        }
      }

      const data = await response.json();
      if (!data.valid || !data.routineData) throw new Error(data.error || "Failed to generate routine.");
      
      refreshTokens();

      // Save to Supabase (Zero cost for future loads)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: savedRow } = await supabase.from('study_routines').insert([{
          user_id: user.id,
          topic: topic,
          exam_date: examDate,
          routine_data: data.routineData
        }]).select().single();

        if (savedRow) {
          setActiveRoutineId(savedRow.id);
          setRoutineData(savedRow.routine_data);
          fetchHistory();
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("🚨 Timeout: Server took too long to craft the routine. Try selecting a shorter timeframe.");
      } else {
        alert(`🚨 Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Checkbox Status instantly and silently update DB
  const toggleTask = async (dayIndex: number, taskIndex: number) => {
    if (!routineData || !activeRoutineId) return;

    const newRoutineData = { ...routineData };
    const task = newRoutineData.routine[dayIndex].tasks[taskIndex];
    task.completed = !task.completed;

    setRoutineData(newRoutineData); // Instant UI update

    // Silent background DB Update
    await supabase.from('study_routines')
      .update({ routine_data: newRoutineData })
      .eq('id', activeRoutineId);
      
    fetchHistory(); // Refresh progress in history list
  };

  const deleteRoutine = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('study_routines').delete().eq('id', id);
    if (activeRoutineId === id) {
      setActiveRoutineId(null);
      setRoutineData(null);
    }
    fetchHistory();
  };

  // Progress Calculator
  const getProgress = (data: any) => {
    if (!data?.routine) return 0;
    let total = 0, completed = 0;
    data.routine.forEach((day: any) => {
      day.tasks.forEach((task: any) => {
        total++;
        if (task.completed) completed++;
      });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-50 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-white bg-slate-950 lg:border lg:border-slate-200 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">
        
        {/* Left Panel: Inputs & History (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative">
          
          <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <CalendarDays size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-xs font-bold text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={submitPlanner} className="space-y-5">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.topicLabel}</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.topicPlaceholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-600 shadow-inner"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.dateLabel}</label>
              <input
                type="date"
                value={examDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-200 cursor-pointer"
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !topic.trim() || !examDate} className="w-full py-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-8 pt-8 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <History size={14} className="text-teal-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-600 font-medium text-center py-4 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                  {t.noHistory}
                </p>
              ) : (
                historyList.map((item) => {
                  const progress = getProgress(item.routine_data);
                  const isActive = activeRoutineId === item.id;
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => { setActiveRoutineId(item.id); setRoutineData(item.routine_data); }}
                      className={`group p-4 rounded-xl cursor-pointer transition-all shadow-sm border ${isActive ? 'bg-teal-500/10 border-teal-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-sm font-bold truncate pr-2 ${isActive ? 'text-teal-300' : 'text-slate-300'}`}>{item.topic}</h4>
                        <button onClick={(e) => deleteRoutine(item.id, e)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                        <span className="flex items-center gap-1"><Target size={10}/> {calculateDays(item.exam_date)} {t.daysLeft}</span>
                        <span className="text-teal-500">{progress}%</span>
                      </div>
                      
                      {/* Mini Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: The Checklist Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950 lg:bg-slate-50">
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-teal-500"><CalendarDays size={16}/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar p-0 lg:p-0 pb-40">
            {!routineData && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-10 animate-in zoom-in duration-500">
                <CalendarDays size={60} className="text-slate-300 lg:text-slate-300 mb-4" />
                <h3 className="text-2xl font-bold text-slate-400 lg:text-slate-400">{t.routineAwaits}</h3>
                <p className="text-slate-500 lg:text-slate-500 mt-2 max-w-sm">{t.awaitsDesc}</p>
              </div>
            ) : isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10">
                <Loader2 size={48} className="text-teal-500 animate-spin mb-4" />
                <p className="text-slate-500 font-bold">{t.generating}</p>
              </div>
            ) : (
              <div className="flex flex-col h-full relative">
                
                {/* Header */}
                <div className="bg-slate-900 lg:bg-white border-b border-slate-800 lg:border-slate-200 p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 shadow-sm z-10 sticky top-0 lg:static">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-200 lg:text-slate-800 tracking-tight mb-2">Mastery Plan</h2>
                    <p className="text-xs lg:text-sm font-bold text-slate-400 lg:text-slate-500 flex items-center gap-2"><Clock size={14} className="lg:w-4 lg:h-4"/> Daily tasks updated directly from database.</p>
                  </div>
                  <div className="text-left lg:text-right w-full lg:w-auto">
                    <p className="text-[10px] lg:text-xs font-black tracking-widest text-slate-400 uppercase mb-2">{t.overallProgress}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-full lg:w-32 bg-slate-800 lg:bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner flex-1 lg:flex-none">
                        <div className="bg-teal-500 h-3 rounded-full transition-all duration-700" style={{ width: `${getProgress(routineData)}%` }}></div>
                      </div>
                      <span className="text-sm lg:text-lg font-black text-teal-400 lg:text-teal-600">{getProgress(routineData)}%</span>
                    </div>
                  </div>
                </div>

              {/* Day by Day Checklist */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar space-y-4 lg:space-y-6">
                {routineData.routine.map((day: any, dIndex: number) => {
                  const dayCompleted = day.tasks.every((t: any) => t.completed);
                  
                  return (
                    <div key={dIndex} className={`bg-slate-900 lg:bg-white border rounded-2xl p-5 lg:p-6 transition-all duration-300 shadow-sm ${dayCompleted ? 'border-teal-500/30 lg:border-teal-200 bg-teal-500/10 lg:bg-teal-50/30' : 'border-slate-800 lg:border-slate-200'}`}>
                      <h3 className="text-base lg:text-lg font-black text-slate-200 lg:text-slate-800 mb-4 flex items-center gap-3">
                        <span className={`px-2.5 py-1 lg:px-3 lg:py-1 rounded-lg text-xs lg:text-sm ${dayCompleted ? 'bg-teal-500 text-white' : 'bg-slate-700 lg:bg-slate-800 text-white'}`}>Day {day.day}</span>
                        <span className={dayCompleted ? 'text-teal-400 lg:text-teal-700' : ''}>{day.title}</span>
                      </h3>
                      
                      <div className="space-y-2 lg:space-y-3">
                        {day.tasks.map((task: any, tIndex: number) => (
                          <div 
                            key={tIndex} 
                            onClick={() => toggleTask(dIndex, tIndex)}
                            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${task.completed ? 'bg-teal-500/10 lg:bg-teal-50 border-teal-500/30 lg:border-teal-200' : 'bg-slate-950 lg:bg-slate-50 border-slate-800 lg:border-slate-100 hover:border-slate-700 lg:hover:border-slate-300 hover:bg-slate-800 lg:hover:bg-slate-100'}`}
                          >
                            <div className="mt-0.5 shrink-0 transition-transform active:scale-75">
                              {task.completed ? <CheckCircle2 className="text-teal-400 lg:text-teal-500" size={18} /> : <Circle className="text-slate-500 lg:text-slate-300" size={18} />}
                            </div>
                            <p className={`font-medium text-xs lg:text-sm leading-snug transition-colors ${task.completed ? 'text-teal-400/70 lg:text-teal-700 line-through opacity-70' : 'text-slate-300 lg:text-slate-700'}`}>
                              {task.task}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="h-10"></div>
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
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all active:scale-95 border border-teal-400/50"
              >
                <Sparkles size={18} /> Create Planner
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
              {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-teal-400"/> {t.historyTitle}</> : <><Sparkles size={18} className="text-teal-400"/> New Planner</>}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {isMobileDrawerOpen === 'history' ? (
              <div className="space-y-3">
                {historyList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                ) : (
                  historyList.map(item => {
                    const progress = getProgress(item.routine_data);
                    const isActive = activeRoutineId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => { setActiveRoutineId(item.id); setRoutineData(item.routine_data); setIsMobileDrawerOpen('none'); }} 
                        className={`group p-4 bg-slate-950 border rounded-xl cursor-pointer hover:shadow-md transition-all ${isActive ? 'border-teal-500/50' : 'border-slate-800'}`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className={`font-bold text-sm truncate uppercase tracking-wide pr-2 ${isActive ? 'text-teal-300' : 'text-slate-200'}`}>{item.topic}</h4>
                          <button onClick={(e) => deleteRoutine(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mt-2">
                          <span className="flex items-center gap-1"><Target size={10}/> {calculateDays(item.exam_date)} {t.daysLeft}</span>
                          <span className="text-teal-500">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <form onSubmit={(e) => { submitPlanner(e); if(topic.trim() && examDate) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">{t.topicLabel}</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t.topicPlaceholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-600 shadow-inner"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">{t.dateLabel}</label>
                  <input
                    type="date"
                    value={examDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-teal-500/50 outline-none font-bold text-slate-200 cursor-pointer"
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading || !topic.trim() || !examDate} className="w-full py-4 mt-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all active:scale-95">
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
