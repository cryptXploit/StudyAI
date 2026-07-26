'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Gift, Clock, Play, Users, Trophy, Loader2, Copy, CheckCircle2, ChevronRight, Zap, AlertTriangle, Swords } from 'lucide-react';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const translations = {
  English: {
    waiting: "Waiting for players...", 
    hostStart: "Submit & Start Battle",
    invite: "Invite Friends to Battle", 
    code: "Room Code:",
    question: "Question", 
    score: "Score", 
    leaderboard: "Live Leaderboard",
    correct: "Correct!", 
    wrong: "Wrong!", 
    waitNext: "Waiting for host...",
    nextQ: "Next Question", 
    finish: "Finish Battle", 
    finalScore: "Final Rankings",
    winner: "Winner!", 
    joinBattle: "Join a Battle", 
    enterCode: "Enter Room Code",
    secureRewards: "Secure Rewards", 
    loginToSecure: "Login to Secure Rewards",
    join: "Join Arena", 
    orCreate: "or Create your own battle"
  },
  Bangla: {
    waiting: "খেলোয়াড়দের জন্য অপেক্ষা...", 
    hostStart: "সাবমিট ও শুরু করুন",
    invite: "বন্ধুদের ইনভাইট দিন", 
    code: "রুম কোড:",
    question: "প্রশ্ন", 
    score: "স্কোর", 
    leaderboard: "লাইভ লিডারবোর্ড",
    correct: "সঠিক!", 
    wrong: "ভুল!", 
    waitNext: "হোস্টের জন্য অপেক্ষা...",
    nextQ: "পরবর্তী প্রশ্ন", 
    finish: "ব্যাটেল শেষ করুন", 
    finalScore: "ফাইনাল র‍্যাংকিং",
    winner: "বিজয়ী!", 
    joinBattle: "ব্যাটেল-এ যোগ দিন", 
    enterCode: "রুম কোড লিখুন",
    secureRewards: "রিওয়ার্ড সুরক্ষিত করুন", 
    loginToSecure: "লগইন করে সুরক্ষিত করুন",
    join: "প্রবেশ করুন", 
    orCreate: "অথবা নিজের কুইজ তৈরি করুন"
  },
  Hindi: {
    waiting: "खिलाड़ियों की प्रतीक्षा...", 
    hostStart: "सबमिट करें और शुरू करें",
    invite: "दोस्तों को आमंत्रित करें", 
    code: "रूम कोड:",
    question: "प्रश्न", 
    score: "स्कोर", 
    leaderboard: "लाइव लीडरबोर्ड",
    correct: "सही!", 
    wrong: "गलत!", 
    waitNext: "होस्ट की प्रतीक्षा...",
    nextQ: "अगला प्रश्न", 
    finish: "युद्ध समाप्त करें", 
    finalScore: "अंतिम रैंकिंग",
    winner: "विजेता!", 
    joinBattle: "युद्ध में शामिल हों", 
    enterCode: "रूम कोड दर्ज करें",
    secureRewards: "इनाम सुरक्षित करें", 
    loginToSecure: "सुरक्षित करने के लिए लॉगिन करें",
    join: "शामिल हों", 
    orCreate: "या अपना स्वयं का बनाएं"
  }
};

function BattleArenaContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomCode = searchParams.get('room');

  const [language, setLanguage] = useState<'English'|'Bangla'|'Hindi'>('English');
  const t = translations[language];

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [battleData, setBattleData] = useState<any>(null);
  const [gameState, setGameState] = useState<any>({ players: [], currentQuestion: 0, status: 'loading' });
  const [copied, setCopied] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerStatus, setAnswerStatus] = useState<'correct'|'wrong'|null>(null);
  const [timeLeft, setTimeLeft] = useState(15); 
  
  const [manualCode, setManualCode] = useState('');

  // 🟢 MOBILE UI STATES
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'leaderboard'>('none');
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

  // 🟢 SOCKET MEMORY LEAK FIX: Encapsulated socket inside a ref to prevent global lingering listeners
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as any);
    
    if (!roomCode) return;

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '');
    socketRef.current = io(socketUrl, {
       transports: ['websocket'], 
       upgrade: false
    });
    
    initBattle();

    return () => { 
      if (socketRef.current) socketRef.current.disconnect(); 
    };
  }, [roomCode]);

  useEffect(() => {
    if (gameState.status === 'playing' && !hasAnswered && timeLeft > 0 && gameState.currentQuestion !== 'finished') {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !hasAnswered && gameState.currentQuestion !== 'finished') {
       handleAnswer("TIMEOUT");
    }
  }, [gameState.status, hasAnswered, timeLeft, gameState.currentQuestion]);

  useEffect(() => {
     setTimeLeft(15);
     setHasAnswered(false);
     setAnswerStatus(null);
  }, [gameState.currentQuestion]);

  const initBattle = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let tempUser;
    if (session?.user) {
      tempUser = { id: session.user.id, name: session.user.email?.split('@')[0], isGuest: false };
    } else {
      tempUser = { id: `guest_${Date.now()}`, name: `Guest_${Math.floor(Math.random()*1000)}`, isGuest: true };
    }
    setCurrentUser(tempUser);
    let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/battle2/${roomCode}` : `${apiUrlBase}/api/battle2/${roomCode}`;

    // 🟢 CONNECTION PROTECTOR: 10s Timeout for loading the battle
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(apiUrl, { 
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      
      if (data.success) {
        setBattleData(data.battle);
        if (socketRef.current) {
          socketRef.current.on('battle-update', (state: any) => { setGameState(state); });
          socketRef.current.emit('join-battle', { roomCode, user: { id: tempUser.id, name: tempUser.name } });
        }
      } else if (data.expired) {
        alert("⏳ This battle link has expired! Keys are only valid for 1 hour.");
        router.push('/quiz');
      } else {
        alert("Battle Room not found!"); router.push('/quiz'); 
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        alert("Timeout: Server took too long to load the battle arena.");
      }
      router.push('/quiz'); 
    }
  };

  const startGame = () => { 
    if (socketRef.current) socketRef.current.emit('start-battle', { roomCode }); 
  };

  const handleAnswer = (selectedOption: string) => {
    if (hasAnswered || gameState.currentQuestion === 'finished') return;
    
    setHasAnswered(true);
    const currentQ = battleData.quiz_data[gameState.currentQuestion];
    
    if (!currentQ) return; 

    const isCorrect = selectedOption === currentQ.correctAnswer;
    setAnswerStatus(isCorrect ? 'correct' : 'wrong');
    
    const timeBonus = Math.floor((timeLeft / 15) * 50);
    if (socketRef.current) {
      socketRef.current.emit('submit-answer', { roomCode, userId: currentUser.id, isCorrect, timeBonus });
    }
  };

  const nextQuestion = () => {
    if (socketRef.current) {
      if (gameState.currentQuestion < battleData.quiz_data.length - 1) {
        socketRef.current.emit('next-question', { roomCode, questionIndex: gameState.currentQuestion + 1 });
      } else {
        socketRef.current.emit('next-question', { roomCode, questionIndex: 'finished' });
      }
    }
  };

  const secureMyRewards = () => {
    const myFinalScore = gameState.players.find((p:any) => p.id === currentUser?.id)?.score || 0;
    localStorage.setItem('pending_reward_room', roomCode || '');
    localStorage.setItem('pending_reward_score', myFinalScore.toString());

    if (currentUser?.isGuest) {
      router.push('/signup'); 
    } else {
      router.push('/dashboard'); 
    }
  };

  if (!roomCode) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-8 relative overflow-hidden bg-slate-950 mt-4 rounded-3xl shadow-2xl border border-slate-800">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
         <Swords size={72} className="text-indigo-500 mb-6 z-10" />
         <h1 className="text-4xl md:text-5xl font-black text-white mb-4 z-10 tracking-tight">{t.joinBattle}</h1>
         <p className="text-slate-400 mb-8 z-10 font-bold">{t.enterCode}</p>
         
         <div className="z-10 flex flex-col md:flex-row items-center gap-4 w-full max-w-md">
            <input 
              type="text" 
              placeholder="e.g. A7B9XX" 
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())} 
              className="w-full px-6 py-4 bg-slate-900 border border-slate-700 text-emerald-400 font-black text-2xl rounded-2xl outline-none focus:border-indigo-500 text-center uppercase tracking-widest transition-all" 
              maxLength={6}
            />
            <button 
              onClick={() => { if(manualCode.length > 2) router.push(`/battle-arena?room=${manualCode}`) }} 
              className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              disabled={manualCode.length < 3}
            >
              {t.join}
            </button>
         </div>
         
         <p className="text-slate-500 mt-8 z-10 font-bold">
            {t.orCreate.split(' ')[0]} <span className="text-indigo-400 cursor-pointer hover:text-indigo-300 underline" onClick={() => router.push('/quiz')}>{t.orCreate.substring(t.orCreate.indexOf(' ') + 1)}</span>
         </p>
      </div>
    );
  }

  if (!battleData || gameState.status === 'loading') return <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-slate-950 text-indigo-400 mt-4 rounded-3xl"><Loader2 className="animate-spin" size={48} /></div>;

  const isHost = battleData.host_id === currentUser?.id;
  const currentQ = battleData.quiz_data[gameState.currentQuestion];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-100 mt-4 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col relative font-sans">
      
      {/* WAITING ROOM */}
      {gameState.status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950"></div>
           
           <div className="z-10 text-center mb-12">
              <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/30">
                 <Users size={48} className="text-indigo-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">{t.invite}</h1>
              <div className="flex items-center justify-center gap-4 bg-slate-900 border border-slate-700 px-6 py-4 rounded-2xl shadow-xl">
                 <span className="text-slate-400 font-bold uppercase tracking-widest">{t.code}</span>
                 <span className="text-4xl font-black text-emerald-400 tracking-widest">{roomCode}</span>
                 <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false),2000); }} className="ml-4 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all">
                    {copied ? <CheckCircle2 className="text-emerald-400"/> : <Copy />}
                 </button>
              </div>
           </div>

           <div className="z-10 w-full max-w-2xl">
              <div className="flex flex-wrap justify-center gap-4">
                 {gameState.players.map((p: any, i: number) => (
                    <div key={i} className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-full font-bold flex items-center gap-3 animate-in zoom-in slide-in-from-bottom-4">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> {p.name} {p.id === battleData.host_id && "👑"}
                    </div>
                 ))}
              </div>
           </div>

           {isHost && gameState.players.length > 0 && (
              <button onClick={startGame} className="z-10 mt-12 px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xl rounded-2xl shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] transition-all active:scale-95 flex items-center gap-3">
                 <Play fill="currentColor" /> {t.hostStart}
              </button>
           )}
        </div>
      )}

      {/* LIVE BATTLE GAMEPLAY */}
      {gameState.status === 'playing' && gameState.currentQuestion !== 'finished' && (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
           
           {/* Mobile Smart Header */}
           <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] shrink-0`}>
             <div className="flex flex-col">
               <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><Swords size={16} className="text-indigo-400"/> Arena</h2>
               <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">Live Battle</p>
             </div>
             <div className="flex items-center gap-1 font-mono font-black text-lg text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
               <Clock size={14} className="text-indigo-400"/> 00:{timeLeft.toString().padStart(2, '0')}
             </div>
           </div>

           <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative w-full h-full">

            {/* Desktop Left Sidebar: Leaderboard */}
            <div className="hidden lg:flex w-full lg:w-1/4 bg-slate-900 border-r border-slate-800 p-6 flex-col shrink-0">
               <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase flex items-center gap-2 mb-6"><Trophy size={16} className="text-yellow-500"/> {t.leaderboard}</h3>
               <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  {gameState.players.map((p: any, i: number) => (
                     <div key={p.id} className={`p-4 rounded-xl flex items-center justify-between border ${p.id === currentUser?.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-950 border-slate-800'} transition-all duration-300`}>
                        <div className="flex items-center gap-3">
                           <span className={`font-black text-lg ${i === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>#{i+1}</span>
                           <span className="font-bold text-slate-200 truncate max-w-[100px]">{p.name}</span>
                        </div>
                        <span className="font-black text-indigo-400 font-mono">{p.score}</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* Main Content Area */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 p-4 md:p-8 lg:p-12 flex flex-col relative overflow-y-auto lg:overflow-hidden custom-scrollbar">
               <div className="absolute top-0 left-0 right-0 h-2 bg-slate-800">
                  <div className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 15) * 100}%` }}></div>
               </div>

               <div className="flex justify-between items-center mb-6 mt-4 lg:mt-8">
                  <span className="text-xs md:text-sm font-black tracking-widest text-indigo-400 uppercase">{t.question} {gameState.currentQuestion + 1} / {battleData.quiz_data.length}</span>
                  <span className="hidden lg:flex items-center gap-1 font-mono font-black text-xl text-slate-300"><Clock size={20}/> 00:{timeLeft.toString().padStart(2, '0')}</span>
               </div>

               <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full mb-24 lg:mb-0">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-8 lg:mb-10 leading-tight">
                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ?.question || ""}</ReactMarkdown>
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                     {currentQ?.options.map((opt: string, i: number) => {
                        let stateClass = "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200";
                        if (hasAnswered) {
                           if (opt === currentQ.correctAnswer) stateClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]";
                           else if (answerStatus === 'wrong') stateClass = "bg-rose-500/10 border-rose-500/50 text-slate-400 opacity-50";
                           else stateClass = "bg-slate-800/50 border-slate-800 text-slate-500 opacity-50";
                        }
                        return (
                           <button key={i} disabled={hasAnswered} onClick={() => handleAnswer(opt)} className={`p-4 md:p-6 rounded-2xl border-2 text-left font-bold text-base md:text-lg transition-all active:scale-95 ${stateClass}`}>
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                           </button>
                        )
                     })}
                  </div>

                  {hasAnswered && (
                      <div className="mt-8 lg:mt-10 flex flex-col md:flex-row items-center justify-between p-5 lg:p-6 bg-slate-900 border border-slate-800 rounded-2xl animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3">
                           {answerStatus === 'correct' ? <Zap className="text-yellow-500 fill-current" size={24}/> : <AlertTriangle className="text-rose-500" size={24}/>}
                           <span className={`text-xl lg:text-2xl font-black ${answerStatus === 'correct' ? 'text-emerald-400' : 'text-rose-500'}`}>{answerStatus === 'correct' ? t.correct : t.wrong}</span>
                        </div>
                        
                        {isHost ? (
                           <button onClick={nextQuestion} className="mt-4 md:mt-0 w-full md:w-auto px-6 lg:px-8 py-3 lg:py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2">
                              {gameState.currentQuestion < battleData.quiz_data.length - 1 ? t.nextQ : t.finish} <ChevronRight/>
                           </button>
                        ) : (
                           <p className="mt-4 md:mt-0 text-slate-400 font-bold animate-pulse">{t.waitNext}</p>
                        )}
                     </div>
                  )}
               </div>
            </div>
            
            {/* Mobile Floating Input Dock */}
            <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
              <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
                <button 
                  onClick={() => setIsMobileDrawerOpen('leaderboard')} 
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 border border-indigo-400/50"
                >
                  <Trophy size={18} /> View Leaderboard
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
                   <Trophy size={18} className="text-yellow-500"/> {t.leaderboard}
                 </h3>
               </div>

               <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar space-y-3">
                  {gameState.players.map((p: any, i: number) => (
                     <div key={p.id} className={`p-4 rounded-xl flex items-center justify-between border ${p.id === currentUser?.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-950 border-slate-800'} transition-all duration-300`}>
                        <div className="flex items-center gap-3">
                           <span className={`font-black text-lg ${i === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>#{i+1}</span>
                           <span className="font-bold text-slate-200 truncate max-w-[150px]">{p.name}</span>
                        </div>
                        <span className="font-black text-indigo-400 font-mono">{p.score}</span>
                     </div>
                  ))}
               </div>
             </div>
           </div>

        </div>
      )}

      {/* FINAL LEADERBOARD */}
      {gameState.currentQuestion === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
           <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/90 to-slate-950"></div>
           
           <div className="z-10 text-center mb-12">
              <Trophy size={80} className="text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
              <h1 className="text-5xl font-black text-white tracking-tight mb-2">{t.finalScore}</h1>
           </div>

           <div className="z-10 w-full max-w-xl space-y-4">
              {gameState.players.map((p: any, i: number) => (
                 <div key={p.id} className={`p-6 rounded-2xl border flex items-center justify-between ${i === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border-yellow-500/50 shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)]' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center gap-4">
                       <span className={`text-3xl font-black ${i === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>#{i+1}</span>
                       <div>
                          <span className="font-black text-xl text-white block">{p.name}</span>
                          {i === 0 && <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">{t.winner}</span>}
                       </div>
                    </div>
                    <span className="font-black text-3xl font-mono text-white">{p.score}</span>
                 </div>
              ))}
           </div>
           
           <button onClick={secureMyRewards} className="z-10 mt-12 px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xl rounded-2xl shadow-xl flex items-center gap-3 transition-transform active:scale-95">
              <Gift fill="currentColor"/> {currentUser?.isGuest ? t.loginToSecure : t.secureRewards}
           </button>
        </div>
      )}

    </div>
  );
}

export default function Page() {
  return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-indigo-400 bg-slate-950 font-black"><Loader2 className="animate-spin"/></div>}>
        <BattleArenaContent />
      </Suspense>
  );
}
