'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Headphones, Play, Pause, Square, History, X, CheckCircle2, FileText, Loader2, Sparkles, Volume2, Music, Settings2, Mic2, Users } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    audioMode: "Audio Summary",
    listenOnGo: "Listen on the Go",
    contextFiles: "Context Files (Optional)",
    whatToListen: "What do you want to listen to?",
    placeholder: "e.g., Quantum Physics, World War 2...",
    generateAudio: "Generate Audio Script",
    generateDebate: "Generate Debate",
    generating: "Writing Script...",
    yourLibrary: "Podcast Library",
    noHistory: "No audio history found.",
    voiceSettings: "Voice Settings",
    backgroundMusic: "Lo-Fi Study Beats",
    musicDesc: "Play ambient focus music in background",
    scriptAwaits: "Your Podcast Awaits",
    awaitsDesc: "Generate an audio summary on the left and listen while studying.",
    nowPlaying: "Now Playing",
    teleprompter: "Teleprompter View",
    previewText: "Hello, how does this voice sound for your podcast?",
    studioNetworkVoice: "Studio Network Voice",
    debateScriptView: "Debate Script View",
    backToAiChat: "Back to AI Chat",
    config: "Config",
    library: "Library",
    audioConfiguration: "Audio Configuration",
    targetTopic: "1. Target Topic",
    contextFilesNumbered: "2. Context Files",
    optional: "(Optional)",
    done: "Done"
  },
  Bangla: {
    audioMode: "অডিও সামারি",
    listenOnGo: "যেকোনো জায়গায় শুনুন",
    contextFiles: "কনটেক্সট ফাইল (ঐচ্ছিক)",
    whatToListen: "আপনি কী শুনতে চান?",
    placeholder: "যেমন: কোয়ান্টাম ফিজিক্স, ২য় বিশ্বযুদ্ধ...",
    generateAudio: "অডিও স্ক্রিপ্ট তৈরি করুন",
    generateDebate: "ডিবেট তৈরি করুন",
    generating: "স্ক্রিপ্ট লেখা হচ্ছে...",
    yourLibrary: "পডকাস্ট লাইব্রেরি",
    noHistory: "কোনো অডিও হিস্ট্রি নেই।",
    voiceSettings: "ভয়েস সেটিংস",
    backgroundMusic: "লো-ফাই স্টাডি মিউজিক",
    musicDesc: "ব্যাকগ্রাউন্ডে ফোকাস মিউজিক বাজান",
    scriptAwaits: "আপনার পডকাস্ট অপেক্ষায়",
    awaitsDesc: "বামে টপিক লিখে অডিও সামারি জেনারেট করুন এবং শুনুন।",
    nowPlaying: "এখন বাজছে",
    teleprompter: "টেলিপ্রম্পটার ভিউ",
    previewText: "হ্যালো, আপনার পডকাস্টের জন্য এই ভয়েসটি কেমন লাগছে?",
    studioNetworkVoice: "স্টুডিও নেটওয়ার্ক ভয়েস",
    debateScriptView: "ডিবেট স্ক্রিপ্ট ভিউ",
    backToAiChat: "এআই চ্যাটে ফিরে যান",
    config: "কনফিগ",
    library: "লাইব্রেরি",
    audioConfiguration: "অডিও কনফিগারেশন",
    targetTopic: "১. টার্গেট টপিক",
    contextFilesNumbered: "২. কনটেক্সট ফাইল",
    optional: "(ঐচ্ছিক)",
    done: "সম্পন্ন"
  },
  Hindi: {
    audioMode: "ऑडियो सारांश",
    listenOnGo: "चलते-फिरते सुनें",
    contextFiles: "संदर्भ फ़ाइलें (वैकल्पिक)",
    whatToListen: "आप क्या सुनना चाहते हैं?",
    placeholder: "उदा. क्वांटम भौतिकी, द्वितीय विश्व युद्ध...",
    generateAudio: "ऑडियो स्क्रिप्ट जनरेट करें",
    generateDebate: "डिबेट जनरेट करें",
    generating: "स्क्रिप्ट लिखी जा रही है...",
    yourLibrary: "पॉडकास्ट लाइब्रेरी",
    noHistory: "कोई ऑडियो इतिहास नहीं मिला।",
    voiceSettings: "वॉयस सेटिंग्स",
    backgroundMusic: "लो-फाई Study Beats",
    musicDesc: "बैकग्राउंड में एंबियंट म्यूजिक चलाएं",
    scriptAwaits: "आपका पॉडकास्ट प्रतीक्षारत है",
    awaitsDesc: "बाईं ओर ऑडियो सारांश जनरेट करें और सुनें।",
    nowPlaying: "अब बज रहा है",
    teleprompter: "टेलीप्रॉम्प्टर व्यू",
    previewText: "नमस्ते, आपके पॉडकास्ट के लिए यह आवाज़ कैसी लग रही है?",
    studioNetworkVoice: "स्टूडियो नेटवर्क वॉयस",
    debateScriptView: "डिबेट स्क्रिप्ट व्यू",
    backToAiChat: "एआई चैट पर वापस जाएं",
    config: "कॉन्फ़िगरेशन",
    library: "लाइब्रेरी",
    audioConfiguration: "ऑडियो कॉन्फ़िगरेशन",
    targetTopic: "१. लक्षित विषय",
    contextFilesNumbered: "२. संदर्भ फ़ाइलें",
    optional: "(वैकल्पिक)",
    done: "संपन्न"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

function PodcastPageContent() {
  const supabase = createClient();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const contextParam = searchParams.get('context');
  const fileParamsString = searchParams.getAll('file').join(',');

  useEffect(() => {
    if (contextParam) setTopic(contextParam);
    if (fileParamsString) setSelectedFileIds(fileParamsString.split(','));
  }, [contextParam, fileParamsString]);

  const [script, setScript] = useState('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDebateMode, setIsDebateMode] = useState(false);

  const [historyList, setHistoryList] = useState<any[]>([]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  const [allLocalVoices, setAllLocalVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('cloud_google_voice');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);

  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const [language, setLanguage] = useState<LanguageType>('English');
  // 🟢 FIXED: Independent Playback Language for History
  const [playbackLanguage, setPlaybackLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];
  const scrollRef = useRef<HTMLDivElement>(null);

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'config'|'files'|'history'>('none');
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

  const isSequenceRunning = useRef(false);

  useEffect(() => {
    fetchFiles();
    fetchHistory();

    if (bgAudioRef.current) {
      bgAudioRef.current.volume = 0.15;
    }

    const loadLanguage = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) {
          setLanguage(savedLang as LanguageType);
          setPlaybackLanguage(savedLang as LanguageType);
      }
    };
    loadLanguage();
    window.addEventListener('languageChanged', loadLanguage);

    const loadVoices = () => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setAllLocalVoices(voices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.removeEventListener('languageChanged', loadLanguage);
      window.speechSynthesis.cancel();
      isSequenceRunning.current = false;
      if (cloudAudioRef.current) {
          cloudAudioRef.current.pause();
          cloudAudioRef.current.removeAttribute('src');
          cloudAudioRef.current.load();
      }
    };
  }, []);

  const availableLocalVoices = React.useMemo(() => {
    return allLocalVoices.filter(v => {
      // Filter based on Playback Language, NOT UI language!
      const langStr = v.lang.toLowerCase();
      if (playbackLanguage === 'Bangla') return langStr.includes('bn');
      if (playbackLanguage === 'Hindi') return langStr.includes('hi');
      return langStr.includes('en');
    });
  }, [allLocalVoices, playbackLanguage]);

  useEffect(() => {
    setSelectedVoiceURI('cloud_google_voice');
  }, [playbackLanguage]);

  const unlockAudioDOM = () => {
      if (cloudAudioRef.current) {
          cloudAudioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
          cloudAudioRef.current.play().then(() => { cloudAudioRef.current!.pause(); }).catch(() => {});
      }
  };

  const getApiBaseUrl = () => {
      let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      url = url.replace(/\/+$/, '');
      if (url.endsWith('/api')) {
          url = url.substring(0, url.length - 4);
      }
      return url;
  };

  const playCloudAudioChunk = async (text: string, langCode: string, speakerType: string = 'female'): Promise<void> => {
    return new Promise(async (resolve) => {
        const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
        if (!cleanText || !cloudAudioRef.current) return resolve();

        const fallbackToLocal = () => {
             console.warn("Backend proxy offline. Falling back to local voice.");
             const utterance = new SpeechSynthesisUtterance(cleanText);
             const fallbackVoice = availableLocalVoices.find(v => v.lang.includes(langCode));
             if (fallbackVoice) utterance.voice = fallbackVoice;

             if (isDebateMode && speakerType === 'male') utterance.pitch = 0.6;
             else if (isDebateMode && speakerType === 'female') utterance.pitch = 1.4;
             else utterance.pitch = 1.0;

             utterance.onend = () => setTimeout(() => resolve(), 300);
             utterance.onerror = () => resolve();
             window.speechSynthesis.speak(utterance);
        };

        try {
            const baseUrl = getApiBaseUrl();
            const url = isDebateMode
                ? `${baseUrl}/api/podcast/tts-debate?lang=${langCode}&speaker=${speakerType}&text=${encodeURIComponent(cleanText)}`
                : `${baseUrl}/api/podcast/tts?lang=${langCode}&text=${encodeURIComponent(cleanText)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Proxy error");

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            cloudAudioRef.current.onended = () => {
                 URL.revokeObjectURL(objectUrl);
                 setTimeout(() => resolve(), 250);
            };

            cloudAudioRef.current.onerror = () => {
                 URL.revokeObjectURL(objectUrl);
                 fallbackToLocal();
            };

            cloudAudioRef.current.src = objectUrl;
            cloudAudioRef.current.load();

            const playPromise = cloudAudioRef.current.play();
            if (playPromise !== undefined) {
                 playPromise.catch(() => {
                     URL.revokeObjectURL(objectUrl);
                     fallbackToLocal();
                 });
            }
        } catch (e) {
            fallbackToLocal();
        }
    });
  };

  const playAudio = async (startIndex = 0) => {
    if (sentences.length === 0) return;

    unlockAudioDOM();
    window.speechSynthesis.cancel();

    if (cloudAudioRef.current) {
        cloudAudioRef.current.pause();
        cloudAudioRef.current.removeAttribute('src');
    }

    isSequenceRunning.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentSentenceIndex(startIndex);

    if (selectedVoiceURI !== 'cloud_google_voice') {
         playLocalSequence(startIndex);
    } else {
         playCloudSequence(startIndex);
    }
  };

  const playCloudSequence = async (index: number) => {
      if (!isSequenceRunning.current || index >= sentences.length) {
          stopAudioState();
          return;
      }

      setCurrentSentenceIndex(index);

      // 🟢 FIXED: Using playbackLanguage instead of UI language
      let langCode = 'en';
      if (playbackLanguage === 'Bangla') langCode = 'bn';
      if (playbackLanguage === 'Hindi') langCode = 'hi';

      let rawText = sentences[index];
      let speakerType = 'female';

      if (isDebateMode) {
          if (/^(?:\*\*)?Alex(?:\*\*)?:/i.test(rawText)) {
              speakerType = 'male';
          }
          rawText = rawText.replace(/^(?:\*\*)?(Alex|Sarah)(?:\*\*)?:\s*/i, '').trim();
      }

      const words = rawText.split(/\s+/);
      const chunks = [];
      let currentChunk = '';
      const maxLength = 160;

      for (const word of words) {
        if (!word.trim()) continue;

        if ((currentChunk + word).length > maxLength && currentChunk.length > 0) {
          const puncRegex = /[.?!।,\u0964;:]/g;
          let match;
          let lastPuncIndex = -1;
          while ((match = puncRegex.exec(currentChunk)) !== null) {
            lastPuncIndex = match.index;
          }

          if (lastPuncIndex !== -1 && lastPuncIndex > currentChunk.length * 0.4) {
             const validPart = currentChunk.substring(0, lastPuncIndex + 1).trim();
             const leftover = currentChunk.substring(lastPuncIndex + 1).trim();
             chunks.push(validPart);
             currentChunk = leftover + (leftover ? ' ' : '') + word + ' ';
          } else {
             chunks.push(currentChunk.trim());
             currentChunk = word + ' ';
          }
        } else {
          currentChunk += word + ' ';
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());

      try {
        for (const chunk of chunks) {
            if (!isSequenceRunning.current) return;
            await playCloudAudioChunk(chunk, langCode, speakerType);
        }

        if (isSequenceRunning.current) {
            playCloudSequence(index + 1);
        }
      } catch (error) {
        console.error("Sequence Error:", error);
        setIsPlaying(false);
      }
  };

  const playLocalSequence = (index: number) => {
      if (!isSequenceRunning.current || index >= sentences.length) {
          stopAudioState();
          return;
      }

      setCurrentSentenceIndex(index);

      let rawText = sentences[index];
      let isMale = isDebateMode && /^(?:\*\*)?Alex(?:\*\*)?:/i.test(rawText);
      let isFemale = isDebateMode && /^(?:\*\*)?Sarah(?:\*\*)?:/i.test(rawText);
      let cleanTextToRead = isDebateMode ? rawText.replace(/^(?:\*\*)?(Alex|Sarah)(?:\*\*)?:\s*/i, '').trim() : rawText;

      const utterance = new SpeechSynthesisUtterance(cleanTextToRead);
      const voiceToUse = availableLocalVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (voiceToUse) utterance.voice = voiceToUse;

      utterance.rate = 1.0;
      if (isMale) utterance.pitch = 0.6;
      else if (isFemale) utterance.pitch = 1.4;
      else utterance.pitch = 1.0;

      utterance.onend = () => {
          if (isSequenceRunning.current) {
              playLocalSequence(index + 1);
          }
      };

      utterance.onerror = () => stopAudioState();
      window.speechSynthesis.speak(utterance);
  };

  const pauseAudio = () => {
    setIsPaused(true);
    if (selectedVoiceURI === 'cloud_google_voice' && cloudAudioRef.current) {
      cloudAudioRef.current.pause();
    }
    window.speechSynthesis.pause();
  };

  const resumeAudio = () => {
    setIsPaused(false);
    if (selectedVoiceURI === 'cloud_google_voice' && cloudAudioRef.current) {
      cloudAudioRef.current.play().catch(()=>{});
    }
    window.speechSynthesis.resume();
  };

  const stopAudio = () => {
    isSequenceRunning.current = false;
    stopAudioState();
  };

  const stopAudioState = () => {
      window.speechSynthesis.cancel();
      if (cloudAudioRef.current) {
          cloudAudioRef.current.pause();
          cloudAudioRef.current.removeAttribute('src');
          cloudAudioRef.current.load();
      }
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(-1);
  };

  const handleVoiceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    stopAudio();
    unlockAudioDOM();

    if (uri === 'cloud_google_voice') {
      let langCode = 'en';
      if (playbackLanguage === 'Bangla') langCode = 'bn';
      if (playbackLanguage === 'Hindi') langCode = 'hi';

      playCloudAudioChunk(t.previewText, langCode);
    } else {
      const voice = availableLocalVoices.find(v => v.voiceURI === uri);
      if (voice) {
        const utterance = new SpeechSynthesisUtterance(t.previewText);
        utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  useEffect(() => {
    if (currentSentenceIndex >= 0 && scrollRef.current) {
      const activeElem = scrollRef.current.querySelector('.active-sentence');
      if (activeElem) {
        activeElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSentenceIndex]);

  const toggleMusic = () => {
    if (!bgAudioRef.current) return;
    if (isMusicPlaying) {
      bgAudioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      bgAudioRef.current.play().catch(e => console.error("Audio block:", e));
      setIsMusicPlaying(true);
    }
  };

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed');
    if (data) setFiles(data);
  };

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_podcasts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setHistoryList(data);
  };

  const parseSentences = (text: string) => {
    const lines = text.split('\n').filter(s => s.trim().length > 0);
    return lines;
  };

  const submitTopic = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    unlockAudioDOM();
    stopAudio();
    setScript('');
    setIsDebateMode(false);
    setPlaybackLanguage(language);
    setIsLoading(true);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 Minutes Timeout Limit

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = getApiBaseUrl();
      const fetchUrl = `${baseUrl}/api/podcast/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, fileIds: selectedFileIds, language }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

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
                if (data.error === 'INSUFFICIENT_TOKENS') {
                  setRequiredTokensForModal(data.required || 15);
                  setShowTokenModal(true);
                  setIsLoading(false);
                  return;
                }
                throw new Error(data.error);
              }
              if (data.content) {
                fullText += data.content;
                setScript(fullText);
                setSentences(parseSentences(fullText));
              }
            } catch (e) {}
          }
        }
      }
      refreshTokens();
      setTimeout(() => fetchHistory(), 1500);

      // 🟢 Reset states and clear URL for clean UI after generation
      setTopic('');
      setSelectedFileIds([]);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
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

  const submitDebate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    unlockAudioDOM();
    stopAudio();
    setScript('');
    setIsDebateMode(true);
    setPlaybackLanguage(language);
    setIsLoading(true);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = getApiBaseUrl();
      const fetchUrl = `${baseUrl}/api/podcast/generate-debate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, fileIds: selectedFileIds, language }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

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
                if (data.error === 'INSUFFICIENT_TOKENS') {
                  setRequiredTokensForModal(data.required || 15);
                  setShowTokenModal(true);
                  setIsLoading(false);
                  return;
                }
                throw new Error(data.error);
              }
              if (data.content) {
                fullText += data.content;
                setScript(fullText);
                setSentences(parseSentences(fullText));
              }
            } catch (e) {}
          }
        }
      }
      refreshTokens();
      setTimeout(() => fetchHistory(), 1500);

      // 🟢 Reset states and clear URL for clean UI after generation
      setTopic('');
      setSelectedFileIds([]);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
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

  return (
    <SecureLayout>
      <OutOfTokensModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        requiredTokens={requiredTokensForModal}
      />
      <audio id="cloud-player" ref={cloudAudioRef} className="hidden" crossOrigin="anonymous" />
      <audio ref={bgAudioRef} className="hidden" loop src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" />

      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-50 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden lg:border-slate-200 lg:border lg:rounded-3xl shadow-2xl relative custom-scrollbar bg-slate-950 lg:bg-white">

        {/* 🟢 LEFT SIDE: CONFIGURATION (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-[35%] bg-slate-50 border-r border-slate-200 p-6 flex-col h-full shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Headphones size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.audioMode}</h2>
              <p className="text-xs font-bold text-slate-500">{t.listenOnGo}</p>
            </div>
          </div>

          <form className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t.whatToListen}</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.placeholder}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-400 outline-none resize-none font-medium text-slate-800 placeholder:text-slate-400 shadow-sm"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-slate-400 uppercase mb-3">{t.contextFiles}</label>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {files.map(file => (
                  <div key={file.id} onClick={() => setSelectedFileIds(prev => prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id])}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedFileIds.includes(file.id) ? 'bg-rose-50 border-rose-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex-shrink-0">
                      {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-rose-600" size={16} /> : <FileText className="text-slate-400" size={16} />}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-3">
              <button
                type="button"
                onClick={submitTopic}
                disabled={isLoading || !topic.trim()}
                className="w-full xl:w-1/2 py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isLoading ? t.generating : t.generateAudio}
              </button>

              <button
                type="button"
                onClick={submitDebate}
                disabled={isLoading || !topic.trim()}
                className="w-full xl:w-1/2 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                {isLoading ? t.generating : t.generateDebate}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
              <History size={14} className="text-rose-400" /> {t.yourLibrary}
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium text-center py-4 bg-white rounded-xl border border-dashed border-slate-200">{t.noHistory}</p>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      stopAudio();
                      setScript(item.script_content);
                      setSentences(parseSentences(item.script_content));
                      setTopic(item.topic);
                      setIsDebateMode(item.topic.startsWith('Debate:'));
                      // 🟢 FIXED: Restore original language from database!
                      if (item.language) {
                          setPlaybackLanguage(item.language as LanguageType);
                      }
                    }}
                    className="p-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl cursor-pointer transition-all shadow-sm"
                  >
                    <p className="text-sm font-bold text-slate-700 truncate">{item.topic.replace('Debate: ', '')}</p>
                    <p className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                      <span className="flex gap-1">
                          {item.language && <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{item.language.substring(0,2)}</span>}
                          {item.topic.startsWith('Debate:') && <span className="text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">Debate</span>}
                      </span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 🟢 RIGHT SIDE: MAIN UI */}
        <div className="w-full lg:w-[65%] bg-slate-950 lg:bg-slate-900 flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-rose-500"><Headphones size={16}/> {t.audioMode}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.listenOnGo}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 lg:p-8 min-h-0 relative">
            <div className="flex flex-col lg:flex-row items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-slate-700 mb-6 shadow-inner gap-4 z-10 relative">

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2 bg-slate-700 rounded-lg text-slate-300" title={t.voiceSettings}><Mic2 size={18} /></div>

              <select
                value={selectedVoiceURI}
                onChange={handleVoiceChange}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 outline-none font-medium max-w-[280px] flex-1 cursor-pointer hover:border-rose-500 transition-colors"
              >
                <option value="cloud_google_voice">☁️ {t.studioNetworkVoice} ({playbackLanguage})</option>

                {!isDebateMode && availableLocalVoices.map((v, i) => (
                  <option key={i} value={v.voiceURI}>
                    🎙️ {v.name.replace('Google', 'Device').replace('Microsoft', 'PC')}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={toggleMusic}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border w-full md:w-auto justify-center ${isMusicPlaying ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'}`}
            >
              <Music size={16} className={isMusicPlaying ? "animate-pulse" : ""} />
              {t.backgroundMusic}
            </button>
          </div>

          {!script && !isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
              <Volume2 size={60} className="text-slate-500 mb-4" />
              <h3 className="text-2xl font-bold text-slate-300">{t.scriptAwaits}</h3>
              <p className="text-slate-500 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">

              <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex flex-col lg:flex-row justify-between items-center gap-4 z-10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isPlaying && !isPaused ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]' : 'bg-slate-600'}`}></div>
                  <h3 className="text-lg font-black text-slate-200 tracking-wide uppercase">{isDebateMode ? t.debateScriptView : t.teleprompter}</h3>
                </div>
                <button onClick={() => router.push('/chat')} className="hidden lg:flex items-center gap-2 px-4 py-2 font-black rounded-lg transition uppercase tracking-wider text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">💬 {t.backToAiChat}</button>
              </div>

              <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar space-y-6 pb-40">
                {isLoading && sentences.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 gap-3">
                    <Loader2 className="animate-spin" size={24} /> <span>{t.generating}</span>
                  </div>
                ) : (
                  sentences.map((sentence, idx) => {
                    const isAlex = isDebateMode && /^(?:\*\*)?Alex(?:\*\*)?:/i.test(sentence);
                    const isSarah = isDebateMode && /^(?:\*\*)?Sarah(?:\*\*)?:/i.test(sentence);
                    const text = isDebateMode ? sentence.replace(/^(?:\*\*)?(Alex|Sarah)(?:\*\*)?:\s*/i, '') : sentence;

                    return (
                      <p
                        key={idx}
                        onClick={() => playAudio(idx)}
                        className={`text-2xl md:text-3xl font-bold leading-relaxed cursor-pointer transition-all duration-300 ${
                          idx === currentSentenceIndex
                            ? 'text-white active-sentence scale-[1.02] origin-left'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {isAlex && <span className="text-blue-500 mr-3 uppercase tracking-widest text-sm bg-blue-500/10 px-2 py-1 rounded-md">ALEX</span>}
                        {isSarah && <span className="text-rose-400 mr-3 uppercase tracking-widest text-sm bg-rose-500/10 px-2 py-1 rounded-md">SARAH</span>}
                        {text}
                      </p>
                    )
                  })
                )}
                <div className="h-40"></div>
              </div>

              {sentences.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-lg border border-slate-700 p-3 rounded-full shadow-2xl flex items-center gap-4">
                  {!isPlaying ? (
                    <button onClick={() => playAudio(0)} className="w-14 h-14 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition shadow-lg shadow-rose-600/30">
                      <Play size={24} className="ml-1" />
                    </button>
                  ) : isPaused ? (
                    <button onClick={resumeAudio} className="w-14 h-14 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition shadow-lg shadow-rose-600/30">
                      <Play size={24} className="ml-1" />
                    </button>
                  ) : (
                    <button onClick={pauseAudio} className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-white rounded-full flex items-center justify-center transition shadow-lg shadow-amber-500/30">
                      <Pause size={24} />
                    </button>
                  )}
                  <button onClick={stopAudio} disabled={!isPlaying} className="w-12 h-12 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-full flex items-center justify-center transition">
                    <Square size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            {/* Mobile Action Pills */}
            <div className="flex gap-2 overflow-x-auto mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('config')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${topic ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                <Settings2 size={12}/> {t.config}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('history')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/80 border-slate-700 text-slate-400">
                <History size={12}/> {t.library}
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/50 to-orange-500/50 rounded-[2rem] blur-md opacity-70 transition duration-500 group-focus-within:opacity-100"></div>
              <div className="relative flex shadow-xl rounded-[2rem] border transition-all backdrop-blur-xl overflow-hidden p-1 bg-slate-900/90 border-slate-700/50 focus-within:border-rose-500 focus-within:bg-slate-900">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder={t.placeholder}
                  disabled={isLoading}
                  className="w-full pl-4 pr-2 py-3 bg-transparent border-none focus:ring-0 outline-none disabled:opacity-50 text-sm font-medium text-white placeholder:text-slate-500"
                />
              </div>
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
              {isMobileDrawerOpen === 'config' && <><Settings2 size={18} className="text-rose-500"/> {t.audioConfiguration}</>}
              {isMobileDrawerOpen === 'history' && <><History size={18} className="text-rose-500"/> {t.yourLibrary}</>}
            </h3>
          </div>

          {/* Config Drawer */}
          {isMobileDrawerOpen === 'config' && (
             <div className="space-y-6 pb-20">
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t.targetTopic}</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-rose-400 outline-none resize-none font-medium text-white placeholder:text-slate-500 shadow-sm"
                    rows={3}
                  />
               </div>

               <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">{t.contextFilesNumbered} <span className="text-[9px] text-slate-500">{t.optional}</span></label>
                 <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                   {files.map(file => (
                    <div key={file.id} onClick={() => setSelectedFileIds(prev => prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id])}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedFileIds.includes(file.id) ? 'bg-rose-500/20 border-rose-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex-shrink-0">
                        {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-rose-500" size={16} /> : <FileText className="text-slate-500" size={16} />}
                      </div>
                      <p className={`text-xs font-semibold truncate ${selectedFileIds.includes(file.id) ? 'text-rose-300' : 'text-slate-300'}`}>{file.name}</p>
                    </div>
                  ))}
                 </div>
               </div>

               <div className="flex flex-col gap-3 mt-4">
                 <button
                   type="button"
                   onClick={(e) => { submitTopic(e); setIsMobileDrawerOpen('none'); }}
                   disabled={isLoading || !topic.trim()}
                   className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-slate-700"
                 >
                   {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                   {isLoading ? t.generating : t.generateAudio}
                 </button>

                 <button
                   type="button"
                   onClick={(e) => { submitDebate(e); setIsMobileDrawerOpen('none'); }}
                   disabled={isLoading || !topic.trim()}
                   className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                 >
                   {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                   {isLoading ? t.generating : t.generateDebate}
                 </button>
               </div>
             </div>
          )}

          {/* History Drawer */}
          {isMobileDrawerOpen === 'history' && (
             <div className="space-y-3 pb-20">
                {historyList.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium text-center py-6 bg-slate-950 rounded-xl border border-dashed border-slate-800">{t.noHistory}</p>
                ) : (
                  historyList.map(item => (
                    <div key={item.id} onClick={() => {
                        stopAudio();
                        setScript(item.script_content);
                        setSentences(parseSentences(item.script_content));
                        setTopic(item.topic);
                        setIsDebateMode(item.topic.startsWith('Debate:'));
                        if (item.language) setPlaybackLanguage(item.language as LanguageType);
                        setIsMobileDrawerOpen('none');
                      }}
                      className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all shadow-sm"
                    >
                       <h4 className="font-bold text-slate-200 text-sm truncate">{item.topic.replace('Debate: ', '')}</h4>
                       <p className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mt-2">
                         {new Date(item.created_at).toLocaleDateString()}
                         <span className="flex gap-1">
                             {item.language && <span className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md">{item.language.substring(0,2)}</span>}
                             {item.topic.startsWith('Debate:') && <span className="text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-md">Debate</span>}
                         </span>
                       </p>
                    </div>
                  ))
                )}
             </div>
          )}

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

export default function PodcastPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><PodcastPageContent /></Suspense>;
}
