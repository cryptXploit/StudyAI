'use client';

import React, { useState, useEffect, useMemo } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Eye, Sparkles, Loader2, History, Trash2, ShieldCheck, FileText, Type, Sun, Moon, Coffee } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    title: "Bionic Focus Reader",
    subtitle: "Read 2x faster using Fixation-based Bionic Reading",
    inputLabel: "Paste Text to Read",
    placeholder: "Paste your long essays, textbook chapters, or notes here to activate bionic focus mode...",
    loadBtn: "Launch Focus Board",
    saving: "Saving draft...",
    historyTitle: "Saved Library Documents",
    noHistory: "Your library is empty.",
    awaitsDesc: "Paste your text on the left to unlock an immersive, ADHD-friendly Bionic reading board.",
    bionicToggle: "Bionic Mode",
    normalToggle: "Plain Text",
    themeLabel: "Reader Theme",
    fontSize: "Font Size",
    proBadge: "PRO TIER FEATURE",
    awaitsTitle: "Focus Board Awaits",
    timeoutErr: "🚨 Timeout: Server took too long to save the document. Try pasting a slightly shorter text."
  },
  Bangla: {
    title: "বায়োনিক ফোকাস রিডার",
    subtitle: "বায়োনিক রিডিং টেকনিকের মাধ্যমে পড়ার স্পিড দ্বিগুণ করুন",
    inputLabel: "পড়ার টেক্সটটি এখানে দিন",
    placeholder: "আপনার বড় বড় অ্যাসাইনমেন্ট, বইয়ের চ্যাপ্টার বা নোটস এখানে পেস্ট করুন...",
    loadBtn: "ফোকাস বোর্ড চালু করুন",
    saving: "সংরক্ষণ করা হচ্ছে...",
    historyTitle: "আপনার সেভ করা লাইব্রেরি",
    noHistory: "লাইব্রেরিতে কোনো ডকুমেন্ট নেই।",
    awaitsDesc: "বামে আপনার টেক্সট দিন। এআই-কস্ট ছাড়াই ADHD-ফ্রেন্ডলি একটি সুপারফাস্ট রিডিং বোর্ড তৈরি হবে।",
    bionicToggle: "বায়োনিক মোড",
    normalToggle: "সাধারণ টেক্সট",
    themeLabel: "রিডার থিম",
    fontSize: "ফন্ট সাইজ",
    proBadge: "প্রো-টিয়ার ফিচার",
    awaitsTitle: "ফোকাস বোর্ড প্রস্তুত",
    timeoutErr: "🚨 টাইমআউট: সার্ভার ডকুমেন্ট সেভ করতে অনেক সময় নিচ্ছে। একটু ছোট টেক্সট পেস্ট করার চেষ্টা করুন।"
  },
  Hindi: {
    title: "बायोनिक फोकस रीडर",
    subtitle: "बायोनिक रीडिंग तकनीक से अपनी पढ़ने की गति दोगुनी करें",
    inputLabel: "पढ़ने के लिए टेक्स्ट पेस्ट करें",
    placeholder: "अपने लंबे निबंध, अध्याय या नोट्स यहाँ पेस्ट करें...",
    loadBtn: "फोकस बोर्ड लॉन्च करें",
    saving: "सहेज जा रहा है...",
    historyTitle: "आपकी लाइब्रेरी",
    noHistory: "आपकी लाइब्रेरी खाली है।",
    awaitsDesc: "बाईं ओर अपना टेक्स्ट पेस्ट करें। बिना किसी अतिरिक्त लागत के एक शानदार रीडिंग बोर्ड तैयार होगा।",
    bionicToggle: "बायोनिक मोड",
    normalToggle: "साधारण टेक्स्ट",
    themeLabel: "रीडर थीम",
    fontSize: "फ़ॉन्ट आकार",
    proBadge: "प्रो टियर फ़ीचर",
    awaitsTitle: "फोकस बोर्ड तैयार है",
    timeoutErr: "🚨 टाइमआउट: सर्वर को दस्तावेज़ सहेजने में बहुत अधिक समय लगा। कृपया थोड़ा छोटा टेक्स्ट पेस्ट करने का प्रयास करें।"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function BionicReaderPage() {
  const supabase = createClient();
  const [inputText, setInputText] = useState('');
  const [isBionic, setIsBionic] = useState(true);
  const [readerTheme, setReaderTheme] = useState('sepia'); // sepia, dark, light
  const [fontSize, setFontSize] = useState(18); // 14px to 26px
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>('');
  const [historyList, setHistoryList] = useState<any[]>([]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(5);

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

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

  // 🟢 AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchHistory = async () => {
    const cachedHistory = sessionStorage.getItem('Prepia_bionic_history');
    if (cachedHistory) {
      setHistoryList(JSON.parse(cachedHistory));
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('bionic_texts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      
      if (data) {
        setHistoryList(data);
        sessionStorage.setItem('Prepia_bionic_history', JSON.stringify(data));
      }
    } catch (e) {}
  };

  // 🟢 ZERO LATENCY CLIENT-SIDE BIONIC PARSER ENGINE
  const bionicHTML = useMemo(() => {
    if (!activeContent) return '';
    if (!isBionic) return activeContent.replace(/\n/g, '<br/>');

    return activeContent
      .split(/(\s+)/) 
      .map((word) => {
        if (word.trim().length === 0) return word; 
        
        const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        if (cleanWord.length === 0) return word;

        let mid = 1;
        if (cleanWord.length > 3) {
          mid = Math.ceil(cleanWord.length * 0.4); 
        } else if (cleanWord.length === 3) {
          mid = 2;
        }

        const boldPart = word.substring(0, mid);
        const restPart = word.substring(mid);

        return `<strong>${boldPart}</strong>${restPart}`;
      })
      .join('')
      .replace(/\n/g, '<br/>');
  }, [activeContent, isBionic]);

  const handleLaunchReader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 5) {
      setRequiredTokensForModal(5);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setActiveContent(inputText.substring(0, 50000)); // Client-side limit mirroring backend

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 Seconds Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/bionic/save` : `${apiUrlBase}/api/bionic/save`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ text: inputText, language: language }),
        signal: controller.signal // 🟢 Added Safety Signal
      });
      
      clearTimeout(timeoutId);

      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 5);
            setShowTokenModal(true);
            setIsLoading(false);
            return;
        }
      }

      const data = await response.json();
      
      if (data.success) {
        setActiveDocId(data.savedId);
        
        refreshTokens();
        sessionStorage.removeItem('Prepia_bionic_history'); // 🟢 Bust Cache
        fetchHistory(); // Refresh the left sidebar instantly
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert(t.timeoutErr);
      } else {
        console.error("Failed to save to library:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from('bionic_texts').delete().eq('id', id);
      if (activeDocId === id) {
        setActiveDocId(null);
        setActiveContent('');
      }
      sessionStorage.removeItem('Prepia_bionic_history'); // 🟢 Bust Cache
      fetchHistory();
    } catch (err) {}
  };

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className="min-h-[calc(100vh-80px)] p-2 md:p-4 bg-slate-50 transition-colors duration-500">
        <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-120px)] max-w-7xl mx-auto overflow-hidden bg-slate-50 border border-slate-200 rounded-3xl shadow-sm relative">
        
        {/* Left Input Panel */}
        <div className="w-full md:w-1/3 bg-slate-950 md:border-r border-b md:border-b-0 border-slate-800 p-4 md:p-6 flex flex-col shrink-0 md:h-full md:overflow-y-auto custom-scrollbar relative z-10">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-6 mt-2">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Eye size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleLaunchReader} className="space-y-5 mb-6">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.inputLabel}</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.placeholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-700 shadow-inner custom-scrollbar"
                rows={8}
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !inputText.trim()} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.saving : t.loadBtn}
            </button>
          </form>

          {/* Library History */}
          <div className="mt-auto pt-6 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
              <History size={14} className="text-amber-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4 bg-slate-900 rounded-xl">{t.noHistory}</p>
              ) : (
                historyList.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setActiveDocId(item.id);
                      setActiveContent(item.content_text);
                      setInputText(item.content_text);
                    }}
                    className={`group p-3 border rounded-xl cursor-pointer flex justify-between items-center transition-all ${activeDocId === item.id ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText size={14} className={activeDocId === item.id ? 'text-amber-400' : 'text-slate-500'} />
                      <p className={`text-sm font-bold truncate max-w-[180px] ${activeDocId === item.id ? 'text-amber-300' : 'text-slate-300'}`}>{item.title}</p>
                    </div>
                    <button onClick={(e) => deleteDoc(item.id, e)} className="text-slate-600 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Immersive Premium Focus Board */}
        <div className={`w-full md:w-2/3 h-[600px] md:h-full flex flex-col relative overflow-hidden transition-colors duration-500 ${
          readerTheme === 'dark' ? 'bg-[#0f172a]' : readerTheme === 'sepia' ? 'bg-[#f4ebd0]' : 'bg-white'
        }`}>
          
          {!activeContent ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-10">
              <Type size={80} className="text-slate-300 mb-6" />
              <h3 className="text-3xl font-black text-slate-400">{t.awaitsTitle}</h3>
              <p className="text-slate-500 mt-2 max-w-sm">{t.awaitsDesc}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in duration-700">
               
               {/* Controls Header Dashboard Toolbar */}
               <div className={`p-4 border-b flex justify-between items-center z-10 shadow-sm transition-colors ${
                 readerTheme === 'dark' ? 'bg-[#020617] border-slate-800' : readerTheme === 'sepia' ? 'bg-[#ede0c4] border-[#dcd0b4]' : 'bg-slate-50 border-slate-200'
               }`}>
                  
                  {/* Bionic vs Normal Text Mode Toggle Slider */}
                  <div className="flex bg-slate-800/20 p-1 rounded-xl border border-slate-700/10">
                     <button onClick={() => setIsBionic(true)} className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all ${isBionic ? 'bg-amber-600 text-white shadow' : 'text-slate-500'}`}>{t.bionicToggle}</button>
                     <button onClick={() => setIsBionic(false)} className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all ${!isBionic ? 'bg-amber-600 text-white shadow' : 'text-slate-500'}`}>{t.normalToggle}</button>
                  </div>

                  {/* Font Size & Theme Adjusters */}
                  <div className="flex items-center gap-4">
                     {/* Font Sizer */}
                     <div className="flex items-center gap-2">
                        <button onClick={() => setFontSize(p => Math.max(14, p - 2))} className="p-2 text-slate-500 hover:text-amber-600 font-bold text-sm bg-slate-500/10 rounded-lg">-A</button>
                        <span className="text-xs font-mono font-bold text-slate-500">{fontSize}px</span>
                        <button onClick={() => setFontSize(p => Math.min(26, p + 2))} className="p-2 text-slate-500 hover:text-amber-600 font-bold text-sm bg-slate-500/10 rounded-lg">+A</button>
                     </div>

                     {/* Themes Grid buttons */}
                     <div className="flex items-center gap-1.5 border-l pl-4 border-slate-300/40">
                        <button onClick={() => setReaderTheme('light')} className={`p-2 rounded-lg transition-all ${readerTheme === 'light' ? 'bg-amber-600 text-white' : 'bg-slate-500/10 text-slate-500'}`} title="Light Mode"><Sun size={16}/></button>
                        <button onClick={() => setReaderTheme('sepia')} className={`p-2 rounded-lg transition-all ${readerTheme === 'sepia' ? 'bg-amber-600 text-white' : 'bg-slate-500/10 text-slate-500'}`} title="Sepia Board"><Coffee size={16}/></button>
                        <button onClick={() => setReaderTheme('dark')} className={`p-2 rounded-lg transition-all ${readerTheme === 'dark' ? 'bg-amber-600 text-white' : 'bg-slate-500/10 text-slate-500'}`} title="Night Board"><Moon size={16}/></button>
                     </div>
                  </div>
               </div>

               {/* Immersive Imprimatur Reading Workspace Viewport */}
               <div className="flex-1 w-full overflow-y-auto px-12 md:px-20 py-12 custom-scrollbar">
                  <div 
                    className={`max-w-3xl mx-auto font-sans leading-relaxed tracking-wide selection:bg-amber-500/30 transition-all ${
                      readerTheme === 'dark' ? 'text-slate-300 [&>strong]:text-white [&>strong]:font-black' : 
                      readerTheme === 'sepia' ? 'text-[#3c3426] [&>strong]:text-black [&>strong]:font-black' : 
                      'text-slate-800 [&>strong]:text-black [&>strong]:font-black'
                    }`}
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: bionicHTML }}
                  />
                  <div className="h-20" />
               </div>

            </div>
          )}
        </div>

        </div>
      </div>
    </SecureLayout>
  );
}
