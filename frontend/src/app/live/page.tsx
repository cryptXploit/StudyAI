'use client';
import { getPublicErrorMessage, showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTokens } from '@/hooks/useTokens';
import SecureLayout from '@/components/layout/SecureLayout';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import { Settings2, CheckCircle2, Mic, StopCircle, Send } from 'lucide-react';

const translations = {
  English: {
    micPermissionDenied: "Permission Denied: Please allow microphone access in your browser settings to use the Live Podcast feature.",
    micError: "Microphone Error: No microphone was found, or it is being used by another application.",
    livePodcastTitle: "Live AI Podcast",
    livePodcastDesc: "Have a real-time, hands-free conversation with AI. Perfect for interview prep, debate practice, or casual talks.",
    ready: "Ready",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    tapToSpeak: "Tap to Speak",
    sendNow: "Send now",
    cancel: "Cancel",
    interrupt: "Interrupt",
    settings: "Settings",
    spokenLanguage: "Spoken Language",
    done: "Done",
  },
  Bangla: {
    micPermissionDenied: "অনুমতি অস্বীকার করা হয়েছে: লাইভ পডকাস্ট বৈশিষ্ট্য ব্যবহার করতে অনুগ্রহ করে আপনার ব্রাউজার সেটিংসে মাইক্রোফোন অ্যাক্সেসের অনুমতি দিন।",
    micError: "মাইক্রোফোন ত্রুটি: কোনও মাইক্রোফোন পাওয়া যায়নি, অথবা এটি অন্য কোনও অ্যাপ্লিকেশন দ্বারা ব্যবহৃত হচ্ছে।",
    livePodcastTitle: "লাইভ এআই পডকাস্ট",
    livePodcastDesc: "এআই-এর সাথে একটি রিয়েল-টাইম, হ্যান্ডস-ফ্রি কথোপকথন করুন। ইন্টারভিউ প্রস্তুতি, বিতর্ক অনুশীলন বা সাধারণ কথোপকথনের জন্য উপযুক্ত।",
    ready: "প্রস্তুত",
    listening: "শুনছে...",
    thinking: "ভাবছে...",
    speaking: "বলছে...",
    tapToSpeak: "কথা বলতে ট্যাপ করুন",
    sendNow: "এখনই পাঠান",
    cancel: "বাতিল করুন",
    interrupt: "বাধা দিন",
    settings: "সেটিংস",
    spokenLanguage: "কথ্য ভাষা",
    done: "সম্পন্ন",
  },
  Hindi: {
    micPermissionDenied: "अनुमति अस्वीकृत: लाइव पॉडकास्ट सुविधा का उपयोग करने के लिए कृपया अपनी ब्राउज़र सेटिंग में माइक्रोफ़ोन एक्सेस की अनुमति दें।",
    micError: "माइक्रोफ़ोन त्रुटि: कोई माइक्रोफ़ोन नहीं मिला, या इसका उपयोग किसी अन्य एप्लिकेशन द्वारा किया जा रहा है।",
    livePodcastTitle: "लाइव एआई पॉडकास्ट",
    livePodcastDesc: "एआई के साथ रीयल-टाइम, हैंड्स-फ्री बातचीत करें। साक्षात्कार की तैयारी, वाद-विवाद अभ्यास या सामान्य बातचीत के लिए बिल्कुल सही।",
    ready: "तैयार",
    listening: "सुन रहा है...",
    thinking: "सोच रहा है...",
    speaking: "बोल रहा है...",
    tapToSpeak: "बोलने के लिए टैप करें",
    sendNow: "अभी भेजें",
    cancel: "रद्द करें",
    interrupt: "बाधित करें",
    settings: "सेटिंग्स",
    spokenLanguage: "बोली जाने वाली भाषा",
    done: "संपन्न",
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function LivePodcastPage() {
  const router = useRouter();
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();

  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [language, setLanguage] = useState<LanguageType>('English');
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [aiText, setAiText] = useState('');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'config'>('none');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    const loadSettings = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };
    loadSettings();

    return () => {
      endLiveConversation();
    };
  }, []);

  const startListening = async () => {
    if (state !== 'idle') return;
    
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    setTranscript('');
    setAiText('');
    setLiveError(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendToAI(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState('listening');
    } catch (err: any) {
      console.error("Microphone access denied:", err);
      if (err.name === 'NotAllowedError') {
        alert(translations[language].micPermissionDenied);
      } else {
        alert(translations[language].micError);
      }
      setState('idle');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && state === 'listening') {
      mediaRecorderRef.current.stop(); // This triggers onstop which calls sendToAI
    }
  };

  const endLiveConversation = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Temporarily override onstop so it doesn't send anything
      mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setState('idle');
  };

  const sendToAI = async (audioBlob: Blob) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setState('thinking');
    setLiveError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      requestInFlightRef.current = false;
      setState('idle');
      router.push('/login');
      return;
    }

    if (tier !== 'PRO' && tokens < 2) {
      setShowTokenModal(true);
      requestInFlightRef.current = false;
      setState('idle');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('language', language);
      formData.append('tier', tier);
      formData.append('history', JSON.stringify(history));

      const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
      const response = await fetch(`${apiOrigin}/api/voice/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || `Voice request failed (${response.status})`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        if (data.error === 'INSUFFICIENT_TOKENS') setShowTokenModal(true);
        else setLiveError(data.message || data.error);
        setState('idle');
        return;
      }

      setTranscript(data.userText);
      setAiText(data.aiText);
      
      setHistory(prev => [...prev.slice(-4), { role: 'user', content: data.userText }, { role: 'assistant', content: data.aiText }]);
      refreshTokens();
      
      // Play audio
      if (data.audioBase64) {
        playAudioBuffer(data.audioBase64);
      } else {
        setState('idle');
      }

    } catch (error: any) {
      console.error(error);
      setLiveError(error.message || getPublicErrorMessage());
      setState('idle');
    } finally {
      requestInFlightRef.current = false;
    }
  };

  const playAudioBuffer = (base64Audio: string) => {
    try {
      setState('speaking');
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      activeAudioRef.current = audio;
      
      audio.onended = () => {
        setState('idle');
        activeAudioRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setState('idle');
      };

      audio.play().catch(e => {
        console.error("Audio play blocked:", e);
        // On iOS sometimes playing audio asynchronously is blocked.
        // The user will still see the transcript.
        setState('idle');
      });
    } catch (err) {
      console.error("Failed to play audio:", err);
      setState('idle');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state !== 'idle') return;
    const msg = textInput.trim();
    setTextInput('');
    setTranscript(msg);
    // Since we are strictly voice for now with STT, let's just show an error if they try text, or disable the text input.
    // Wait, let's keep text input disabled or hide it, since it's a "Voice AI". 
    // If they want text, they can use chat.
  };

  const cancelSpeech = () => {
    endLiveConversation();
  };

  const getOrbAnimation = () => {
    switch (state) {
      case 'listening':
        return { scale: [1, 1.2, 1], boxShadow: ["0px 0px 20px #10b981", "0px 0px 60px #10b981", "0px 0px 20px #10b981"] };
      case 'thinking':
        return { scale: [1, 1.05, 1], rotate: 360, boxShadow: ["0px 0px 20px #8b5cf6", "0px 0px 40px #8b5cf6", "0px 0px 20px #8b5cf6"] };
      case 'speaking':
        return { scale: [1, 1.3, 1.1, 1.4, 1], boxShadow: ["0px 0px 30px #3b82f6", "0px 0px 80px #3b82f6", "0px 0px 30px #3b82f6"] };
      default:
        return { scale: [1, 1.02, 1], boxShadow: ["0px 0px 10px #4b5563", "0px 0px 20px #4b5563", "0px 0px 10px #4b5563"] };
    }
  };

  const t = translations[language];

  return (
    <SecureLayout>
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden pt-16">

        {/* Background Grid */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.16) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <OutOfTokensModal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} requiredTokens={2} />

        <div className="relative z-10 flex flex-col items-center max-w-4xl w-full px-6">

          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 mb-4 text-center">
            {t.livePodcastTitle}
          </h1>
          <p className="text-slate-400 text-center mb-12 max-w-lg">
            {t.livePodcastDesc}
          </p>

          {/* Language Selector (Desktop) */}
          <div className="hidden lg:flex bg-slate-900/50 backdrop-blur-md p-1 rounded-full border border-slate-800 mb-12">
            {['English', 'Bangla', 'Hindi'].map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang as any)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${language === lang ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Glowing Orb */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 mb-16 flex items-center justify-center">
            <motion.div
              animate={getOrbAnimation()}
              transition={{ duration: state === 'thinking' ? 2 : 1.5, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full bg-gradient-to-br opacity-80 blur-xl ${state === 'listening' ? 'from-emerald-400 to-teal-500' : state === 'thinking' ? 'from-purple-500 to-indigo-500' : state === 'speaking' ? 'from-blue-400 to-cyan-400' : 'from-slate-700 to-slate-800'}`}
            />
            <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-900 border border-slate-700/50 shadow-2xl flex items-center justify-center">
              <span className="text-slate-400 font-medium text-sm">
                {state === 'idle' ? t.ready : state === 'listening' ? t.listening : state === 'thinking' ? t.thinking : t.speaking}
              </span>
            </div>
          </div>

          {/* Subtitles / Text View */}
          <div className="h-32 w-full max-w-2xl text-center flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {transcript && (state === 'thinking' || state === 'speaking') && (
                <motion.p key="listen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-300 text-lg md:text-xl font-medium mb-2">
                  "{transcript}"
                </motion.p>
              )}
              {(state === 'speaking' || state === 'thinking') && (
                <motion.p key="speak" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-indigo-200 text-lg md:text-xl leading-relaxed">
                  {aiText || 'Hmm...'}
                </motion.p>
              )}
            </AnimatePresence>
            {liveError && <p role="alert" className="mt-3 max-w-xl rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300">{liveError}</p>}
          </div>

          {/* Controls (Desktop) */}
          <div className="hidden lg:flex mt-8 flex-col items-center gap-6 w-full max-w-md">
            <div className="flex gap-4">
              {state === 'idle' ? (
                <button onClick={startListening} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  {t.tapToSpeak}
                </button>
              ) : state === 'listening' ? (
                <div className="flex items-center gap-3">
                  <button onClick={stopListening} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    {t.sendNow}
                  </button>
                  <button onClick={endLiveConversation} className="px-5 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full font-bold transition-all flex items-center gap-2">
                    <StopCircle className="w-5 h-5" /> {t.cancel}
                  </button>
                </div>
              ) : (
                <button onClick={cancelSpeech} className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
                  <StopCircle className="w-5 h-5" />
                  {t.interrupt}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Floating Input Dock */}
          <div className="lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col items-center pb-6">
            <div className="w-full max-w-md flex flex-col pointer-events-auto">
              <div className="flex justify-between items-center mb-4 px-4 w-full">
                <button onClick={() => setIsMobileDrawerOpen('config')} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/80 border-slate-700 text-slate-300">
                  <Settings2 size={14}/> {language}
                </button>

                {/* Mobile Voice Button */}
                <div className="relative flex-1 flex justify-end">
                  {state === 'idle' ? (
                    <button onClick={startListening} className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95">
                      <Mic size={24} />
                    </button>
                  ) : state === 'listening' ? (
                    <div className="flex items-center gap-3">
                      <button onClick={endLiveConversation} aria-label="Cancel" className="w-11 h-11 bg-slate-800 text-slate-200 rounded-full flex items-center justify-center"><StopCircle size={18}/></button>
                      <button onClick={stopListening} aria-label="Send voice message now" className="w-16 h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 animate-pulse">
                        <Send size={24} className="ml-1" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={cancelSpeech} className="w-16 h-16 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all active:scale-95">
                      <StopCircle size={24} />
                    </button>
                  )}
                </div>
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
              <Settings2 size={18} className="text-indigo-400"/> {t.settings}
            </h3>
          </div>

          <div className="space-y-6 pb-20">
             <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t.spokenLanguage}</label>
                <div className="grid grid-cols-1 gap-2">
                  {['English', 'Bangla', 'Hindi'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang as any); setIsMobileDrawerOpen('none'); }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${language === lang ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                    >
                      <span className="font-bold text-sm">{lang}</span>
                      {language === lang && <CheckCircle2 size={18} className="text-indigo-400" />}
                    </button>
                  ))}
                </div>
             </div>
          </div>

          {/* Sticky Done Button */}
          <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
            <button onClick={() => setIsMobileDrawerOpen('none')} className="w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
              <CheckCircle2 size={16}/> {t.done}
            </button>
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
