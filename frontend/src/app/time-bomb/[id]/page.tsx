'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, Sparkles, AlertTriangle, Crown, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import SecureLayout from '@/components/layout/SecureLayout';

type LanguageType = 'English' | 'Bangla' | 'Hindi';

const translations = {
  English: {
    validating: "Validating Safe Identity...",
    proAccess: "PRO ACCESS REQUIRED",
    unlockDocs: "Unlock Time-Bomb Documents",
    exclusiveNote: "This exclusive note was shared with you via Prepia Jumper. Free accounts cannot read shared premium links. Upgrade to Pro to instantly unlock this file and gain unlimited heatmap generation powers!",
    upgradeToPro: "Upgrade to Prepia Pro",
    premiumNote: "Premium Note",
    proActive: "Pro Active",
    sentBy: "Sent by:",
    alumni: "Alumni",
    selfDestructs: "Self-Destructs in:",
    timesUp: "Time's Up!",
    noteDestructed: "This shared note has self-destructed.",
    wantUnlimited: "Want to generate unlimited heatmaps for your own books?",
    goDashboard: "Go to Dashboard"
  },
  Bangla: {
    validating: "নিরাপদ পরিচয় যাচাই করা হচ্ছে...",
    proAccess: "প্রো অ্যাক্সেস প্রয়োজন",
    unlockDocs: "টাইম-বোম ডকুমেন্টস আনলক করুন",
    exclusiveNote: "এই এক্সক্লুসিভ নোটটি প্রেপিয়া জাম্পারের মাধ্যমে আপনার সাথে শেয়ার করা হয়েছে। বিনামূল্যের অ্যাকাউন্টগুলি শেয়ার করা প্রিমিয়াম লিঙ্কগুলি পড়তে পারে না৷ তাৎক্ষণিকভাবে এই ফাইলটি আনলক করতে এবং সীমাহীন হিটম্যাপ জেনারেশন ক্ষমতা অর্জন করতে প্রো-তে আপগ্রেড করুন!",
    upgradeToPro: "প্রেপিয়া প্রো-তে আপগ্রেড করুন",
    premiumNote: "প্রিমিয়াম নোট",
    proActive: "প্রো সক্রিয়",
    sentBy: "প্রেরক:",
    alumni: "অ্যালামনাই",
    selfDestructs: "স্বয়ংক্রিয়ভাবে ধ্বংস হবে:",
    timesUp: "সময় শেষ!",
    noteDestructed: "এই শেয়ার করা নোটটি ধ্বংস হয়ে গেছে।",
    wantUnlimited: "আপনার নিজের বইয়ের জন্য আনলিমিটেড হিটম্যাপ তৈরি করতে চান?",
    goDashboard: "ড্যাশবোর্ডে যান"
  },
  Hindi: {
    validating: "सुरक्षित पहचान सत्यापित की जा रही है...",
    proAccess: "प्रो एक्सेस की आवश्यकता है",
    unlockDocs: "टाइम-बॉम्ब दस्तावेज़ अनलॉक करें",
    exclusiveNote: "यह विशेष नोट प्रेपिया जम्पर के माध्यम से आपके साथ साझा किया गया था। मुफ़्त खाते साझा किए गए प्रीमियम लिंक नहीं पढ़ सकते। इस फ़ाइल को तुरंत अनलॉक करने और असीमित हीटमैप जनरेशन शक्तियां प्राप्त करने के लिए प्रो में अपग्रेड करें!",
    upgradeToPro: "प्रेपिया प्रो में अपग्रेड करें",
    premiumNote: "प्रीमियम नोट",
    proActive: "प्रो सक्रिय",
    sentBy: "द्वारा भेजा गया:",
    alumni: "पूर्व छात्र",
    selfDestructs: "स्वयं नष्ट होगा:",
    timesUp: "समय समाप्त!",
    noteDestructed: "यह साझा किया गया नोट नष्ट हो गया है।",
    wantUnlimited: "क्या आप अपनी पुस्तकों के लिए असीमित हीटमैप उत्पन्न करना चाहते हैं?",
    goDashboard: "डैशबोर्ड पर जाएं"
  }
};

export default function TimeBombViewer() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [language, setLanguage] = useState<LanguageType>('English');
  
  const [timebombData, setTimebombData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pageNumber, setPageNumber] = useState<number>(1);
  const assumedTotalPages = 300; 

  useEffect(() => {
    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as LanguageType);
  }, []);

  useEffect(() => {
    checkAuthAndFetch();
  }, [params.id]);

  useEffect(() => {
    if (timeLeft > 0 && isPro) {
      const timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [timeLeft, isPro]);

  const checkAuthAndFetch = async () => {
    if (!params.id) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.tier !== 'pro') {
        setIsPro(false);
        setLoading(false);
        return;
      }
      setIsPro(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/bookjumper/timebomb/${params.id as string}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.data) throw new Error('Link expired or unaccessible');
      const data = payload.data;

      const expirationTime = new Date(data.expires_at).getTime();
      const currentTime = new Date().getTime();
      const secondsLeft = Math.floor((expirationTime - currentTime) / 1000);

      if (secondsLeft <= 0) {
        setIsExpired(true);
        setLoading(false);
        return;
      }

      setTimeLeft(secondsLeft);
      setTimebombData(data);
      if (data.hit_pages && data.hit_pages.length > 0) {
        setPageNumber(data.hit_pages[0]);
      }

      if (!data.signed_url) throw new Error("Document link is missing");
      setPdfUrl(data.signed_url);

      await supabase.from('book_jumper_history').insert({
        user_id: session.user.id,
        file_id: data.file_id,
        query: `${data.query} (Referred by @${data.referrer_name || 'Alumni'})`,
        hit_pages: data.hit_pages
      });

    } catch (err) {
      console.error("Security/Fetch Error:", err);
      setIsExpired(true); 
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const t = translations[language];

  if (loading) {
    return (
      <SecureLayout>
        <div className="h-[calc(100vh-80px)] bg-black flex items-center justify-center mt-4 rounded-3xl border border-slate-800">
           <div className="animate-pulse flex flex-col items-center">
             <Clock size={48} className="text-red-500 mb-4 animate-spin-slow" />
             <p className="text-red-400 font-black tracking-widest uppercase">{t.validating}</p>
           </div>
        </div>
      </SecureLayout>
    );
  }

  if (!isPro) {
    return (
      <SecureLayout>
        <div className="h-[calc(100vh-80px)] bg-slate-950 flex items-center justify-center mt-4 rounded-3xl border border-slate-800 p-4 font-sans">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 max-w-lg w-full p-8 md:p-12 rounded-[2.5rem] border border-amber-500/20 text-center relative overflow-hidden shadow-2xl shadow-amber-500/5">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            <Crown size={56} className="text-amber-400 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">{t.proAccess}</h2>
            <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-6">{t.unlockDocs}</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {t.exclusiveNote}
            </p>
            <div className="space-y-4">
              <button onClick={() => router.push('/dashboard/pricing')} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2">
                {t.upgradeToPro} <ArrowRight size={14}/>
              </button>
            </div>
          </motion.div>
        </div>
      </SecureLayout>
    );
  }

  return (
    <SecureLayout>
      <div className="h-[calc(100vh-80px)] bg-black font-sans relative overflow-hidden flex flex-col mt-4 rounded-3xl border border-slate-800 shadow-2xl">
        
        <div className={`h-16 shrink-0 flex items-center justify-between px-6 border-b transition-colors ${timeLeft < 300 && !isExpired ? 'bg-red-950 border-red-500' : 'bg-slate-950 border-slate-800'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-black tracking-tight text-sm md:text-base flex items-center gap-2">
                {t.premiumNote} <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full uppercase font-black">{t.proActive}</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {t.sentBy} <span className="text-amber-400">@{timebombData?.referrer_name || t.alumni}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest hidden md:block">{t.selfDestructs}</span>
            <div className={`px-4 py-1.5 rounded-lg border font-mono font-black text-lg md:text-xl shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-colors ${timeLeft < 300 ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-black text-red-500 border-red-500/30'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="flex-1 relative flex">
          
          <div className="flex-1 relative">
             {(!isExpired && pdfUrl) ? (
               <iframe 
                  key={`${pageNumber}-${timebombData?.query}`} 
                  src={`${pdfUrl}#search=%22${encodeURIComponent(timebombData?.query || '')}%22&page=${pageNumber}&view=FitH`} 
                  className="absolute inset-0 w-full h-full border-none bg-slate-900"
                />
             ) : (
               <div className="absolute inset-0 bg-slate-900"></div>
             )}
          </div>

          {!isExpired && timebombData?.hit_pages && (
             <div className="w-12 md:w-16 bg-slate-950 border-l border-slate-800 relative shadow-inner shrink-0 z-20">
               <div className="h-full w-full relative">
                  <div className="absolute top-0 left-0 w-full h-full bg-slate-900/50"></div>
                  {timebombData.hit_pages.map((page: number, index: number) => {
                    const topPercent = (page / assumedTotalPages) * 100;
                    const isActive = page === pageNumber;
                    return (
                      <div
                        key={`${page}-${index}`}
                        onClick={() => setPageNumber(page)}
                        style={{ top: `${Math.min(topPercent, 95)}%` }} 
                        className={`absolute left-0 w-full cursor-pointer transition-all duration-300 origin-left ${isActive ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] z-20 h-2' : 'bg-red-500 hover:bg-red-400 hover:h-2 z-10 h-1.5'}`}
                      />
                    );
                  })}
               </div>
             </div>
          )}

          <AnimatePresence>
            {isExpired && (
              <motion.div initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} animate={{ opacity: 1, backdropFilter: 'blur(16px)' }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-950 p-8 md:p-12 rounded-[3rem] border border-red-500/30 max-w-lg w-full text-center relative overflow-hidden shadow-[0_0_100px_rgba(239,68,68,0.2)] mx-4">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-orange-500"></div>
                  <Lock size={64} className="text-red-500 mx-auto mb-6" />
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase tracking-tight">{t.timesUp}</h2>
                  <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-8">{t.noteDestructed}</p>
                  <div className="space-y-4">
                    <p className="text-slate-400 font-medium text-sm">{t.wantUnlimited}</p>
                    <button onClick={() => router.push('/dashboard/pricing')} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex justify-center items-center gap-2">
                      <Sparkles size={18} /> {t.upgradeToPro}
                    </button>
                    <button onClick={() => router.push('/book-jumper')} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-black uppercase tracking-widest text-xs rounded-xl transition-all">{t.goDashboard}</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </SecureLayout>
  );
}
