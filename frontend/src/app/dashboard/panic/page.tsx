'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Lock, Unlock, Share2, ArrowLeft, ShieldAlert, Zap, Flame, Clock, Loader2 } from 'lucide-react';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

const FALLBACK_SURVIVAL_KIT = [
  { id: '1', topic: 'Ohm’s Law & Power', content: 'V = IR. Power (P) = VI = I²R. This is the most fundamental equation for any circuit analysis problem.' },
  { id: '2', topic: 'Thermodynamics 1st Law', content: 'ΔU = Q - W. Energy cannot be created or destroyed, only transformed. Q is heat added, W is work done by the system.' },
  { id: '3', topic: 'Maxwell’s Equations', content: 'Gauss’s law for electricity, Gauss’s law for magnetism, Faraday’s law of induction, and Ampère’s law. Core for electromagnetics.' },
  { id: '4', topic: 'Machine Learning: Overfitting', content: 'Occurs when a model learns the detail and noise in the training data to the extent that it negatively impacts the performance of the model on new data.' },
  { id: '5', topic: 'TCP/IP 3-Way Handshake', content: 'SYN, SYN-ACK, ACK. Process used in a TCP/IP network to make a connection between the server and client.' },
  { id: '6', topic: 'Calculus: Chain Rule', content: 'd/dx [f(g(x))] = f\'(g(x)) * g\'(x). Absolute must-know for derivative problems.' },
  { id: '7', topic: 'Database Normalization (3NF)', content: 'Eliminate transitive dependencies. Every non-prime attribute must be directly dependent on the primary key.' },
  { id: '8', topic: 'Quantum States', content: 'Superposition allows a quantum system to be in multiple states at the same time until it is measured.' },
];

const translations = {
  English: {
    generatingLink: "Generating your unique emergency link. Please wait a second...",
    shareText1: "🚨 I'm panicking for tomorrow's exam! I found this secret Do-or-Die Survival Kit. Click my link to get Rewarded (and unlock mine)! ",
    retreat: "Retreat to Safety",
    doOrDie: "Do-or-Die Survival Kit",
    algorithmText1: "Our algorithm has extracted the ",
    algorithmText2: " most critical concepts you MUST memorize to survive tomorrow's exam.",
    timeRunningOut: "Time is Running Out!",
    encryptedConcepts1: "",
    encryptedConcepts2: " Critical survival concepts are encrypted. If you don't read these, you will fail.",
    payToUnlock: "Pay 50tk to unlock",
    orFreeMethod: "OR FREE METHOD",
    inviteFriends: "Invite 3 Friends to Unlock",
    joined: "Joined",
    sendEmergencyLink: "Send the emergency link. As soon as 3 friends click, your kit unlocks automatically."
  },
  Bangla: {
    generatingLink: "আপনার ইউনিক ইমারজেন্সি লিংক তৈরি করা হচ্ছে। দয়া করে একটু অপেক্ষা করুন...",
    shareText1: "🚨 কালকের পরীক্ষা নিয়ে আমি অনেক ভয়ে আছি! আমি এই গোপন সারভাইভাল কিটটি পেয়েছি। রিওয়ার্ড পেতে এবং আমারটি আনলক করতে লিংকে ক্লিক করো! ",
    retreat: "নিরাপদ স্থানে ফিরে যান",
    doOrDie: "বাঁচা-মরার সারভাইভাল কিট",
    algorithmText1: "আগামীকালকের পরীক্ষায় বাঁচার জন্য আমাদের অ্যালগরিদম ",
    algorithmText2: "টি অত্যন্ত গুরুত্বপূর্ণ কনসেপ্ট বের করেছে যা আপনার মুখস্ত করতেই হবে।",
    timeRunningOut: "সময় ফুরিয়ে যাচ্ছে!",
    encryptedConcepts1: "",
    encryptedConcepts2: "টি গুরুত্বপূর্ণ সারভাইভাল কনসেপ্ট এনক্রিপ্টেড আছে। এগুলো না পড়লে আপনি ফেল করবেন।",
    payToUnlock: "আনলক করতে ৫০ টাকা পেমেন্ট করুন",
    orFreeMethod: "অথবা ফ্রি পদ্ধতি",
    inviteFriends: "আনলক করতে ৩ জন বন্ধুকে ইনভাইট করুন",
    joined: "যুক্ত হয়েছে",
    sendEmergencyLink: "ইমারজেন্সি লিংকটি পাঠান। ৩ জন বন্ধু ক্লিক করলেই আপনার কিটটি স্বয়ংক্রিয়ভাবে আনলক হয়ে যাবে।"
  },
  Hindi: {
    generatingLink: "आपका अनोखा इमरजेंसी लिंक जनरेट किया जा रहा है। कृपया एक सेकंड प्रतीक्षा करें...",
    shareText1: "🚨 मैं कल की परीक्षा को लेकर घबरा रहा हूँ! मुझे यह गुप्त सर्वाइवल किट मिली है। इनाम पाने (और मेरी किट अनलॉक करने) के लिए मेरे लिंक पर क्लिक करें! ",
    retreat: "सुरक्षित स्थान पर वापस जाएं",
    doOrDie: "करो या मरो सर्वाइवल किट",
    algorithmText1: "हमारे एल्गोरिथम ने ",
    algorithmText2: " सबसे महत्वपूर्ण कॉन्सेप्ट्स निकाले हैं जिन्हें आपको कल की परीक्षा में पास होने के लिए याद करना ही होगा।",
    timeRunningOut: "समय खत्म हो रहा है!",
    encryptedConcepts1: "",
    encryptedConcepts2: " महत्वपूर्ण सर्वाइवल कॉन्सेप्ट्स एन्क्रिप्टेड हैं। अगर आप इन्हें नहीं पढ़ेंगे, तो आप फेल हो जाएंगे।",
    payToUnlock: "अनलॉक करने के लिए 50tk का भुगतान करें",
    orFreeMethod: "या मुफ़्त तरीका",
    inviteFriends: "अनलॉक करने के लिए 3 दोस्तों को आमंत्रित करें",
    joined: "जुड़े",
    sendEmergencyLink: "इमरजेंसी लिंक भेजें। जैसे ही 3 दोस्त क्लिक करेंगे, आपकी किट अपने आप अनलॉक हो जाएगी।"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function PanicModePage() {
  const supabase = createClient();
  const [kit, setKit] = useState<any[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(12 * 60 * 60); // 12 hours in seconds
  
  // NEW: Referral & Tracking States
  const [userId, setUserId] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [panicCount, setPanicCount] = useState<number>(0);
  const [language, setLanguage] = useState<LanguageType>('English');
  const router = useRouter();

  const t = translations[language];

  useEffect(() => {
    // Hide standard scrollbar and force dark theme on body
    document.body.style.backgroundColor = '#000';
    document.body.style.color = '#fff';
    
    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as LanguageType);
    
    fetchSurvivalKit();
    fetchUserData(); // Fetch user info & current panic progress

    const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      clearInterval(timer);
    };
  }, []);

  // NEW: Real-time listener for panic_referral_count
  useEffect(() => {
    if (!userId) return;

    // Listen to database updates for this specific user
    const channel = supabase.channel('panic_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users', 
        filter: `id=eq.${userId}` 
      }, (payload) => {
        const newCount = payload.new.panic_referral_count || 0;
        setPanicCount(newCount);
        if (newCount >= 3) {
          setIsUnlocked(true);
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchUserData = async () => {
    try {
      // সেশন ফেচ করা হচ্ছে যাতে API তে টোকেন পাঠানো যায়
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        
        // ১. API কল করে রেফারেল কোড ফেচ করা (না থাকলে ব্যাকএন্ড অটোমেটিক বানিয়ে দেবে)
        let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
        const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/referral` : `${apiUrlBase}/api/rewards/referral`;
        
        const refResponse = await fetch(fetchUrl, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const refData = await refResponse.json();
        
        if (refData.success && refData.referralCode) {
          setReferralCode(refData.referralCode);
        }

        // ২. ডাটাবেস থেকে প্যানিক কাউন্টার ফেচ করা
        const { data } = await supabase.from('profiles')
          .select('panic_referral_count')
          .eq('id', session.user.id)
          .single();
          
        if (data) {
          setPanicCount(data.panic_referral_count || 0);
          // যদি আগেই ৩ জন জয়েন করে থাকে, তবে কিট আনলক হয়ে যাবে
          if ((data.panic_referral_count || 0) >= 3) {
            setIsUnlocked(true);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching user data", e);
    }
  };

  const handleViralShare = () => {
    // 🟢 Safety Check: কোড আসতে একটু লেট হলে ইউজারকে অ্যালার্ট দেবে
    if (!referralCode) {
      alert(t.generatingLink);
      return;
    }

    // ডাইনামিক রেফারেল লিংক জেনারেট
    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}&context=panic_mode`;
    const text = `${t.shareText1}${shareUrl}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const fetchSurvivalKit = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_survival_kit');
      if (data && data.length > 0) {
        setKit(data);
      } else {
        setKit(FALLBACK_SURVIVAL_KIT);
      }
    } catch (e) {
      setKit(FALLBACK_SURVIVAL_KIT);
    }
  };

  const handlePayTk = () => {
    router.push('/pricing');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black font-sans relative overflow-x-hidden selection:bg-rose-500/30">
      
      {/* 🔴 RED EMERGENCY FLASHING BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <motion.div
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-rose-600 mix-blend-overlay"
        ></motion.div>
        {/* Flashing Red Vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(225,29,72,0.15)]"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-rose-500 hover:text-rose-400 uppercase font-black text-xs tracking-widest bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20 transition-all active:scale-95">
            <ArrowLeft size={16} /> {t.retreat}
          </Link>
          <div className="flex items-center gap-2 text-rose-500 font-mono font-black text-xl bg-black px-4 py-2 rounded-lg border border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.4)]">
            <Clock size={20} className="animate-pulse" /> {formatTime(timeLeft)}
          </div>
        </div>

        {/* HERO */}
        <div className="text-center mb-12">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(225,29,72,0.8)] border-4 border-rose-400"
          >
            <AlertTriangle size={40} className="text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-[0_0_10px_rgba(225,29,72,0.8)]">
            {t.doOrDie}
          </h1>
          <p className="text-rose-200 font-medium text-sm md:text-base max-w-2xl mx-auto uppercase tracking-widest">
            {t.algorithmText1}{kit.length}{t.algorithmText2}
          </p>
        </div>

        {/* THE SURVIVAL KIT (VIRAL TRAP) */}
        <div className="relative">
          <div className="space-y-4">
            {kit.map((item, index) => {
              // 🔴 THE LOGIC: Show only 20% (first 2 items), blur the rest unless unlocked
              const isBlurred = index >= 2 && !isUnlocked;
              
              return (
                <div
                  key={item.id || `panic-item-${index}`}
                  className={`p-6 rounded-2xl border transition-all ${
                    isBlurred
                      ? 'bg-slate-900/40 border-slate-800 blur-[6px] select-none'
                      : 'bg-black border-rose-500/40 shadow-[0_0_30px_rgba(225,29,72,0.1)]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-500 font-black flex items-center justify-center shrink-0 border border-rose-500/30">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className={`text-lg font-black uppercase tracking-wide mb-2 ${isBlurred ? 'text-slate-400' : 'text-rose-400'}`}>
                        {item.topic}
                      </h3>
                      <p className={`font-medium leading-relaxed ${isBlurred ? 'text-slate-500' : 'text-slate-300'}`}>
                        {item.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🔴 THE PAYWALL / INVITE LOOP OVERLAY */}
          {!isUnlocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-0 left-0 w-full h-[70%] flex flex-col items-center justify-end pb-12 bg-gradient-to-t from-black via-black/90 to-transparent z-20"
            >
              <div className="bg-slate-950 p-8 rounded-[2rem] border-2 border-rose-600 shadow-[0_0_100px_rgba(225,29,72,0.4)] max-w-xl w-full text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                
                <Lock size={48} className="text-rose-500 mx-auto mb-4" />
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">{t.timeRunningOut}</h2>
                <p className="text-rose-300 text-sm font-bold mb-8 uppercase tracking-widest leading-relaxed">
                  {t.encryptedConcepts1}{kit.length - 2}{t.encryptedConcepts2}
                </p>

                <div className="space-y-4 relative z-10">
                  {/* Option 1: Payment */}
                  <button onClick={handlePayTk} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.5)] active:scale-95 flex items-center justify-center gap-2">
                    <ShieldAlert size={18} /> {t.payToUnlock}
                  </button>
                  
                  <div className="flex items-center gap-4 my-2">
                    <div className="h-px bg-slate-800 flex-1"></div>
                    <span className="text-slate-500 font-black text-xs uppercase">{t.orFreeMethod}</span>
                    <div className="h-px bg-slate-800 flex-1"></div>
                  </div>

                  {/* Option 2: Viral Loop */}
                  <button onClick={handleViralShare} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-95 flex items-center justify-center gap-2">
                    <Share2 size={18} /> 
                    {t.inviteFriends} {panicCount > 0 ? `(${panicCount}/3 ${t.joined})` : ''}
                  </button>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-4">
                    {t.sendEmergencyLink}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
