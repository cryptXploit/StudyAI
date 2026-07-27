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

export default function LivePodcastPage() {
  const router = useRouter();
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();

  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [language, setLanguage] = useState<'English' | 'Bengali' | 'Hindi'>('English');
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [aiText, setAiText] = useState('');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'config'>('none');

  // Audio Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const transcriptRef = useRef('');
  const displayedTranscriptRef = useRef('');
  const shouldSubmitVoiceRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const liveStateRef = useRef(state);
  const resumeListeningRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const voiceTurnSubmittedRef = useRef(false);
  const recognitionActiveRef = useRef(false);

  useEffect(() => { liveStateRef.current = state; }, [state]);

  useEffect(() => {
    let refreshVoices = () => {};
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      refreshVoices = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
      refreshVoices();
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        // A single browser recognition turn is substantially more reliable
        // than continuous mode across Chrome/Edge. We reopen it after each AI
        // reply, which still provides a continuous conversation experience.
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
      } else {
        alert("Your browser does not support Speech Recognition. Please use Chrome.");
      }
    }
    return () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
      window.speechSynthesis?.removeEventListener('voiceschanged', refreshVoices);
    };
  }, []);

  const getLangCode = () => {
    if (language === 'Bengali') return 'bn-BD';
    if (language === 'Hindi') return 'hi-IN';
    return 'en-US';
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const isMeaningfulSpeech = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized.length < 2 || !/[\p{L}\p{N}]/u.test(normalized)) return false;
    return !new Set(['um', 'uh', 'hmm', 'erm', 'ah', 'er', 'হুম', 'উম', 'আহ', 'हम्म', 'उम', 'अ']).has(normalized);
  };

  const submitVoiceTurn = (message: string) => {
    if (voiceTurnSubmittedRef.current || requestInFlightRef.current || !isMeaningfulSpeech(message)) return;
    voiceTurnSubmittedRef.current = true;
    shouldSubmitVoiceRef.current = false;
    clearSilenceTimer();
    // Set the AI state before stopping recognition so its onend handler cannot
    // restart the mic and submit the same turn twice.
    void sendToAI(message.trim(), true);
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
  };

  const scheduleAutomaticReply = (message: string) => {
    clearSilenceTimer();
    if (!isMeaningfulSpeech(message) || voiceTurnSubmittedRef.current) return;
    silenceTimerRef.current = window.setTimeout(() => {
      if (liveStateRef.current === 'listening') submitVoiceTurn(displayedTranscriptRef.current || message);
    }, 2000);
  };

  const startListening = async () => {
    if (!recognitionRef.current) return;
    if (liveStateRef.current !== 'idle' || recognitionActiveRef.current) return;

    if (synthRef.current) synthRef.current.cancel(); // stop ai speaking
    setTranscript('');
    transcriptRef.current = '';
    displayedTranscriptRef.current = '';
    shouldSubmitVoiceRef.current = false;
    voiceTurnSubmittedRef.current = false;
    clearSilenceTimer();
    liveStateRef.current = 'listening';
    setState('listening');

    recognitionRef.current.lang = getLangCode();
    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = transcriptRef.current;
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const phrase = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += `${phrase} `;
        else interimTranscript += phrase;
      }
      const currentTranscript = `${finalTranscript}${interimTranscript}`.trim();
      if (currentTranscript) {
        transcriptRef.current = finalTranscript.trim();
        displayedTranscriptRef.current = currentTranscript;
        setTranscript(currentTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      // aborted is emitted when the app intentionally stops/ends a turn.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        if (event.error === 'network') {
          alert("Network Error: Your browser is failing to connect to the Voice API. Please ensure you are using Google Chrome and your internet is stable.");
        } else if (event.error === 'audio-capture') {
          alert("Microphone Error: No microphone was found, or it is being used by another application. Please check your microphone settings.");
        } else if (event.error === 'not-allowed') {
          alert("Permission Denied: Please allow microphone access in your browser settings to use the Live Podcast feature.");
        } else {
          console.error("Speech Recognition Error:", event.error);
        }
      }
      // Don't immediately set idle here, let onend handle the cleanup and AI sending
    };

    recognitionRef.current.onend = () => {
      recognitionActiveRef.current = false;
      // Browser recognition may stop on a natural pause. A pause is not a turn
      // boundary; only the explicit Send Voice action submits the message.
      if (shouldSubmitVoiceRef.current) {
        shouldSubmitVoiceRef.current = false;
        voiceTurnSubmittedRef.current = true;
        clearSilenceTimer();
        const message = transcriptRef.current.trim() || displayedTranscriptRef.current.trim();
        if (message) void sendToAI(message, true);
        else { liveStateRef.current = 'idle'; setState('idle'); }
        return;
      }
      const detectedSpeech = transcriptRef.current.trim() || displayedTranscriptRef.current.trim();
      if (isMeaningfulSpeech(detectedSpeech)) {
        // Recognition has ended after the user's natural pause. Give a small
        // grace period before treating it as the completed turn.
        scheduleAutomaticReply(detectedSpeech);
      } else if (liveStateRef.current === 'listening') {
        // Nothing meaningful was heard; end this turn cleanly. The next AI
        // reply starts another turn automatically, and the user can start one
        // again from idle without an overlapping recognizer.
        liveStateRef.current = 'idle';
        setState('idle');
      }
    };

    // Attempt to force microphone permission prompt
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      console.warn("getUserMedia failed:", err.name, err.message);
      // We don't block here anymore. We just warn and let SpeechRecognition try its best.
    }

    try {
      recognitionActiveRef.current = true;
      recognitionRef.current.start();
    } catch (err: any) {
      if (err?.name === 'InvalidStateError') {
        recognitionActiveRef.current = true;
        liveStateRef.current = 'listening';
        setState('listening');
        return;
      }
      console.error("Failed to start SpeechRecognition:", err);
      recognitionActiveRef.current = false;
      liveStateRef.current = 'idle';
      setState('idle');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && state === 'listening') {
      clearSilenceTimer();
      shouldSubmitVoiceRef.current = true;
      recognitionRef.current.stop();
    }
  };

  const endLiveConversation = () => {
    clearSilenceTimer();
    shouldSubmitVoiceRef.current = false;
    voiceTurnSubmittedRef.current = false;
    resumeListeningRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* already stopped */ }
    recognitionActiveRef.current = false;
    if (synthRef.current) synthRef.current.cancel();
    liveStateRef.current = 'idle';
    setState('idle');
  };

  const sendToAI = async (message: string, resumeListeningAfterReply = false) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    resumeListeningRef.current = resumeListeningAfterReply;
    liveStateRef.current = 'thinking';
    setState('thinking');
    setAiText('');
    setLiveError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      requestInFlightRef.current = false;
      liveStateRef.current = 'idle';
      setState('idle');
      router.push('/login');
      return;
    }

    if (tier !== 'PRO' && tokens < 2) {
      setShowTokenModal(true);
      requestInFlightRef.current = false;
      liveStateRef.current = 'idle';
      setState('idle');
      return;
    }

    try {
      const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
      const response = await fetch(`${apiOrigin}/api/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message, language, tier, history })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || `Live request failed (${response.status})`);
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = "";
      let buffer = "";

      let completed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                if (data.error === 'INSUFFICIENT_TOKENS') setShowTokenModal(true);
                setLiveError(getPublicErrorMessage(data));
                if (data.error !== 'INSUFFICIENT_TOKENS') showPublicError(data);
                liveStateRef.current = 'idle';
                setState('idle');
                return;
              }
              if (data.content) {
                fullText += data.content;
                setAiText(fullText);
              }
              if (data.status === 'complete') {
                completed = true;
                speakText(fullText);
                setHistory(prev => [...prev.slice(-4), { role: 'user', content: message }, { role: 'assistant', content: fullText }]);
                refreshTokens();
              }
            } catch (e) {}
          }
        }
      }
      if (!completed) {
        throw new Error(fullText ? 'Live response ended before completion.' : 'No response was received from the selected AI provider.');
      }
    } catch (error) {
      console.error(error);
      const message = getPublicErrorMessage();
      setLiveError(message);
      showPublicError();
      liveStateRef.current = 'idle';
      setState('idle');
    } finally {
      requestInFlightRef.current = false;
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state !== 'idle') return;
    const msg = textInput.trim();
    setTextInput('');
    setTranscript(msg);
    void sendToAI(msg, false);
  };

  const speakText = (text: string) => {
    if (!synthRef.current) { liveStateRef.current = 'idle'; setState('idle'); return; }

    liveStateRef.current = 'speaking';
    setState('speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode();

    // Prefer an installed native voice in the selected language. If the OS has
    // no Bangla/Hindi voice, use its available default voice instead of failing
    // silently, while the full answer remains visible as subtitles.
    const voices = voicesRef.current.length ? voicesRef.current : synthRef.current.getVoices();
    const languagePrefix = utterance.lang.split('-')[0].toLowerCase();
    const targetVoice = voices.find(v => v.lang.toLowerCase().startsWith(languagePrefix));
    if (targetVoice) utterance.voice = targetVoice;
    else if (voices[0]) {
      // Some operating systems ship without Bangla/Hindi voices. Fall back to
      // an installed voice so the answer is never silently dropped.
      utterance.voice = voices[0];
      utterance.lang = voices[0].lang;
    }
    utterance.rate = language === 'English' ? 0.98 : 0.9;
    utterance.pitch = 1.04;

    utterance.onend = () => {
      liveStateRef.current = 'idle';
      setState('idle');
      if (resumeListeningRef.current) {
        resumeListeningRef.current = false;
        window.setTimeout(() => void startListening(), 350);
      }
    };

    utterance.onerror = () => {
      liveStateRef.current = 'idle';
      setState('idle');
      resumeListeningRef.current = false;
    };

    synthRef.current.speak(utterance);
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

  return (
    <SecureLayout>
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden pt-16">

        {/* Background Grid */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.16) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <OutOfTokensModal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} requiredTokens={2} />

        <div className="relative z-10 flex flex-col items-center max-w-4xl w-full px-6">

          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 mb-4 text-center">
            Live AI Podcast
          </h1>
          <p className="text-slate-400 text-center mb-12 max-w-lg">
            Have a real-time, hands-free conversation with AI. Perfect for interview prep, debate practice, or casual talks.
          </p>

          {/* Language Selector (Desktop) */}
          <div className="hidden lg:flex bg-slate-900/50 backdrop-blur-md p-1 rounded-full border border-slate-800 mb-12">
            {['English', 'Bengali', 'Hindi'].map(lang => (
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
                {state === 'idle' ? 'Ready' : state === 'listening' ? 'Listening...' : state === 'thinking' ? 'Thinking...' : 'Speaking...'}
              </span>
            </div>
          </div>

          {/* Subtitles / Text View */}
          <div className="h-32 w-full max-w-2xl text-center flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {state === 'listening' && (
                <motion.p key="listen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-300 text-lg md:text-xl font-medium">
                  "{transcript || '...'}"
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
                  Tap to Speak
                </button>
              ) : state === 'listening' ? (
                <div className="flex items-center gap-3">
                  <button onClick={stopListening} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Send now
                  </button>
                  <button onClick={endLiveConversation} className="px-5 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full font-bold transition-all flex items-center gap-2">
                    <StopCircle className="w-5 h-5" /> End
                  </button>
                </div>
              ) : (
                <button onClick={cancelSpeech} className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
                  <StopCircle className="w-5 h-5" />
                  Interrupt
                </button>
              )}
            </div>

            {/* Text Fallback Input */}
            <form onSubmit={handleTextSubmit} className="w-full relative opacity-70 hover:opacity-100 transition-opacity focus-within:opacity-100">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={state !== 'idle'}
                placeholder="Or type your message here..."
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-full py-3 px-6 pr-12 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button type="submit" disabled={!textInput.trim() || state !== 'idle'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Mobile Floating Input Dock */}
          <div className="lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col items-center pb-6">
            <div className="w-full max-w-md flex flex-col pointer-events-auto">
              <div className="flex justify-between items-end mb-4 px-2">
                <button onClick={() => setIsMobileDrawerOpen('config')} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/80 border-slate-700 text-slate-300">
                  <Settings2 size={14}/> {language}
                </button>

                {/* Mobile Voice Button */}
                <div className="relative">
                  {state === 'idle' ? (
                    <button onClick={startListening} className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95">
                      <Mic size={24} />
                    </button>
                  ) : state === 'listening' ? (
                    <div className="flex items-center gap-2">
                      <button onClick={endLiveConversation} aria-label="End live conversation" className="w-11 h-11 bg-slate-800 text-slate-200 rounded-full flex items-center justify-center"><StopCircle size={18}/></button>
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

              {/* Mobile Text Input */}
              <form onSubmit={handleTextSubmit} className="relative group mx-1 w-full flex-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 rounded-[2rem] blur-md opacity-70 transition duration-500 group-focus-within:opacity-100"></div>
                <div className="relative flex shadow-xl rounded-[2rem] border transition-all backdrop-blur-xl overflow-hidden p-1 bg-slate-900/90 border-slate-700/50 focus-within:border-indigo-500 focus-within:bg-slate-900">
                  <input
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    disabled={state !== 'idle'}
                    placeholder="Type message..."
                    className="w-full pl-5 pr-12 py-3.5 bg-transparent border-none focus:ring-0 outline-none disabled:opacity-50 text-[15px] font-medium text-white placeholder:text-slate-500"
                  />
                  <button type="submit" disabled={!textInput.trim() || state !== 'idle'} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-400 disabled:opacity-50 active:scale-95 transition-transform">
                    <Send size={20} />
                  </button>
                </div>
              </form>
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
              <Settings2 size={18} className="text-indigo-400"/> Settings
            </h3>
          </div>

          <div className="space-y-6 pb-20">
             <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Spoken Language</label>
                <div className="grid grid-cols-1 gap-2">
                  {['English', 'Bengali', 'Hindi'].map(lang => (
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
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
