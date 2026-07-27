'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Play, Pause, RotateCcw, Volume2, Pin, CheckCircle2, History, ShieldCheck, Music, CloudRain, Users, Share2, AlertTriangle } from 'lucide-react';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
import io from 'socket.io-client';

const translations = {
  English: {
    title: "Focus Island",
    subtitle: "A premium lo-fi animated sanctuary for deep work",
    start: "Start Focus", pause: "Pause", reset: "Reset",
    pinLabel: "Pin Cheat-Sheet", pinPlaceholder: "Type important formulas to keep pinned...",
    historyTitle: "Focus Log", minutes: "mins", saved: "Session logged!",
    invite: "Invite Friends", roomCode: "Room Code: ", copied: "Copied!",
    friends: "Friends on Island", distracted: "Distracted!",
    lofiTrack: "Lo-fi Track", ambientSound: "Ambient Sound"
  },
  Bangla: {
    title: "ফোকাস আইল্যান্ড",
    subtitle: "গভীর পড়াশোনার জন্য একটি প্রিমিয়াম অ্যানিমেটেড পরিবেশ",
    start: "ফোকাস শুরু করুন", pause: "বিরতি", reset: "রিসেট",
    pinLabel: "চিট-শিট পিন করুন", pinPlaceholder: "পড়ার সময় চোখের সামনে রাখার জন্য সূত্র লিখুন...",
    historyTitle: "ফোকাস হিস্ট্রি", minutes: "মিনিট", saved: "সেশন সেভ হয়েছে!",
    invite: "বন্ধুদের ইনভাইট দিন", roomCode: "রুম কোড: ", copied: "কপি হয়েছে!",
    friends: "আইল্যান্ডে বন্ধুরা", distracted: "ফাঁকি দিচ্ছে!",
    lofiTrack: "লো-ফাই ট্র্যাক", ambientSound: "এম্বিয়েন্ট সাউন্ড"
  },
  Hindi: {
    title: "फोकस आइलैंड",
    subtitle: "गहरे अध्ययन के लिए एनिमेटेड अभयारण्य",
    start: "फोकस शुरू करें", pause: "विराम", reset: "रिसेट",
    pinLabel: "चीट-शीट पिन करें", pinPlaceholder: "महत्वपूर्ण सूत्रों को पिन करने के लिए लिखें...",
    historyTitle: "फोकस इतिहास", minutes: "मिनट", saved: "सत्र सहेजा गया!",
    invite: "दोस्तों को आमंत्रित करें", roomCode: "रूम कोड: ", copied: "कॉपी हो गया!",
    friends: "द्वीप पर दोस्त", distracted: "विचलित!",
    lofiTrack: "लो-फ़ाई ट्रैक", ambientSound: "एम्बिएंट साउंड"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const LOFI_STREAMS = [
  { name: "Lofi Girl (Chill Beats)", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { name: "Chillhop Radio", url: "https://www.youtube.com/watch?v=5yx6BWlEVcY" }
];
const AMBIENT_SOUNDS = [
  { name: "Heavy Rain", url: "https://assets.mixkit.co/active_storage/sfx/1230/1230-preview.mp3" },
  { name: "Ocean Waves", url: "https://assets.mixkit.co/active_storage/sfx/1228/1228-preview.mp3" }
];

let socket: any;

function FocusIslandContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Focus States
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [pinnedText, setPinnedText] = useState('');
  const [isPinned, setIsPinned] = useState(false); // 🟢 Pinned State

  // Audio States
  const [lofiVolume, setLofiVolume] = useState(30);
  const [ambientVolume, setAmbientVolume] = useState(30);
  const [selectedLofi, setSelectedLofi] = useState(LOFI_STREAMS[0].url);
  const [selectedAmbient, setSelectedAmbient] = useState(AMBIENT_SOUNDS[0].url);

  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | any>(null); // 🟢 AbortError Tracker

  // Multiplayer States
  const [roomCode, setRoomCode] = useState<string | null>(searchParams.get('room'));
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as LanguageType);

    // Load Pinned Note
    const savedNote = localStorage.getItem('focus_pinned_note');
    if (savedNote) {
      setPinnedText(savedNote);
      setIsPinned(true);
    }

    // Connect Socket
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    return () => { if (socket) socket.disconnect(); };
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data } = await supabase.from('focus_sessions').select('*').eq('user_id', user.id).order('completed_at', { ascending: false });
      if (data) setHistory(data);

      // Auto-join room if URL has ?room=...
      if (roomCode) {
        socket.emit('join-room', { roomCode, user: { id: user.id, name: user.email?.split('@')[0] } });
      }
    }
  };

  // 🟢 SMART VISIBILITY API (Anti-Distraction Tracker)
  useEffect(() => {
    const handleVisibility = () => {
       if (roomCode && currentUser) {
          const isFocused = !document.hidden;
          socket.emit('tab-status', { roomCode, userId: currentUser.id, isFocused });
       }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    socket.on('room-update', (users: any) => { setRoomUsers(users); });

    return () => {
       document.removeEventListener('visibilitychange', handleVisibility);
       socket.off('room-update');
    };
  }, [roomCode, currentUser]);

  // Audio Sync
  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio) return;

    audio.volume = ambientVolume / 100;

    if (isRunning && ambientVolume > 0) {
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch((error: any) => {
          // Ignore AbortError caused by rapid play/pause toggling
          if (error.name !== 'AbortError') console.log("Audio play error:", error);
        });
      }
    } else {
      audio.pause();
    }
  }, [isRunning, ambientVolume, selectedAmbient]);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      logSession(25);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const logSession = async (mins: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/focus/log` : `${apiUrlBase}/api/focus/log`;

      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ durationMinutes: mins })
      });
      fetchData();
    } catch (error) {
      console.error("Failed to log session:", error);
    }
  };

  const createRoom = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/focus/create-room` : `${apiUrlBase}/api/focus/create-room`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.success) {
        setRoomCode(data.roomCode);
        window.history.pushState(null, '', `?room=${data.roomCode}`);
        socket.emit('join-room', { roomCode: data.roomCode, user: { id: currentUser.id, name: currentUser.email?.split('@')[0] } });
      }
    } catch (error: any) {
      showPublicError();
    }
  };

  const inviteFriends = () => {
    navigator.clipboard.writeText(`${window.location.origin}/focus-island?room=${roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  if (!isMounted) return null;

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-80px)] max-w-7xl mx-auto bg-slate-950 lg:bg-slate-50 lg:border lg:border-slate-200 lg:rounded-3xl overflow-hidden mt-0 lg:mt-4 shadow-sm relative min-h-screen lg:min-h-0">
         <div className="hidden">
           <ReactPlayer {...({ url: selectedLofi, playing: isRunning && lofiVolume > 0, volume: lofiVolume / 100, loop: true, width: "0", height: "0" } as any)} />
           <audio ref={ambientAudioRef} src={selectedAmbient} loop />
         </div>

         {/* 🟢 Mobile Smart Header */}
         <div className={`lg:hidden fixed left-3 right-3 rounded-2xl flex items-center justify-between px-4 z-40 backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] h-[60px]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100">{t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
         </div>

         {/* 🟢 Main Island (Left/Center) */}
         <div ref={scrollRef} onScroll={handleScroll} className={`w-full ${roomCode ? 'lg:w-3/5' : 'lg:w-2/3'} flex-1 lg:flex-none p-6 md:p-8 pt-24 lg:pt-8 pb-28 lg:pb-8 flex flex-col items-center justify-between relative bg-gradient-to-b from-slate-900 to-indigo-950 overflow-y-auto lg:overflow-hidden transition-all duration-300 custom-scrollbar min-h-screen lg:min-h-0`}>
            <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-40 animate-pulse" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80')" }}></div>

            <div className="w-full hidden lg:flex justify-between items-center z-10 mb-8">
               <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{t.title}</h2>
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">{t.subtitle}</p>
               </div>

               {!roomCode ? (
                 <button onClick={createRoom} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl font-black text-xs text-white flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <Users size={16}/> Create Group Room
                 </button>
               ) : (
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-300 bg-indigo-900/50 px-3 py-2 rounded-xl border border-indigo-500/30">
                       ROOM: {roomCode}
                    </span>
                    <button onClick={inviteFriends} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl font-black text-xs text-white flex items-center gap-2 shadow-lg transition-all active:scale-95">
                       {copied ? <CheckCircle2 size={16}/> : <Share2 size={16}/>} {copied ? t.copied : t.invite}
                    </button>
                 </div>
               )}
            </div>

            {/* Giant Clock */}
            <div className="my-auto flex flex-col items-center z-10">
               <div className="text-8xl md:text-9xl font-black font-mono text-white tracking-tighter bg-white/10 backdrop-blur-md px-12 py-8 rounded-[40px] border border-white/20 shadow-2xl shadow-indigo-500/20">
                  {formatTime(timeLeft)}
               </div>

               <div className="flex gap-4 mt-8">
                  <button onClick={() => setIsRunning(!isRunning)} className="px-10 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95">
                     {isRunning ? <Pause size={18}/> : <Play size={18}/>} {isRunning ? t.pause : t.start}
                  </button>
                  <button onClick={() => { setIsRunning(false); setTimeLeft(25 * 60); }} className="p-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl transition-all backdrop-blur-md">
                     <RotateCcw size={18}/>
                  </button>
               </div>
            </div>

            {/* Audio Mixer */}
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-8 lg:mt-0">
               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                     <label className="text-[10px] font-black tracking-widest text-indigo-200 uppercase flex items-center gap-1"><Music size={12}/> {t.lofiTrack}</label>
                     <select value={selectedLofi} onChange={(e) => setSelectedLofi(e.target.value)} className="bg-slate-900/50 text-white text-[10px] font-bold outline-none rounded-md px-2 py-1 border border-white/10 max-w-[120px] truncate">
                        {LOFI_STREAMS.map(stream => <option key={stream.url} value={stream.url}>{stream.name}</option>)}
                     </select>
                  </div>
                  <input type="range" min="0" max="100" value={lofiVolume} onChange={e => setLofiVolume(Number(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-400" />
               </div>

               <div className="space-y-3">
                  <div className="flex justify-between items-center">
                     <label className="text-[10px] font-black tracking-widest text-indigo-200 uppercase flex items-center gap-1"><CloudRain size={12}/> {t.ambientSound}</label>
                     <select value={selectedAmbient} onChange={(e) => setSelectedAmbient(e.target.value)} className="bg-slate-900/50 text-white text-[10px] font-bold outline-none rounded-md px-2 py-1 border border-white/10 max-w-[120px] truncate">
                        {AMBIENT_SOUNDS.map(sound => <option key={sound.url} value={sound.url}>{sound.name}</option>)}
                     </select>
                  </div>
                  <input type="range" min="0" max="100" value={ambientVolume} onChange={e => setAmbientVolume(Number(e.target.value))} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-400" />
               </div>
            </div>
         </div>

         {/* Mobile Floating Input Dock */}
         <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
              <button
                onClick={() => setIsMobileDrawerOpen('history')}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[13px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white shrink-0"
              >
                <History size={16}/> Logs
              </button>

              <button
                onClick={() => setIsMobileDrawerOpen('config')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 border border-indigo-400/50"
              >
                <Pin size={18} /> Notes & Room
              </button>
            </div>
         </div>

         {/* 🟢 Right Side Panels (Desktop Only) */}
         <div className={`hidden lg:flex ${roomCode ? 'w-2/5' : 'w-1/3'} bg-white p-0 border-l border-slate-200 flex-col transition-all duration-300`}>

            {/* MULTIPLAYER ZONE */}
            {roomCode && (
               <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5 mb-4"><Users size={14} className="text-indigo-500"/> {t.friends}</h3>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto custom-scrollbar">
                     {roomUsers.map((u, i) => (
                        <div key={i} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${u.isFocused ? 'bg-white border-emerald-200 shadow-sm' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                           <p className={`text-xs font-black truncate ${u.isFocused ? 'text-slate-700' : 'text-red-600'}`}>{u.name}</p>
                           {!u.isFocused && <AlertTriangle size={14} className="text-red-500"/>}
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* 🟢 PINNED NOTES (Saved in LocalStorage) */}
            <div className="p-6 flex-1 flex flex-col">
               <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                     <Pin size={14} className="text-rose-500"/> {t.pinLabel}
                  </h3>
                  <button
                    onClick={() => {
                       if (isPinned) {
                          setIsPinned(false); // Enable editing
                       } else {
                          localStorage.setItem('focus_pinned_note', pinnedText);
                          setIsPinned(true); // Lock and Save
                       }
                    }}
                    className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm ${isPinned ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                  >
                    {isPinned ? "Edit Note" : "Save Pin"}
                  </button>
               </div>

               <textarea
                 value={pinnedText}
                 onChange={e => setPinnedText(e.target.value)}
                 placeholder={t.pinPlaceholder}
                 disabled={isPinned}
                 className={`w-full flex-1 p-4 border rounded-2xl outline-none font-medium text-sm resize-none transition-all duration-300 ${isPinned ? 'bg-rose-50/40 border-rose-100 text-slate-600 cursor-default shadow-inner' : 'bg-rose-50 border-rose-200 text-slate-800 focus:ring-1 focus:ring-rose-300 shadow-sm'}`}
               />
            </div>
         </div>

         {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
         <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
                {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-indigo-400"/> {t.historyTitle}</> : <><Pin size={18} className="text-indigo-400"/> Room & Notes</>}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar flex flex-col gap-6">
              {isMobileDrawerOpen === 'history' ? (
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">No focus sessions yet.</p>
                  ) : (
                    history.map(item => (
                      <div key={item.id} className="group p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-2 pr-2">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0"/>
                          <p className="text-sm font-bold text-slate-300">{item.duration_minutes} {t.minutes}</p>
                        </div>
                        <p className="text-xs text-slate-500">{new Date(item.completed_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
                     {!roomCode ? (
                       <button onClick={createRoom} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                          <Users size={16}/> Create Group Room
                       </button>
                     ) : (
                       <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between bg-indigo-900/20 p-3 rounded-xl border border-indigo-500/20">
                             <span className="text-xs font-black text-indigo-300 uppercase">ROOM: {roomCode}</span>
                             <button onClick={inviteFriends} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg font-black text-xs text-white flex items-center gap-2 transition-all">
                                {copied ? <CheckCircle2 size={14}/> : <Share2 size={14}/>} {copied ? t.copied : t.invite}
                             </button>
                          </div>
                          {roomUsers.length > 0 && (
                            <div>
                               <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Users size={12}/> {t.friends}</p>
                               <div className="flex flex-wrap gap-2">
                                  {roomUsers.map((u, i) => (
                                     <span key={i} className={`text-[10px] font-bold px-2 py-1 rounded-md border ${u.isFocused ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-red-900/30 border-red-500/50 text-red-400'}`}>
                                        {u.name} {!u.isFocused && '!'}
                                     </span>
                                  ))}
                               </div>
                            </div>
                          )}
                       </div>
                     )}
                  </div>

                  <div className="flex-1 flex flex-col bg-slate-950 p-5 rounded-2xl border border-slate-800 min-h-[250px]">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                           <Pin size={14} className="text-rose-500"/> {t.pinLabel}
                        </h3>
                        <button
                          onClick={() => {
                             if (isPinned) setIsPinned(false);
                             else { localStorage.setItem('focus_pinned_note', pinnedText); setIsPinned(true); }
                          }}
                          className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm ${isPinned ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                        >
                          {isPinned ? "Edit" : "Save"}
                        </button>
                     </div>
                     <textarea
                       value={pinnedText}
                       onChange={e => setPinnedText(e.target.value)}
                       placeholder={t.pinPlaceholder}
                       disabled={isPinned}
                       className={`w-full flex-1 p-4 border rounded-xl outline-none font-medium text-sm resize-none transition-all duration-300 ${isPinned ? 'bg-slate-900/50 border-slate-800 text-slate-400 cursor-default' : 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500'}`}
                     />
                  </div>
                </>
              )}
            </div>
          </div>
         </div>
      </div>
  );
}

export default function Page() {
  return (
    <SecureLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-indigo-500 font-black">Loading Island...</div>}>
        <FocusIslandContent />
      </Suspense>
    </SecureLayout>
  );
}
