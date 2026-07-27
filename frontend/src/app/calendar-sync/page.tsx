'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { CalendarRange, Sparkles, Loader2, History, CalendarCheck, Download, BellRing, Target, Clock, BookOpen, ShieldCheck, Trash2 } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import * as ics from 'ics';

export default function CalendarSyncPage() {
  const supabase = createClient();
  const [topic, setTopic] = useState('');
  const [examDate, setExamDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [schedule, setSchedule] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(10);

  // 🟢 MOBILE UI STATES
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'history'|'config'>('none');
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

  useEffect(() => { fetchHistory(); }, []);

  // 🟢 AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchHistory = async () => {
    const cachedHistory = sessionStorage.getItem('Prepia_calendar_history');
    if (cachedHistory) {
      setHistory(JSON.parse(cachedHistory));
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data, error } = await supabase.from('calendar_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("🔥 Supabase Fetch Error:", error.message);
        return;
      }
      if (data) {
        setHistory(data);
        sessionStorage.setItem('Prepia_calendar_history', JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !examDate || isLoading) return;

    // 🟢 LIMIT PROTECTOR: Prevent requesting massive routines (> 90 days)
    const daysLeft = Math.ceil((new Date(examDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (daysLeft > 90) {
      alert("Please select an exam date within 90 days for optimal AI performance.");
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
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/calendar-sync/generate` : `${apiUrlBase}/api/calendar-sync/generate`;

      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, examDate, language: 'English' }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (res.status === 402) {
        const errData = await res.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 10);
            setShowTokenModal(true);
            setIsLoading(false);
            return;
        }
      }

      const data = await res.json();

      if (data.error) throw new Error(data.error);
      if (data.valid && data.schedule) {
        setSchedule(data.schedule);
        refreshTokens();
        sessionStorage.removeItem('Prepia_calendar_history'); // 🟢 Bust Cache
        setTimeout(() => fetchHistory(), 1500); // Instantly update sidebar history
      } else {
        throw new Error("Failed to process schedule data.");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showPublicError();
      } else {
        showPublicError();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🟢 FIXED: Safe deletion with Cache Busting
  const deleteRoutine = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('calendar_routines').delete().eq('id', id);
      sessionStorage.removeItem('Prepia_calendar_history');
      fetchHistory();
    } catch(err) {
      console.error("Deletion Error:", err);
    }
  };

  const downloadICS = () => {
    if (!schedule?.routine) return;
    const events = schedule.routine.map((item: any) => {
      const dateParts = item.date.split('-').map(Number);
      const startParts = item.startTime.split(':').map(Number);
      const endParts = item.endTime.split(':').map(Number);
      return {
        start: [dateParts[0], dateParts[1], dateParts[2], startParts[0], startParts[1]],
        end: [dateParts[0], dateParts[1], dateParts[2], endParts[0], endParts[1]],
        title: `📚 Study: ${item.task}`,
        description: item.description,
        alarms: [{ action: 'display', trigger: { minutes: 15, before: true } }]
      };
    });

    ics.createEvents(events as any, (error, value) => {
      if (error) {
        alert("Failed to compile calendar file.");
        return;
      }
      const blob = new Blob([value], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Study-Routine-${topic.replace(/\s+/g, '-')}.ics`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <SecureLayout>
      <OutOfTokensModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        requiredTokens={requiredTokensForModal}
      />
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-950 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-slate-950 bg-slate-950 lg:border lg:border-slate-700 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">

        {/* Left Panel: Premium Inputs & History (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative z-10">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> PRO TIER FEATURE
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <CalendarCheck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">Smart Sync</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1-Click Calendar Planner</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5 mb-8">
            <div className="group">
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Target size={12}/> Target Subject</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <BookOpen size={16} className="text-slate-500 group-focus-within:text-indigo-500 transition-colors"/>
                 </div>
                 <input
                   type="text"
                   value={topic}
                   onChange={e => setTopic(e.target.value)}
                   placeholder="e.g., Final Physics Exam..."
                   className="w-full pl-11 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 placeholder:text-slate-300 shadow-inner transition-all"
                   required
                 />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Clock size={12}/> Exam Date</label>
              <input
                type="date"
                value={examDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => setExamDate(e.target.value)}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 cursor-pointer shadow-inner transition-all custom-date-picker"
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !topic.trim() || !examDate} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-400 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? "Crafting Strategy..." : "Generate Roadmap"}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-auto pt-6 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
              <History size={14} className="text-indigo-400" /> Saved Routines
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-900 rounded-xl">No routines created yet.</p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setSchedule(item.schedule_data); setTopic(item.topic); }}
                    className="group p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/40 flex justify-between items-center transition-all"
                  >
                    <div>
                       <p className="text-sm font-bold text-slate-300 truncate max-w-[180px]">{item.topic}</p>
                       <p className="text-[10px] text-slate-500 font-mono mt-0.5">Deadline: {item.exam_date}</p>
                    </div>
                    <button onClick={(e) => deleteRoutine(item.id, e)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Premium Interactive Roadmap */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-indigo-900/90 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-indigo-400"><CalendarCheck size={16}/> Smart Sync</h2>
              <p className="text-[9px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-widest">1-Click Calendar Planner</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col p-0 relative bg-slate-950">

          {!schedule && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-10">
              <CalendarRange size={80} className="text-slate-300 mb-6" />
              <h3 className="text-3xl font-black text-slate-400">Roadmap Awaits</h3>
              <p className="text-slate-500 mt-2 max-w-sm">Set your exam date and subject on the left to generate a strict, master study schedule.</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Building Strategy...</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in duration-700 bg-slate-950">

               {/* Aesthetic Header */}
               <div className="p-8 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-200 mb-1">{topic} Mastery Plan</h2>
                    <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest flex items-center gap-1"><Target size={12}/> {schedule.routine.length} Days of focused study</p>
                  </div>
                  <button onClick={downloadICS} className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <Download size={18} className="text-indigo-400"/> Sync to Mobile
                  </button>
               </div>

               {/* Timeline Engine Viewport */}
               <div className="flex-1 w-full relative py-8 px-12 overflow-y-auto custom-scrollbar">
                  <div className="max-w-3xl mx-auto relative">
                     {/* Vertical Timeline Line */}
                     <div className="absolute top-0 bottom-0 left-[39px] w-[2px] bg-slate-700 z-0"></div>

                     <div className="space-y-6 relative z-10">
                        {schedule.routine.map((day: any, i: number) => (
                          <div key={i} className="flex gap-6 group">
                            {/* Date & Dot Column */}
                            <div className="flex flex-col items-center shrink-0 w-20">
                               <div className="w-10 h-10 rounded-full bg-slate-900 border-4 border-slate-800 group-hover:border-indigo-100 flex items-center justify-center shadow-sm transition-colors z-10 relative">
                                  <div className="w-3 h-3 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></div>
                               </div>
                               <div className="mt-2 text-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DAY {i+1}</p>
                                  <p className="text-xs font-bold text-slate-400">{day.date.split('-').slice(1).join('/')}</p>
                               </div>
                            </div>

                            {/* Content Card */}
                            <div className="flex-1 bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-sm group-hover:shadow-md group-hover:border-indigo-200 transition-all flex flex-col justify-center relative overflow-hidden">
                               <div className="absolute top-0 left-0 w-1 h-full bg-slate-700 group-hover:bg-indigo-500 transition-colors"></div>
                               <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-lg font-black text-slate-200">{day.task}</h4>
                                  <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                                     <Clock size={12} className="text-indigo-400"/>
                                     <span className="text-[11px] font-bold text-slate-400 font-mono">{day.startTime} - {day.endTime}</span>
                                  </div>
                               </div>
                               <p className="text-sm font-medium text-slate-500 leading-relaxed">{day.description}</p>
                               <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  <BellRing size={12}/> Reminder will trigger 15m before
                               </div>
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="h-16" />
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
                <History size={16}/> Saved
              </button>

              <button
                onClick={() => setIsMobileDrawerOpen('config')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all active:scale-95 border border-indigo-400/50"
              >
                <Sparkles size={18} /> New Strategy
              </button>
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
                {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-indigo-400"/> Saved Routines</> : <><Sparkles size={18} className="text-indigo-400"/> New Strategy</>}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
              {isMobileDrawerOpen === 'history' ? (
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">No routines created yet.</p>
                  ) : (
                    history.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSchedule(item.schedule_data);
                          setTopic(item.topic);
                          setIsMobileDrawerOpen('none');
                        }}
                        className="group p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
                      >
                        <div>
                           <p className="text-sm font-bold text-slate-200 truncate max-w-[180px] group-hover:text-indigo-300 transition-colors">{item.topic}</p>
                           <p className="text-[10px] text-slate-500 font-mono mt-0.5">Deadline: {item.exam_date}</p>
                        </div>
                        <button onClick={(e) => deleteRoutine(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <form onSubmit={(e) => { handleGenerate(e); if(topic.trim() && examDate) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                  <div className="group">
                    <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Target size={12}/> Target Subject</label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <BookOpen size={16} className="text-slate-500 group-focus-within:text-indigo-500 transition-colors"/>
                       </div>
                       <input
                         type="text"
                         value={topic}
                         onChange={e => setTopic(e.target.value)}
                         placeholder="e.g., Final Physics Exam..."
                         className="w-full pl-11 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 placeholder:text-slate-300 shadow-inner transition-all"
                         required
                       />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Clock size={12}/> Exam Date</label>
                    <input
                      type="date"
                      value={examDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => setExamDate(e.target.value)}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-200 cursor-pointer shadow-inner transition-all custom-date-picker"
                      required
                    />
                  </div>

                  <button type="submit" disabled={isLoading || !topic.trim() || !examDate} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-400 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 mt-4">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isLoading ? "Crafting Strategy..." : "Generate Roadmap"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        </div>
      </div>
    </SecureLayout>
  );
}
