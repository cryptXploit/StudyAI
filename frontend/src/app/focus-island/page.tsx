'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
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
  { name: "Chillhop Radio", url: "https://www.youtube.com/watch?v=5yx6BWlEVcY" },
  { name: "Synthwave Radio", url: "https://www.youtube.com/watch?v=4xDzrMQvE0s" },
  { name: "Space Lofi", url: "https://www.youtube.com/watch?v=1fueZCTYkpA" },
  { name: "Coffee Shop Lofi", url: "https://www.youtube.com/watch?v=e3L1PIY1lN8" },
  { name: "Japanese Lofi", url: "https://www.youtube.com/watch?v=-9gEgshJUuY" },
  { name: "Dark Academia Lofi", url: "https://www.youtube.com/watch?v=B11X7kR8E4Y" },
  { name: "Jazz Hop", url: "https://www.youtube.com/watch?v=kgx4WGK0oNU" },
  { name: "Gaming Lofi", url: "https://www.youtube.com/watch?v=GVC5dzZKqM8" },
  { name: "Rainy Night Lofi", url: "https://www.youtube.com/watch?v=7NOSDKb0HlU" }
];
const AMBIENT_SOUNDS = [
  { name: "Heavy Rain", url: "https://assets.mixkit.co/active_storage/sfx/1230/1230-preview.mp3" },
  { name: "Ocean Waves", url: "https://assets.mixkit.co/active_storage/sfx/1228/1228-preview.mp3" },
  { name: "Forest Birds", url: "https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3" },
  { name: "Thunderstorm", url: "https://assets.mixkit.co/active_storage/sfx/1297/1297-preview.mp3" },
  { name: "Crackling Fireplace", url: "https://assets.mixkit.co/active_storage/sfx/1310/1310-preview.mp3" },
  { name: "Windy Night", url: "https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3" },
  { name: "Coffee Shop Ambience", url: "https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3" },
  { name: "White Noise", url: "https://assets.mixkit.co/active_storage/sfx/2564/2564-preview.mp3" },
  { name: "Deep Space Drone", url: "https://assets.mixkit.co/active_storage/sfx/2583/2583-preview.mp3" },
  { name: "River Stream", url: "https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3" }
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
  // Multiplayer States
  const [roomCode, setRoomCode] = useState<string | null>(searchParams.get('room'));
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const lofiPlayerRef = useRef<any>(null);
  // 🟢 MOBILE UI STATES
  const scrollRef = useRef<HTMLDivElement>(null);
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
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
       transports: ['websocket', 'polling']
    });
    socket = newSocket;
    return () => { newSocket.disconnect(); };
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
    
    // Manage src imperatively to prevent uncatchable AbortErrors during React render
    if (!audio.src || !audio.src.includes(selectedAmbient)) {
      audio.src = selectedAmbient;
    }

    if (isRunning && ambientVolume > 0) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: any) => {
          // Safely catch any AbortErrors
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
         {/* Background Audio Engine - Rendered full size to bypass YouTube tiny-iframe blocking */}
         <div className="absolute inset-0 z-0 pointer-events-none">
           <ReactPlayer 
             ref={lofiPlayerRef}
             url={selectedLofi} 
             playing={isRunning && lofiVolume > 0} 
             volume={lofiVolume / 100} 
             width="100%" 
             height="100%"
             config={{
               youtube: {
                 playerVars: {
                   controls: 0,
                   rel: 0,
                   playsinline: 1,
                   origin: typeof window !== 'undefined' ? window.location.origin : 'https://www.prepia.app'
                 }
               }
             }}
             onReady={() => {
                // If it mounts while running, ensure it plays
                if (isRunning && lofiVolume > 0 && lofiPlayerRef.current) {
                   const player = lofiPlayerRef.current.getInternalPlayer();
                   if (player && player.playVideo) player.playVideo();
                }
             }}
           />
         </div>
         {/* Solid cover to completely hide the YouTube video visually */}
         <div className="absolute inset-0 z-[1] bg-slate-950 pointer-events-none"></div>
         <audio ref={ambientAudioRef} loop className="hidden" />

         {/* 🟢 Mobile Smart Header */}
         <div className={`lg:hidden fixed left-3 right-3 rounded-2xl flex items-center justify-between px-4 z-40 backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] h-[60px]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100">{t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
         </div>

         {/* 🟢 Main Island (Left/Center) */}
         <div ref={scrollRef} onScroll={handleScroll} className={`w-full ${roomCode ? 'lg:w-3/5' : 'lg:w-2/3'} flex-1 lg:flex-none p-6 md:p-8 pt-24 lg:pt-8 pb-28 lg:pb-8 flex flex-col items-center justify-between relative bg-slate-950 overflow-y-auto lg:overflow-hidden transition-all duration-300 custom-scrollbar min-h-screen lg:min-h-0`}>
            {/* Dopamine-releasing Animated Background */}
            <motion.div 
               animate={{ scale: [1, 1.05, 1], rotate: [0, 1, 0] }} 
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen" 
               style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-indigo-950/40 to-slate-950/80"></div>
            
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
               <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
               <div className="absolute bottom-[20%] right-[20%] w-[40vw] h-[40vw] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="w-full hidden lg:flex justify-between items-center z-10 mb-8 relative">
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">{t.title}</h2>
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest drop-shadow-md">{t.subtitle}</p>
               </motion.div>

               {!roomCode ? (
                 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={createRoom} className="bg-indigo-600/80 backdrop-blur-md hover:bg-indigo-500 border border-indigo-400/30 px-5 py-2.5 rounded-2xl font-black text-xs text-white flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all">
                    <Users size={16}/> Create Group Room
                 </motion.button>
               ) : (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-300 bg-indigo-900/50 px-4 py-2.5 rounded-2xl border border-indigo-500/30 backdrop-blur-md">
                       ROOM: {roomCode}
                    </span>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={inviteFriends} className="bg-emerald-600/80 backdrop-blur-md hover:bg-emerald-500 border border-emerald-400/30 px-5 py-2.5 rounded-2xl font-black text-xs text-white flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                       {copied ? <CheckCircle2 size={16}/> : <Share2 size={16}/>} {copied ? t.copied : t.invite}
                    </motion.button>
                 </motion.div>
               )}
            </div>

            {/* Giant Clock */}
            <div className="my-auto flex flex-col items-center z-10 relative">
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }} 
                 animate={{ scale: 1, opacity: 1 }} 
                 className={`text-8xl md:text-[140px] leading-none font-black font-mono tracking-tighter px-12 py-8 rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(79,70,229,0.15)] backdrop-blur-xl transition-all duration-500 ${isRunning ? 'text-white bg-white/5' : 'text-slate-400 bg-slate-900/50'}`}
               >
                  {formatTime(timeLeft)}
               </motion.div>

               <div className="flex gap-4 mt-12">
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(79,70,229,0.5)" }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => {
                       const willRun = !isRunning;
                       setIsRunning(willRun);
                       
                       // Synchronous play to bypass strict browser autoplay policies
                       if (willRun) {
                          if (lofiPlayerRef.current) {
                             const player = lofiPlayerRef.current.getInternalPlayer();
                             if (player && player.playVideo) player.playVideo();
                          }
                       } else {
                          if (lofiPlayerRef.current) {
                             const player = lofiPlayerRef.current.getInternalPlayer();
                             if (player && player.pauseVideo) player.pauseVideo();
                          }
                       }
                    }} 
                    className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-3xl flex items-center gap-3 shadow-[0_10px_40px_rgba(79,70,229,0.4)] border border-indigo-400/50 uppercase tracking-widest text-sm"
                  >
                     {isRunning ? <Pause size={20}/> : <Play size={20}/>} {isRunning ? t.pause : t.start}
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, rotate: 180 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => { setIsRunning(false); setTimeLeft(25 * 60); }} 
                    className="p-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-3xl backdrop-blur-md shadow-lg"
                  >
                     <RotateCcw size={20}/>
                  </motion.button>
               </div>
            </div>

            {/* Audio Mixer */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.2 }}
              className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 mt-12 lg:mt-0 relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 opacity-50"></div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <label className="text-[10px] md:text-xs font-black tracking-widest text-indigo-300 uppercase flex items-center gap-2"><Music size={14} className="text-indigo-400"/> {t.lofiTrack}</label>
                     <select value={selectedLofi} onChange={(e) => setSelectedLofi(e.target.value)} className="bg-slate-950/80 text-white text-[10px] font-bold outline-none rounded-xl px-3 py-1.5 border border-white/10 max-w-[140px] truncate shadow-inner focus:border-indigo-500 transition-all cursor-pointer">
                        {LOFI_STREAMS.map(stream => <option key={stream.url} value={stream.url}>{stream.name}</option>)}
                     </select>
                  </div>
                  <input type="range" min="0" max="100" value={lofiVolume} onChange={e => setLofiVolume(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all" />
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <label className="text-[10px] md:text-xs font-black tracking-widest text-violet-300 uppercase flex items-center gap-2"><CloudRain size={14} className="text-violet-400"/> {t.ambientSound}</label>
                     <select value={selectedAmbient} onChange={(e) => setSelectedAmbient(e.target.value)} className="bg-slate-950/80 text-white text-[10px] font-bold outline-none rounded-xl px-3 py-1.5 border border-white/10 max-w-[140px] truncate shadow-inner focus:border-violet-500 transition-all cursor-pointer">
                        {AMBIENT_SOUNDS.map(sound => <option key={sound.url} value={sound.url}>{sound.name}</option>)}
                     </select>
                  </div>
                  <input type="range" min="0" max="100" value={ambientVolume} onChange={e => setAmbientVolume(Number(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400 transition-all" />
               </div>
            </motion.div>
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
