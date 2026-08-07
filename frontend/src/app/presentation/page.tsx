'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Projector, Sparkles, Loader2, FileText, CheckCircle2, History, Trash2, ShieldCheck, ChevronLeft, ChevronRight, Mic, Copy, Check, Pencil, Save, LayoutTemplate, MonitorUp, Download, Share2, X } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    title: "AI Slide Deck Maker",
    subtitle: "Instantly convert topics & PDFs into Presentations",
    topicLabel: "Presentation Topic",
    topicPlaceholder: "e.g., Global Warming, Chapter 4 Summary...",
    slidesLabel: "Number of Slides",
    generateBtn: "Generate Presentation",
    generating: "Crafting Slides...",
    historyTitle: "Your Saved Decks",
    noHistory: "No presentations generated yet.",
    deckAwaits: "Your Deck Awaits",
    awaitsDesc: "Provide a topic and select context files. AI will build a complete 16:9 presentation with speaker notes.",
    proBadge: "PRO TIER FEATURE",
    copied: "Copied!",
    deckTemplate: "Deck Template",
    bgMotion: "Background motion",
    contextFiles: "Context Files",
    deckDesign: "Deck design",
    saveChangesNote: "Use Save changes in Edit Slide to persist this deck design.",
    mobileTemplateNote: "Template and motion changes are ready. Use Save changes in Edit Slide to keep them with this deck.",
    saveToDevice: "Save to device",
    liveShare: "Live Share",
    livePresent: "Live Present",
    chat: "Chat",
    useArrowKeys: "Use Arrow Keys to Navigate",
    editSlide: "Edit Slide",
    closeEditor: "Close Editor",
    script: "Script",
    copySlide: "Copy Slide",
    editSlideTitle: "Edit slide",
    saveChanges: "Save changes",
    editTitleLabel: "Title",
    editPointsLabel: "Points (one per line)",
    editNotesLabel: "Speaker notes",
    newDeck: "New Deck",
    done: "Done",
    createDeck: "Create Deck"
  },
  Bangla: {
    title: "এআই স্লাইড ডেক মেকার",
    subtitle: "যেকোনো টপিক বা পিডিএফ থেকে প্রেজেন্টেশন বানান",
    topicLabel: "প্রেজেন্টেশনের টপিক",
    topicPlaceholder: "যেমন: Global Warming, Chapter 4 Summary...",
    slidesLabel: "স্লাইডের সংখ্যা",
    generateBtn: "প্রেজেন্টেশন তৈরি করুন",
    generating: "স্লাইড বানানো হচ্ছে...",
    historyTitle: "আপনার সেভ করা স্লাইডসমূহ",
    noHistory: "এখনো কোনো প্রেজেন্টেশন তৈরি করা হয়নি।",
    deckAwaits: "আপনার স্লাইডের অপেক্ষায়",
    awaitsDesc: "বামে টপিক এবং ফাইল সিলেক্ট করুন। এআই স্পিকার নোটস সহ একটি সম্পূর্ণ প্রেজেন্টেশন বানিয়ে দেবে।",
    proBadge: "প্রো-টিয়ার ফিচার",
    copied: "কপি হয়েছে!",
    deckTemplate: "ডেক টেমপ্লেট",
    bgMotion: "ব্যাকগ্রাউন্ড মোশন",
    contextFiles: "কনটেক্সট ফাইল",
    deckDesign: "ডেক ডিজাইন",
    saveChangesNote: "এই ডেক ডিজাইন সেভ করতে Edit Slide থেকে Save changes ব্যবহার করুন।",
    mobileTemplateNote: "টেম্পলেট এবং মোশন চেঞ্জ রেডি। এই ডেকের সাথে সেভ রাখতে Edit Slide থেকে Save changes ব্যবহার করুন।",
    saveToDevice: "ডিভাইসে সেভ করুন",
    liveShare: "লাইভ শেয়ার",
    livePresent: "লাইভ প্রেজেন্ট",
    chat: "চ্যাট",
    useArrowKeys: "নেভিগেট করতে Arrow Keys ব্যবহার করুন",
    editSlide: "স্লাইড এডিট করুন",
    closeEditor: "এডিটর বন্ধ করুন",
    script: "স্ক্রিপ্ট",
    copySlide: "স্লাইড কপি করুন",
    editSlideTitle: "স্লাইড এডিট করুন",
    saveChanges: "পরিবর্তন সেভ করুন",
    editTitleLabel: "শিরোনাম",
    editPointsLabel: "পয়েন্টস (প্রতি লাইনে একটি)",
    editNotesLabel: "স্পিকার নোটস",
    newDeck: "নতুন ডেক",
    done: "সম্পন্ন",
    createDeck: "ডেক তৈরি করুন"
  },
  Hindi: {
    title: "AI स्लाइड डेक मेकर",
    subtitle: "विषयों और पीडीएफ को तुरंत प्रस्तुतियों में बदलें",
    topicLabel: "प्रस्तुति का विषय",
    topicPlaceholder: "उदा. Global Warming, Chapter 4 Summary...",
    slidesLabel: "स्लाइडों की संख्या",
    generateBtn: "प्रस्तुति उत्पन्न करें",
    generating: "स्लाइड बनाई जा रही हैं...",
    historyTitle: "आपके सहेजे गए डेक",
    noHistory: "अभी तक कोई प्रस्तुति नहीं बनाई गई।",
    deckAwaits: "आपके डेक की प्रतीक्षा में",
    awaitsDesc: "बाईं ओर अपना विषय और फ़ाइलें चुनें। AI स्पीकर नोट्स के साथ एक संपूर्ण प्रस्तुति तैयार करेगा।",
    proBadge: "प्रो टियर फ़ीचर",
    copied: "कॉपी किया गया!",
    deckTemplate: "डेक टेम्प्लेट",
    bgMotion: "बैकग्राउंड मोशन",
    contextFiles: "संदर्भ फ़ाइलें",
    deckDesign: "डेक डिज़ाइन",
    saveChangesNote: "इस डेक डिज़ाइन को सहेजने के लिए Edit Slide में Save changes का उपयोग करें।",
    mobileTemplateNote: "टेम्प्लेट और मोशन परिवर्तन तैयार हैं। इन्हें इस डेक के साथ सहेजने के लिए Edit Slide में Save changes का उपयोग करें।",
    saveToDevice: "डिवाइस में सहेजें",
    liveShare: "लाइव शेयर",
    livePresent: "लाइव प्रेजेंट",
    chat: "चैट",
    useArrowKeys: "नेविगेट करने के लिए Arrow Keys का उपयोग करें",
    editSlide: "स्लाइड संपादित करें",
    closeEditor: "संपादक बंद करें",
    script: "स्क्रिप्ट",
    copySlide: "स्लाइड कॉपी करें",
    editSlideTitle: "स्लाइड संपादित करें",
    saveChanges: "परिवर्तन सहेजें",
    editTitleLabel: "शीर्षक",
    editPointsLabel: "बिंदु (प्रति पंक्ति एक)",
    editNotesLabel: "स्पीकर नोट्स",
    newDeck: "नया डेक",
    done: "संपन्न",
    createDeck: "डेक बनाएं"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const presentationTemplates = [
  { id: 'aurora', name: 'Aurora Glass', description: 'Violet and cyan glow', canvas: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950', accent: 'from-violet-400 to-cyan-400' },
  { id: 'midnight', name: 'Midnight Executive', description: 'Premium dark corporate', canvas: 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950', accent: 'from-blue-500 to-slate-300' },
  { id: 'orbit', name: 'Orbit Science', description: 'Space and data driven', canvas: 'bg-gradient-to-br from-[#090a1d] via-[#191054] to-[#071a35]', accent: 'from-fuchsia-500 to-indigo-400' },
  { id: 'bloom', name: 'Neo Bloom', description: 'Bright, fresh, energetic', canvas: 'bg-gradient-to-br from-rose-950 via-fuchsia-900 to-indigo-950', accent: 'from-rose-400 to-violet-400' },
  { id: 'prism', name: 'Prism Studio', description: 'Bold creative geometry', canvas: 'bg-gradient-to-br from-orange-950 via-fuchsia-950 to-violet-950', accent: 'from-amber-400 to-fuchsia-500' },
  { id: 'zenith', name: 'Zenith Minimal', description: 'High contrast clarity', canvas: 'bg-gradient-to-br from-black via-slate-900 to-sky-950', accent: 'from-white to-sky-400' },
] as const;

type TemplateId = typeof presentationTemplates[number]['id'];
const animationStyles = [
  { id: 'bubbles', name: 'Bubbles' }, { id: 'rectangles', name: 'Rectangles' }, { id: 'stars', name: 'Stars' },
  { id: 'winter', name: 'Winter' }, { id: 'summer', name: 'Summer' }, { id: 'forest', name: 'Trees' }, { id: 'none', name: 'Still' },
] as const;
type AnimationStyle = typeof animationStyles[number]['id'];

function TemplatePicker({ value, onChange, compact = false, label = "Deck Template" }: { value: TemplateId; onChange: (value: TemplateId) => void; compact?: boolean; label?: string }) {
  return (
    <div>
      <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2"><LayoutTemplate size={14} /> {label}</label>
      <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
        {presentationTemplates.map((template) => (
          <button key={template.id} type="button" onClick={() => onChange(template.id)} className={`text-left rounded-xl border p-3 transition-all ${value === template.id ? 'border-violet-400 ring-1 ring-violet-400 bg-violet-500/15' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
            <span className={`block h-7 rounded-lg bg-gradient-to-r ${template.accent} mb-2 opacity-90`} />
            <span className="block text-xs font-black text-slate-200">{template.name}</span>
            {!compact && <span className="block text-[10px] text-slate-500 mt-1">{template.description}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnimationPicker({ value, onChange, label = "Background motion" }: { value: AnimationStyle; onChange: (value: AnimationStyle) => void; label?: string }) {
  return <div>
    <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-3">{label}</label>
    <div className="flex flex-wrap gap-2">{animationStyles.map((style) => <button key={style.id} type="button" onClick={() => onChange(style.id)} className={`px-3 py-2 rounded-xl text-xs font-black border transition ${value === style.id ? 'bg-violet-500/20 border-violet-400 text-violet-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}>{style.name}</button>)}</div>
  </div>;
}

export default function PresentationPage() {
  const supabase = createClient();
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState<number>(7);
  const [templateId, setTemplateId] = useState<TemplateId>('aurora');
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('bubbles');
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [slidesData, setSlidesData] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  // 🟢 MOBILE UI STATES
  const scrollRef = useRef<HTMLDivElement>(null);
  const presentationCanvasRef = useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'history'|'config'|'template'>('none');
  const [isMobileShareOpen, setIsMobileShareOpen] = useState(false);
  const [isDesktopTemplateOpen, setIsDesktopTemplateOpen] = useState(false);
  const [isDesktopShareOpen, setIsDesktopShareOpen] = useState(false);
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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!slidesData?.slides) return;
    if (e.key === 'ArrowRight') {
      setCurrentSlideIndex((prev) => Math.min(prev + 1, slidesData.slides.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
    }
  }, [slidesData]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed').order('created_at', { ascending: false });
    if (data) setFiles(data);
  };


  const submitPresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setSlidesData(null);
    setCurrentSlideIndex(0);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/presentation/generate` : `${apiUrlBase}/api/presentation/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, fileIds: selectedFileIds, slideCount, language, templateId, animationStyle }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 15);
            setShowTokenModal(true);
            setIsLoading(false);
            return;
        }
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }
      if (!data.valid || !data.slidesData) {
        throw new Error("Failed to format presentation properly. Please try again.");
      }

      // 🟢 FIXED: Directly use the data and saved ID returned by the backend
      setSlidesData(data.slidesData);
      if (data.savedId) {
        setActiveDeckId(data.savedId);
      }

      refreshTokens();
      // Refresh the left sidebar to show the newly saved presentation
      fetchHistory();

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

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrlBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/presentation/history` : `${apiUrlBase}/api/presentation/history`;

      const response = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const deleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrlBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/presentation/history/${id}` : `${apiUrlBase}/api/presentation/history/${id}`;

      await fetch(fetchUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (activeDeckId === id) {
        setActiveDeckId(null);
        setSlidesData(null);
      }
      fetchHistory();
    } catch (e) {
      console.error('Failed to delete deck', e);
    }
  };

  const copySlideText = () => {
    if (!slidesData) return;
    const current = slidesData.slides[currentSlideIndex];
    const text = `TITLE: ${current.title}\n\nPOINTS:\n${current.points.map((p: string) => `- ${p}`).join('\n')}\n\nSPEAKER NOTES:\n${current.speakerNotes}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectDeck = (deck: any) => {
    setActiveDeckId(deck.id);
    setSlidesData(deck.slides_data);
    setTemplateId((deck.slides_data?.templateId as TemplateId) || 'aurora');
    setAnimationStyle((deck.slides_data?.animationStyle as AnimationStyle) || 'bubbles');
    setCurrentSlideIndex(0);
    setIsEditing(false);
  };

  const updateCurrentSlide = (field: 'title' | 'points' | 'speakerNotes', value: string) => {
    setSlidesData((current: any) => {
      if (!current?.slides) return current;
      const slides = current.slides.map((slide: any, index: number) => index === currentSlideIndex
        ? { ...slide, [field]: field === 'points' ? value.split('\n').map(point => point.trim()).filter(Boolean) : value }
        : slide);
      return { ...current, slides };
    });
  };

  const updateDeckTemplate = (nextTemplate: TemplateId) => {
    setTemplateId(nextTemplate);
    setSlidesData((current: any) => current ? { ...current, templateId: nextTemplate } : current);
  };

  const updateDeckAnimation = (nextAnimation: AnimationStyle) => {
    setAnimationStyle(nextAnimation);
    setSlidesData((current: any) => current ? { ...current, animationStyle: nextAnimation } : current);
  };

  const saveDeckEdits = async () => {
    if (!activeDeckId || !slidesData || isSavingDeck) return;
    setIsSavingDeck(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/presentation/history/${activeDeckId}` : `${apiUrlBase}/api/presentation/history/${activeDeckId}`;
      const response = await fetch(fetchUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ slidesData }),
      });
      if (!response.ok) throw new Error('Could not save deck changes');
      setHistoryList((current) => current.map((deck) => deck.id === activeDeckId ? { ...deck, slides_data: slidesData } : deck));
      setIsEditing(false);
    } catch (error: any) {
      showPublicError();
    } finally {
      setIsSavingDeck(false);
    }
  };

  const openLivePresentation = async () => {
    if (!presentationCanvasRef.current) return;
    try {
      await presentationCanvasRef.current.requestFullscreen();
    } catch {
      alert('Fullscreen is not available in this browser.');
    }
  };

  const shareLivePresentation = async () => {
    if (!slidesData?.slides) return;
    const shareData = { title: topic || slidesData.slides[0]?.title || 'My presentation', text: 'Open my live presentation in StudyAI', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Presentation link copied.');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') alert('Could not share the presentation link.');
    }
  };

  const downloadPresentation = () => {
    if (!slidesData?.slides) return;
    const safeDeck = JSON.stringify({ ...slidesData, templateId, animationStyle }).replace(/</g, '\\u003c');
    const safeTitle = String(topic || slidesData.slides[0]?.title || 'presentation').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
    const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>body{margin:0;background:#050816;color:#fff;font-family:Arial,sans-serif}.deck{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:4vw;box-sizing:border-box;background:radial-gradient(circle at 15% 20%,#7c3aed55,transparent 25%),radial-gradient(circle at 85% 80%,#06b6d455,transparent 28%),linear-gradient(135deg,#090a1d,#191054,#071a35);overflow:hidden}.bubble{position:fixed;border-radius:50%;filter:blur(8px);opacity:.35;animation:float 9s ease-in-out infinite}.b1{width:22vw;height:22vw;background:#a855f7;top:-7vw;right:-4vw}.b2{width:18vw;height:18vw;background:#22d3ee;bottom:-5vw;left:-4vw;animation-delay:-4s}@keyframes float{50%{transform:translate(-5vw,5vh) scale(1.14)}}.slide{width:min(1100px,90vw);min-height:58vh;padding:6vw;box-sizing:border-box;border:1px solid #ffffff24;border-radius:28px;background:#0f172acc;box-shadow:0 30px 80px #0008;position:relative}.number{position:absolute;right:30px;bottom:24px;color:#94a3b8}.title{font-size:clamp(2rem,5vw,4.5rem);margin:0 0 2rem}.points{font-size:clamp(1.1rem,2.1vw,1.8rem);line-height:1.6}.hint{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);color:#cbd5e1;font-size:13px}</style></head><body><div class="deck"><i class="bubble b1"></i><i class="bubble b2"></i><main class="slide"><div id="content"></div><div class="number" id="number"></div></main></div><div class="hint">Use ← → arrow keys to navigate</div><script>const deck=${safeDeck};let i=0;function draw(){const s=deck.slides[i];document.getElementById('content').innerHTML='<h1 class="title"></h1><ul class="points"></ul>';document.querySelector('.title').textContent=s.title;const ul=document.querySelector('.points');s.points.forEach(p=>{const li=document.createElement('li');li.textContent=p;ul.appendChild(li)});document.getElementById('number').textContent=(i+1)+' / '+deck.slides.length}document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')i=Math.min(i+1,deck.slides.length-1);if(e.key==='ArrowLeft')i=Math.max(i-1,0);draw()});draw()</script></body></html>`;
    const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle || 'presentation'}.html`;
    link.click();
    URL.revokeObjectURL(url);
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

        {/* Left Panel: Controls (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-violet-500 to-fuchsia-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Projector size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-xs font-bold text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={submitPresentation} className="space-y-5">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.topicLabel}</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.topicPlaceholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-600 shadow-inner"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.slidesLabel}</label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none font-bold text-slate-200 cursor-pointer"
                >
                  {[5, 7, 10, 15].map(num => <option key={num} value={num}>{num} Slides</option>)}
                </select>
              </div>
            </div>

            <TemplatePicker value={templateId} onChange={setTemplateId} label={t.deckTemplate} />
            <AnimationPicker value={animationStyle} onChange={setAnimationStyle} label={t.bgMotion} />

            {/* Context Files */}
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-3">{t.contextFiles}</label>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {files.map(file => (
                  <div key={file.id} onClick={() => {
                      if (selectedFileIds.includes(file.id)) setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                      else setSelectedFileIds([...selectedFileIds, file.id]);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedFileIds.includes(file.id) ? 'bg-violet-500/20 border-violet-500/50 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex-shrink-0">
                      {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-violet-400" size={16} /> : <FileText className="text-slate-600" size={16} />}
                    </div>
                    <p className="text-xs font-semibold text-slate-300 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isLoading || !topic.trim()} className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-8 pt-8 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <History size={14} className="text-violet-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-600 font-medium text-center py-4 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                  {t.noHistory}
                </p>
              ) : (
                historyList.map((item) => {
                  const isActive = activeDeckId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => selectDeck(item)}
                      className={`group p-4 rounded-xl cursor-pointer transition-all shadow-sm border ${isActive ? 'bg-violet-500/10 border-violet-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-sm font-bold truncate pr-2 ${isActive ? 'text-violet-300' : 'text-slate-300'}`}>{item.topic}</h4>
                        <button onClick={(e) => deleteDeck(item.id, e)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Projector size={12}/> {item.slide_count} Slides
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Presentation Viewer */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950 lg:bg-slate-50">
          <div className="hidden lg:flex absolute right-7 top-7 z-30 items-center gap-2">
            <div className="relative">
              <button onClick={() => { setIsDesktopTemplateOpen((open) => !open); setIsDesktopShareOpen(false); }} aria-label="Presentation template" className="p-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg"><LayoutTemplate size={18}/></button>
              {isDesktopTemplateOpen && (
                <div className="absolute right-0 top-14 w-[360px] max-h-[calc(100vh-110px)] overflow-y-auto p-5 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl space-y-6 custom-scrollbar">
                  <div className="flex items-center justify-between"><h3 className="font-black text-white">{t.deckDesign}</h3><button onClick={() => setIsDesktopTemplateOpen(false)} className="text-slate-400 hover:text-white"><X size={18}/></button></div>
                  <TemplatePicker value={templateId} onChange={slidesData ? updateDeckTemplate : setTemplateId} label={t.deckTemplate} />
                  <AnimationPicker value={animationStyle} onChange={slidesData ? updateDeckAnimation : setAnimationStyle} label={t.bgMotion} />
                  {slidesData && <p className="text-xs text-slate-400">{t.saveChangesNote}</p>}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setIsDesktopShareOpen((open) => !open); setIsDesktopTemplateOpen(false); }} aria-label="Presentation share options" className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"><Share2 size={18}/></button>
              {isDesktopShareOpen && (
                <div className="absolute right-0 top-14 w-48 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1">
                  <button onClick={() => { downloadPresentation(); setIsDesktopShareOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-slate-200 hover:bg-slate-800"><Download size={15}/> {t.saveToDevice}</button>
                  <button onClick={() => { void shareLivePresentation(); setIsDesktopShareOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-slate-200 hover:bg-slate-800"><Share2 size={15}/> {t.liveShare}</button>
                  <button onClick={() => { void openLivePresentation(); setIsDesktopShareOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-slate-200 hover:bg-slate-800"><MonitorUp size={15}/> {t.livePresent}</button>
                </div>
              )}
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-3 font-black rounded-xl transition uppercase tracking-wider text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">{t.chat}</button>
          </div>

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-violet-500"><Projector size={16}/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <div className="relative flex items-center gap-1.5">
              <button onClick={() => setIsMobileDrawerOpen('template')} aria-label="Presentation template" className="p-2 rounded-lg bg-violet-600 text-white shadow-md"><LayoutTemplate size={16}/></button>
              <button onClick={() => setIsMobileShareOpen((open) => !open)} aria-label="Presentation share options" className="p-2 rounded-lg bg-emerald-600 text-white shadow-md"><Share2 size={16}/></button>
              <button onClick={() => window.location.href='/chat'} className="px-2 py-2 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">{t.chat}</button>
              {isMobileShareOpen && (
                <div className="absolute right-0 top-11 w-48 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 space-y-1">
                  <button onClick={() => { downloadPresentation(); setIsMobileShareOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-slate-200 hover:bg-slate-800"><Download size={15}/> {t.saveToDevice}</button>
                  <button onClick={() => { void shareLivePresentation(); setIsMobileShareOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-slate-200 hover:bg-slate-800"><Share2 size={15}/> {t.liveShare}</button>
                  <button onClick={() => { void openLivePresentation(); setIsMobileShareOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs font-bold text-slate-200 hover:bg-slate-800"><MonitorUp size={15}/> {t.livePresent}</button>
                </div>
              )}
            </div>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar p-4 lg:p-8 pb-30">
            {!slidesData && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <Projector size={60} className="text-slate-300 mb-4" />
              <h3 className="text-2xl font-bold text-slate-400">{t.deckAwaits}</h3>
              <p className="text-slate-500 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 size={48} className="text-violet-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold">{t.generating}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">

              {/* 16:9 Presentation Canvas */}
              <div ref={presentationCanvasRef} className={`relative w-full aspect-video ${presentationTemplates.find((template) => template.id === templateId)?.canvas || presentationTemplates[0].canvas} rounded-2xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col justify-center p-12 md:p-20`}>

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl"></div>
                {animationStyle === 'bubbles' && <><div aria-hidden className="presentation-bubble presentation-bubble-one"></div><div aria-hidden className="presentation-bubble presentation-bubble-two"></div><div aria-hidden className="presentation-bubble presentation-bubble-three"></div></>}
                {animationStyle === 'rectangles' && <><div aria-hidden className="presentation-rectangle rectangle-one"></div><div aria-hidden className="presentation-rectangle rectangle-two"></div><div aria-hidden className="presentation-rectangle rectangle-three"></div></>}
                {animationStyle === 'stars' && <div aria-hidden className="presentation-stars">{Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ left: `${(index * 29) % 96}%`, top: `${(index * 43) % 92}%`, animationDelay: `${-index * .45}s` }} />)}</div>}
                {animationStyle === 'winter' && <div aria-hidden className="presentation-snow">{Array.from({ length: 26 }).map((_, index) => <i key={index} style={{ left: `${(index * 17) % 98}%`, animationDelay: `${-index * .3}s` }} />)}</div>}
                {animationStyle === 'summer' && <><div aria-hidden className="presentation-sun"></div><div aria-hidden className="presentation-sunray"></div></>}
                {animationStyle === 'forest' && <div aria-hidden className="presentation-forest">{Array.from({ length: 9 }).map((_, index) => <i key={index} style={{ left: `${index * 12 - 4}%`, height: `${34 + (index % 3) * 11}%` }} />)}</div>}

                <div className="relative z-10 w-full h-full flex flex-col">
                  {currentSlideIndex === 0 ? (
                    // Title Slide Style
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                        {slidesData.slides[currentSlideIndex].title}
                      </h1>
                      <div className="w-16 h-1 bg-violet-500 rounded-full mb-6"></div>
                      <div className="space-y-3">
                        {slidesData.slides[currentSlideIndex].points.map((point: string, idx: number) => (
                          <p key={idx} className="text-lg md:text-xl font-medium text-slate-300">{point}</p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Content Slide Style
                    <div className="flex-1 flex flex-col">
                      <h2 className="text-3xl md:text-4xl font-black text-white mb-8 pb-4 border-b border-white/10">
                        {slidesData.slides[currentSlideIndex].title}
                      </h2>
                      <ul className="space-y-6 flex-1 flex flex-col justify-center">
                        {slidesData.slides[currentSlideIndex].points.map((point: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-4">
                            <span className="shrink-0 w-2 h-2 mt-2.5 rounded-full bg-violet-500"></span>
                            <span className="text-lg md:text-2xl font-medium text-slate-200 leading-snug">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-6 right-8 text-slate-500 font-mono text-sm font-bold">
                  {slidesData.slides[currentSlideIndex].slideNumber} / {slidesData.slides.length}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col lg:flex-row justify-between items-center mt-6 gap-4 px-2">
                <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
                  <button onClick={() => setCurrentSlideIndex(p => Math.max(0, p - 1))} disabled={currentSlideIndex === 0} className="flex-1 lg:flex-none p-3 lg:p-3 bg-slate-900 lg:bg-white border border-slate-800 lg:border-slate-200 hover:bg-slate-800 lg:hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-all shadow-sm flex justify-center items-center">
                    <ChevronLeft size={20} className="text-slate-300 lg:text-slate-700"/>
                  </button>
                  <button onClick={() => setCurrentSlideIndex(p => Math.min(slidesData.slides.length - 1, p + 1))} disabled={currentSlideIndex === slidesData.slides.length - 1} className="flex-1 lg:flex-none p-3 lg:p-3 bg-slate-900 lg:bg-white border border-slate-800 lg:border-slate-200 hover:bg-slate-800 lg:hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-all shadow-sm flex justify-center items-center">
                    <ChevronRight size={20} className="text-slate-300 lg:text-slate-700"/>
                  </button>
                  <span className="text-xs font-bold text-slate-500 lg:text-slate-400 ml-2 hidden lg:block">{t.useArrowKeys}</span>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  <button onClick={openLivePresentation} className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-bold transition-all border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30">
                    <MonitorUp size={16} /> {t.livePresent}
                  </button>
                  <button onClick={downloadPresentation} className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-bold transition-all border bg-slate-900 lg:bg-white text-slate-300 lg:text-slate-600 border-slate-800 lg:border-slate-200">
                    <Download size={16} /> {t.saveToDevice}
                  </button>
                  <button onClick={() => setIsEditing((current) => !current)} className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-bold transition-all border ${isEditing ? 'bg-violet-500/20 text-violet-400 border-violet-500/50' : 'bg-slate-900 lg:bg-white text-slate-300 lg:text-slate-600 border-slate-800 lg:border-slate-200'}`}>
                    <Pencil size={16} /> {isEditing ? t.closeEditor : t.editSlide}
                  </button>
                  <button onClick={() => setShowNotes(!showNotes)} className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-bold transition-all border ${showNotes ? 'bg-violet-500/20 lg:bg-violet-100 text-violet-400 lg:text-violet-700 border-violet-500/50 lg:border-violet-200' : 'bg-slate-900 lg:bg-white text-slate-300 lg:text-slate-600 border-slate-800 lg:border-slate-200 hover:bg-slate-800 lg:hover:bg-slate-50'}`}>
                    <Mic size={16} /> {t.script}
                  </button>
                  <button onClick={copySlideText} className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-bold transition-all border bg-slate-900 lg:bg-white text-slate-300 lg:text-slate-600 border-slate-800 lg:border-slate-200 hover:bg-slate-800 lg:hover:bg-slate-50 shadow-sm">
                    {copied ? <Check size={16} className="text-emerald-400 lg:text-emerald-500"/> : <Copy size={16} />} {copied ? t.copied : t.copySlide}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 p-5 bg-slate-900 lg:bg-white border border-violet-500/30 lg:border-violet-200 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-black text-slate-100 lg:text-slate-800 flex items-center gap-2"><Pencil size={16} className="text-violet-400" /> {t.editSlideTitle} {currentSlideIndex + 1}</h4>
                    <button onClick={saveDeckEdits} disabled={!activeDeckId || isSavingDeck} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white text-sm font-black flex items-center gap-2">
                      {isSavingDeck ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {t.saveChanges}
                    </button>
                  </div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t.editTitleLabel}
                    <input value={slidesData.slides[currentSlideIndex].title} onChange={(e) => updateCurrentSlide('title', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 lg:border-slate-200 bg-slate-950 lg:bg-slate-50 text-slate-100 lg:text-slate-800 p-3 font-semibold outline-none focus:ring-2 focus:ring-violet-500" />
                  </label>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t.editPointsLabel}
                    <textarea value={slidesData.slides[currentSlideIndex].points.join('\n')} onChange={(e) => updateCurrentSlide('points', e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-700 lg:border-slate-200 bg-slate-950 lg:bg-slate-50 text-slate-100 lg:text-slate-800 p-3 font-medium outline-none focus:ring-2 focus:ring-violet-500" />
                  </label>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t.editNotesLabel}
                    <textarea value={slidesData.slides[currentSlideIndex].speakerNotes || ''} onChange={(e) => updateCurrentSlide('speakerNotes', e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 lg:border-slate-200 bg-slate-950 lg:bg-slate-50 text-slate-100 lg:text-slate-800 p-3 font-medium outline-none focus:ring-2 focus:ring-violet-500" />
                  </label>
                  <TemplatePicker value={templateId} onChange={updateDeckTemplate} compact label={t.deckTemplate} />
                  <AnimationPicker value={animationStyle} onChange={updateDeckAnimation} label={t.bgMotion} />
                </div>
              )}

              {/* Speaker Notes Drawer */}
              {showNotes && (
                <div className="mt-4 p-5 bg-amber-500/10 lg:bg-amber-50 border border-amber-500/30 lg:border-amber-200 rounded-2xl shadow-inner animate-in slide-in-from-bottom-4">
                  <h4 className="text-xs font-black text-amber-500 lg:text-amber-600 uppercase tracking-widest flex items-center gap-2 mb-2"><Mic size={14}/> {t.script}</h4>
                  <p className="text-sm font-medium text-amber-200 lg:text-amber-900 leading-relaxed">
                    {slidesData.slides[currentSlideIndex].speakerNotes}
                  </p>
                </div>
              )}

              <style jsx>{`
                .presentation-bubble { position: absolute; border-radius: 9999px; filter: blur(3px); opacity: .34; pointer-events: none; animation: presentationFloat 11s ease-in-out infinite; }
                .presentation-bubble-one { width: 22%; aspect-ratio: 1; top: 12%; right: 9%; background: #a855f7; }
                .presentation-bubble-two { width: 16%; aspect-ratio: 1; bottom: 12%; left: 11%; background: #22d3ee; animation-delay: -4s; }
                .presentation-bubble-three { width: 10%; aspect-ratio: 1; top: 52%; left: 48%; background: #ec4899; animation-delay: -7s; }
                .presentation-rectangle { position:absolute; width:18%; aspect-ratio:1; border:1px solid #fff8; background:#a855f733; transform:rotate(18deg); animation:presentationFloat 10s ease-in-out infinite; }
                .rectangle-one { top:12%; left:10%; } .rectangle-two { right:14%; bottom:14%; animation-delay:-3s; } .rectangle-three { left:45%; top:45%; width:11%; animation-delay:-6s; }
                .presentation-stars i { position:absolute; width:4px; height:4px; border-radius:99px; background:#fff; box-shadow:0 0 12px #fff; animation:twinkle 2.5s ease-in-out infinite; }
                .presentation-snow i { position:absolute; top:-10px; width:6px; height:6px; border-radius:99px; background:#fff; opacity:.75; animation:snowfall 7s linear infinite; }
                .presentation-sun { position:absolute; width:22%; aspect-ratio:1; top:8%; right:8%; border-radius:99px; background:#fbbf24; filter:blur(7px); opacity:.5; animation:presentationPulse 5s ease-in-out infinite; }
                .presentation-sunray { position:absolute; width:75%; height:22%; top:-5%; right:-15%; background:linear-gradient(90deg,transparent,#fde68a55,transparent); transform:rotate(-25deg); animation:presentationFloat 9s ease-in-out infinite; }
                .presentation-forest { position:absolute; inset:auto 0 0; height:34%; opacity:.45; } .presentation-forest i { position:absolute; bottom:0; width:0; border-left:35px solid transparent; border-right:35px solid transparent; border-bottom:110px solid #34d399; filter:drop-shadow(0 0 12px #34d39955); animation:presentationFloat 8s ease-in-out infinite; }
                @keyframes presentationFloat { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-32px,22px,0) scale(1.18); } }
                @keyframes twinkle { 50% { transform:scale(2.2); opacity:.2; } } @keyframes snowfall { to { transform:translateY(120vh) translateX(25px); } } @keyframes presentationPulse { 50% { transform:scale(1.16); opacity:.75; } }
                :global(:fullscreen) { background: #020617; }
                :global(:fullscreen .presentation-bubble) { animation-duration: 14s; }
              `}</style>

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
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all active:scale-95 border border-violet-400/50"
              >
                <Sparkles size={18} /> {t.createDeck}
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
              {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-violet-400"/> {t.historyTitle}</> : isMobileDrawerOpen === 'template' ? <><LayoutTemplate size={18} className="text-violet-400"/> {t.deckDesign}</> : <><Sparkles size={18} className="text-violet-400"/> {t.newDeck}</>}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {isMobileDrawerOpen === 'history' ? (
              <div className="space-y-3">
                {historyList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                ) : (
                  historyList.map(item => {
                    const isActive = activeDeckId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => { selectDeck(item); setIsMobileDrawerOpen('none'); }}
                        className={`group p-4 bg-slate-950 border rounded-xl cursor-pointer hover:shadow-md transition-all ${isActive ? 'border-violet-500/50' : 'border-slate-800'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-bold text-sm truncate uppercase tracking-wide pr-2 ${isActive ? 'text-violet-300' : 'text-slate-200'}`}>{item.topic}</h4>
                          <button onClick={(e) => deleteDeck(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                          <Projector size={12}/> {item.slide_count} Slides
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : isMobileDrawerOpen === 'template' ? (
              <div className="space-y-6 pb-8">
                <TemplatePicker value={templateId} onChange={slidesData ? updateDeckTemplate : setTemplateId} label={t.deckTemplate} />
                <AnimationPicker value={animationStyle} onChange={slidesData ? updateDeckAnimation : setAnimationStyle} label={t.bgMotion} />
                {slidesData && <p className="text-xs text-slate-400 leading-relaxed">{t.mobileTemplateNote}</p>}
                <button onClick={() => setIsMobileDrawerOpen('none')} className="w-full py-3 rounded-xl bg-violet-600 text-white font-black">{t.done}</button>
              </div>
            ) : (
              <form onSubmit={(e) => { submitPresentation(e); if(topic.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">{t.topicLabel}</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t.topicPlaceholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500/50 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-600 shadow-inner"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">{t.slidesLabel}</label>
                    <select
                      value={slideCount}
                      onChange={(e) => setSlideCount(Number(e.target.value))}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500/50 outline-none font-bold text-slate-200 cursor-pointer"
                    >
                      {[5, 7, 10, 15].map(num => <option key={num} value={num}>{num} Slides</option>)}
                    </select>
                  </div>
                </div>

                {/* Context Files */}
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-3">{t.contextFiles}</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    {files.map(file => (
                      <div key={file.id} onClick={() => {
                          if (selectedFileIds.includes(file.id)) setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                          else setSelectedFileIds([...selectedFileIds, file.id]);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedFileIds.includes(file.id) ? 'bg-violet-500/20 border-violet-500/50 shadow-sm' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                      >
                        <div className="flex-shrink-0">
                          {selectedFileIds.includes(file.id) ? <CheckCircle2 className="text-violet-400" size={16} /> : <FileText className="text-slate-600" size={16} />}
                        </div>
                        <p className="text-xs font-semibold text-slate-300 truncate">{file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isLoading || !topic.trim()} className="w-full py-4 mt-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition-all active:scale-95">
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
