'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Smartphone, Sparkles, Loader2, History, Trash2, ShieldCheck, Download, Palette, Layers } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const translations = {
  English: {
    title: "Formula Wallpaper Generator",
    subtitle: "Turn formulas into high-res mobile lockscreens",
    topicLabel: "Subject / Topic Name",
    topicPlaceholder: "e.g., HSC Physics, Organic Chemistry, Calculus...",
    themeLabel: "Select Visual Theme",
    formulasLabel: "Enter Formulas / Key Notes (One per line)",
    formulasPlaceholder: "E = mc^2\nF = G * (m1 * m2) / r^2\nv = u + at\ni^(2) = -1",
    generateBtn: "Download HD Wallpaper",
    generating: "Rendering Image...",
    historyTitle: "Your Generated Art",
    noHistory: "No wallpapers created yet.",
    previewTitle: "Live Lockscreen Preview",
    proBadge: "PRO TIER FEATURE"
  },
  Bangla: {
    title: "ফর্মুলা ওয়ালপেপার জেনারেটর",
    subtitle: "গুরুত্বপূর্ণ সূত্রগুলোকে মোবাইল লকস্ক্রিন ছবিতে রূপান্তর করুন",
    topicLabel: "বিষয় বা টপিকের নাম",
    topicPlaceholder: "যেমন: পদার্থবিজ্ঞান সূত্র, উচ্চতর গণিত, শর্ট ট্রিকস...",
    themeLabel: "ভিজ্যুয়াল থিম সিলেক্ট করুন",
    formulasLabel: "সূত্রসমূহ লিখুন (প্রতি লাইনে একটি করে)",
    formulasPlaceholder: "E = mc^2\nF = G * (m1 * m2) / r^2\nv = u + at",
    generateBtn: "এইচডি ওয়ালপেপার ডাউনলোড করুন",
    generating: "ছবি তৈরি হচ্ছে...",
    historyTitle: "আপনার ওয়ালপেপার হিস্ট্রি",
    noHistory: "এখনো কোনো ওয়ালপেপার তৈরি করা হয়নি।",
    previewTitle: "লাইভ লকস্ক্রিন প্রিভিউ",
    proBadge: "প্রো-টিয়ার ফিচার"
  },
  Hindi: {
    title: "फॉर्मूला वॉलपेपर जेनरेटर",
    subtitle: "महत्वपूर्ण सूत्रों को मोबाइल लॉकस्क्रीन में बदलें",
    topicLabel: "विषय या शीर्षक का नाम",
    topicPlaceholder: "उदा. Physics Formulas, Calculus Tricks...",
    themeLabel: "विज़ुअल थीम चुनें",
    formulasLabel: "सूत्र दर्ज करें (प्रति पंक्ति एक)",
    formulasPlaceholder: "E = mc^2\nF = G * (m1 * m2) / r^2",
    generateBtn: "HD वॉलपेपर डाउनलोड करें",
    generating: "छवि बनाई जा रही है...",
    historyTitle: "आपका वॉलपेपर इतिहास",
    noHistory: "अभी तक कोई वॉलपेपर नहीं बनाया गया।",
    previewTitle: "लाइव लॉकस्क्रीन पूर्वावलोकन",
    proBadge: "प्रो टियर फ़ीचर"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function WallpaperPage() {
  const supabase = createClient();
  const [topic, setTopic] = useState('');
  const [theme, setTheme] = useState('minimalist');
  const [rawFormulas, setRawFormulas] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

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
    const { data } = await supabase.from('wallpaper_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setHistoryList(data);
  };

  // 🟢 HIGH PERFORMANCE BUFFER PIPELINE DOWNLOAD
  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !rawFormulas.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    const formulasArray = rawFormulas.split('\n').filter(f => f.trim().length > 0);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 Minute Timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/wallpaper/generate` : `${apiUrlBase}/api/wallpaper/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, formulas: formulasArray, theme }),
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

      if (!response.ok) throw new Error("Failed to process render buffer.");

      // Receive image directly as binary blob for ultra low latency pop-up
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prepia-${topic.toLowerCase().replace(/\s+/g, '-')}-wallpaper.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      refreshTokens();
      fetchHistory(); // Refresh library layout safely

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

  const deleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('wallpaper_history').delete().eq('id', id);
    fetchHistory();
  };

  // Preview Layout Generator Engine
  const formulasPreview = rawFormulas.split('\n').filter(f => f.trim().length > 0).slice(0, 10);

  return (
    <SecureLayout>
      <OutOfTokensModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        requiredTokens={requiredTokensForModal}
      />
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-50 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-slate-50 bg-slate-950 lg:border lg:border-slate-200 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">

        {/* Left Input Section (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-500 to-blue-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proBadge}
          </div>

          <div className="flex items-center gap-3 mb-6 mt-2">
            <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-2xl flex items-center justify-center shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.title}</h2>
              <p className="text-xs font-bold text-slate-500">{t.subtitle}</p>
            </div>
          </div>

          <form onSubmit={handleDownload} className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">{t.topicLabel}</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t.topicPlaceholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-200 placeholder:text-slate-700 shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Palette size={12}/> {t.themeLabel}</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-slate-200 cursor-pointer"
              >
                <option value="minimalist">☁️ Minimalist Slate Dark</option>
                <option value="cyberpunk">⚡ Cyberpunk Neon Glow</option>
                <option value="aesthetic">🔮 Aesthetic Cosmic Violet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Layers size={12}/> {t.formulasLabel}</label>
              <textarea
                value={rawFormulas}
                onChange={(e) => setRawFormulas(e.target.value)}
                placeholder={t.formulasPlaceholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-cyan-500 outline-none resize-none font-mono text-xs text-slate-300 placeholder:text-slate-700 shadow-inner custom-scrollbar"
                rows={6}
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !topic.trim() || !rawFormulas.trim()} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isLoading ? t.generating : t.generateBtn}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-6 pt-6 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2">
              <History size={14} className="text-cyan-400" /> {t.historyTitle}
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4 bg-slate-900 rounded-xl">{t.noHistory}</p>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setTopic(item.topic);
                      setTheme(item.theme);
                      try { setRawFormulas(JSON.parse(item.formulas_text).join('\n')); } catch(e){}
                    }}
                    className="group p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-cyan-500/40 flex justify-between items-center transition-all"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-300 truncate max-w-[180px]">{item.topic}</p>
                      <p className="text-[9px] font-mono text-slate-500 capitalize">{item.theme} Theme</p>
                    </div>
                    <button onClick={(e) => deleteHistory(item.id, e)} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Live Mobile Wallpaper Mockup Preview */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-cyan-500"><Smartphone size={16}/> {t.title}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.subtitle}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col items-center justify-center p-4 lg:p-8 relative">

          <div className="absolute top-6 left-8 flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider hidden lg:flex">
             <Smartphone size={16}/> {t.previewTitle}
          </div>

          {/* Realistic Smartphone Chassis Layout Container */}
          <div className={`w-[320px] h-[580px] rounded-[48px] border-[10px] shadow-2xl p-6 relative overflow-hidden transition-all duration-500 flex flex-col ${
            theme === 'cyberpunk' ? 'bg-slate-950 border-cyan-500/30' :
            theme === 'aesthetic' ? 'bg-indigo-950 border-purple-500/30' :
            'bg-slate-900 border-slate-700/60'
          }`}>

             {/* Notch/Dynamic Island Filter element */}
             <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-20"></div>

             {/* Dynamic Live Text Compilation Mapping onto Preview Canvas */}
             <div className="relative z-10 flex flex-col h-full pt-4">
                <h3 className={`text-xl font-black uppercase tracking-wide truncate ${
                  theme === 'cyberpunk' ? 'text-cyan-400' : theme === 'aesthetic' ? 'text-purple-300' : 'text-sky-400'
                }`}>{topic || "SUBJECT TITLE"}</h3>
                <p className="text-[8px] font-black text-slate-500 tracking-wider mb-6">REVISION LOCKSCREEN</p>

                {/* Simulated Grid list matching backend exact SVG coordinates mapping */}
                <div className="flex-1 space-y-3.5 overflow-hidden opacity-80 font-mono text-xs">
                   {formulasPreview.length === 0 ? (
                     <div className="text-[10px] text-slate-600 font-bold text-center pt-20">formulas will display here dynamically.</div>
                   ) : (
                     formulasPreview.map((item, i) => (
                       <p key={i} className={`truncate flex items-center gap-2 ${
                         theme === 'cyberpunk' ? 'text-rose-400' : theme === 'aesthetic' ? 'text-slate-200' : 'text-slate-300'
                       }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            theme === 'cyberpunk' ? 'bg-yellow-400' : theme === 'aesthetic' ? 'bg-pink-400' : 'bg-indigo-400'
                          }`}></span>
                          {item}
                       </p>
                     ))
                   )}
                </div>

                <p className="text-[8px] font-black text-slate-600 tracking-widest text-center mt-auto pb-2">Prepia EXAM WALLPAPER</p>
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
                <History size={16}/> {t.historyTitle.split(' ')[1] || 'History'}
              </button>

              <button
                onClick={() => setIsMobileDrawerOpen('config')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 border border-cyan-400/50"
              >
                <Palette size={18} /> Edit Config
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
              {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-cyan-400"/> {t.historyTitle}</> : <><Sparkles size={18} className="text-cyan-400"/> New Wallpaper</>}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {isMobileDrawerOpen === 'history' ? (
              <div className="space-y-3">
                {historyList.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noHistory}</p>
                ) : (
                  historyList.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setTopic(item.topic);
                        setTheme(item.theme);
                        try { setRawFormulas(JSON.parse(item.formulas_text).join('\n')); } catch(e){}
                        setIsMobileDrawerOpen('none');
                      }}
                      className="group p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:shadow-md transition-all hover:border-cyan-500/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-sm text-slate-200 truncate uppercase tracking-wide">{item.topic}</p>
                          <p className="text-[9px] font-mono text-slate-500 capitalize">{item.theme} Theme</p>
                        </div>
                        <button onClick={(e) => deleteHistory(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <form onSubmit={(e) => { handleDownload(e); if(topic.trim() && rawFormulas.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2">{t.topicLabel}</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t.topicPlaceholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none font-bold text-slate-200 placeholder:text-slate-700 shadow-inner"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1"><Palette size={12}/> {t.themeLabel}</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none font-bold text-slate-200 cursor-pointer"
                  >
                    <option value="minimalist">☁️ Minimalist Slate Dark</option>
                    <option value="cyberpunk">⚡ Cyberpunk Neon Glow</option>
                    <option value="aesthetic">🔮 Aesthetic Cosmic Violet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2"><Layers size={12}/> {t.formulasLabel}</label>
                  <textarea
                    value={rawFormulas}
                    onChange={(e) => setRawFormulas(e.target.value)}
                    placeholder={t.formulasPlaceholder}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none font-mono text-xs text-slate-300 placeholder:text-slate-700 shadow-inner custom-scrollbar"
                    rows={6}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading || !topic.trim() || !rawFormulas.trim()} className="w-full py-4 mt-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:bg-slate-800 disabled:text-slate-600">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
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
