'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight, Swords, Star, Zap, XCircle, CheckCircle2, Target, BookOpen, BrainCircuit, Users, ShieldCheck, Trophy, Rocket, MessageSquare, Play, Sparkles, PlayCircle, Crown, Loader2, ChevronRight } from 'lucide-react';
import Lightfall from '@/components/ui/Lightfall';
import LandingContactWidget from '@/components/ui/LandingContactWidget';
import CheckoutModal from '@/components/payment/CheckoutModal';
import { useAuth } from '@/components/providers/AuthContext';
import { useI18n, Language } from '@/components/providers/I18nContext';
import { LANDING_TRANSLATIONS } from './landingTranslations';

];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Pricing State
  const { user } = useAuth();
  const { language, setLanguage } = useI18n();
  const lT = (key: string) => LANDING_TRANSLATIONS[key]?.[language as keyof typeof LANDING_TRANSLATIONS[string]] || LANDING_TRANSLATIONS[key]?.en || key;
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [selectedTier, setSelectedTier] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [planType, setPlanType] = useState<'solo' | 'family'>('solo');

  useEffect(() => {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'Asia/Dhaka') {
      setCurrency('USD');
    }

    const fetchConfig = async () => {
      try {
        const apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
        const fetchUrl = apiUrlBase.endsWith('/api') 
          ? `${apiUrlBase}/payments/pricing-config` 
          : `${apiUrlBase}/api/payments/pricing-config`;
        const res = await fetch(fetchUrl);
        const data = await res.json();
        if (data.status === 'success') {
          // Sort by days so they appear in logical order
          const sortedTiers = data.data.sort((a: any, b: any) => a.durationDays - b.durationDays);
          setTiers(sortedTiers);
        }
      } catch (err) {
        console.error('Failed to load pricing config', err);
      } finally {
        setIsLoadingPricing(false);
      }
    };
    fetchConfig();
  }, []);

  const handleUpgrade = (tier: any) => {
    setSelectedTier(tier);
    setIsModalOpen(true);
  };

  const featureCosts = [
    { feature: 'Exam Oracle Predictor', cost: 20 },
    { feature: 'Career Hacker', cost: 20 },
    { feature: 'Panic Mode Unlock', cost: 20 },
    { feature: 'Notes Purifier', cost: 15 },
    { feature: 'YouTube Decoder', cost: 15 },
    { feature: 'Lab Auto-Grapher', cost: 15 },
    { feature: 'Timeline Mapper', cost: 15 },
    { feature: 'Knowledge Universe (3D)', cost: 15 },
    { feature: 'Wallpaper Generator', cost: 15 },
    { feature: 'Logic Workspace Flow', cost: 15 },
    { feature: 'Podcast Generator', cost: 15 },
    { feature: 'StoryMode Generation', cost: 15 },
    { feature: 'Syllabus Extractor', cost: 10 },
    { feature: 'Pro Academic Solver', cost: 10 },
    { feature: 'Battle Arena Host', cost: 10 },
    { feature: 'Concept Battle', cost: 10 },
    { feature: 'Calendar Sync', cost: 10 },
    { feature: 'Smart Book Jumper', cost: 5 },
    { feature: 'AI Teacher Chat', cost: 5 },
    { feature: 'Flashcard Gen', cost: 5 },
    { feature: 'Night Before Exam', cost: 5 },
    { feature: 'Main AI Chat', cost: 2 },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* 🚀 NAVIGATION */}
      <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-xl shadow-lg">
               <img src="/icon.svg" alt="Prepia Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">Prepia</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">{lT('nav.features')}</button>
            <button onClick={() => scrollToSection('why-us')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">{lT('nav.whyUs')}</button>
            <button onClick={() => scrollToSection('testimonials')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">{lT('nav.testimonials')}</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">{lT('nav.faq')}</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 mr-1 sm:mr-2">
              <button onClick={() => setLanguage('en')} className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-colors ${language === 'en' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLanguage('bn')} className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-colors ${language === 'bn' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>বাং</button>
              <button onClick={() => setLanguage('hi')} className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-colors ${language === 'hi' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>हिं</button>
            </div>
            {user ? (
              <Link href="/dashboard" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md">{lT('nav.dashboard')}</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-emerald-500">{lT('nav.signIn')}</Link>
                <Link href="/signup" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md">{lT('nav.getStarted')}</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <section className="pt-40 pb-20 px-6 w-full text-center relative overflow-hidden md:overflow-visible bg-slate-950">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Lightfall
            colors={['#10b981', '#3b82f6', '#8b5cf6']}
            backgroundColor="#020617"
            speed={0.3}
            streakCount={2}
            streakWidth={1.2}
            streakLength={1.5}
            glow={0.5}
            density={0.7}
            twinkle={0.5}
            zoom={1.5}
            backgroundGlow={0.8}
            opacity={1}
            mouseInteraction={true}
            mouseStrength={0.4}
            mouseRadius={0.5}
            dpr={1}
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto pointer-events-none">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-800 shadow-sm text-sm font-black uppercase tracking-widest text-emerald-500 mb-6 pointer-events-auto">
            <Play size={12} /> {lT('hero.badge')}
          </motion.div>
          
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-white pointer-events-auto">
            {lT('hero.title1')}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500">{lT('hero.title2')}</span>
          </motion.h1>
          
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto mb-12 leading-relaxed pointer-events-auto">
            {lT('hero.subtitle')}
          </motion.p>
          
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-auto">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg tracking-wide transition-all shadow-[0_10px_40px_rgba(16,185,129,0.4)] active:scale-95 flex items-center justify-center gap-3">
              {lT('hero.cta')} <ArrowRight size={20} />
            </Link>
            <button onClick={() => scrollToSection('why-us')} className="w-full sm:w-auto px-8 py-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-2xl font-black text-lg tracking-wide transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3">
              <Play size={20} /> {lT('hero.secondaryCta')}
            </button>
          </motion.div>
        </div>
      </section>

      {/* 🚀 WHY WE ARE BEST (ADVANTAGES) */}
      <section id="why-us" className="py-24 bg-slate-900 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">{lT('why.title')}</h2>
            <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">{lT('why.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-slate-800 relative overflow-hidden group shadow-lg">
              <h3 className="text-2xl font-black mb-4 flex items-center gap-3 text-white"><XCircle className="text-rose-500"/> {lT('why.chatgpt.title')}</h3>
              <ul className="space-y-4 text-slate-400 font-medium leading-relaxed">
                <li>• {lT('why.chatgpt.point1')}</li>
                <li>• {lT('why.chatgpt.point2')}</li>
                <li>• {lT('why.chatgpt.point3')}</li>
                <li>• {lT('why.chatgpt.point4')}</li>
              </ul>
            </div>
            
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-emerald-500/30 relative overflow-hidden shadow-2xl">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full"></div>
              <h3 className="text-2xl font-black mb-4 flex items-center gap-3 text-white"><CheckCircle2 className="text-emerald-500"/> {lT('why.prepia.title')}</h3>
              <ul className="space-y-4 text-slate-300 font-medium leading-relaxed relative z-10">
                <li>• <strong>RAG Architecture:</strong> {lT('why.prepia.point1')}</li>
                <li>• <strong>28 Micro-Apps:</strong> {lT('why.prepia.point2')}</li>
                <li>• <strong>Dopamine UI:</strong> {lT('why.prepia.point3')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 FEATURES GRID */}
      <section id="features" className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">{lT('features.title')}</h2>
          <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-20">{lT('features.subtitle')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 text-left">
            {[
              { title: "Night Before Exam", icon: <Zap/>, desc: "Condenses 500 pages into a 5-minute cheat sheet." },
              { title: "Concept Battle", icon: <Swords/>, desc: "Multiplayer arena to test your knowledge against friends." },
              { title: "3D Molecule Lab", icon: <Target/>, desc: "Render organic chemistry molecules dynamically." },
              { title: "TikTok Neural Feed", icon: <Play/>, desc: "Swipe through bite-sized syllabus concepts." },
              { title: "Podcast Generator", icon: <MessageSquare/>, desc: "Turns your boring notes into an engaging two-person debate." },
              { title: "Focus Island", icon: <ShieldCheck/>, desc: "Gamified Pomodoro timer to prevent distraction." },
              { title: "Career Hacker", icon: <Rocket/>, desc: "AI roadmap to land your dream job." },
              { title: "Bionic Reader", icon: <BookOpen/>, desc: "Read 2x faster with neurodivergent text formatting." }
            ].map((f, i) => (
              <div key={i} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm hover:shadow-2xl hover:border-emerald-500/50 hover:bg-slate-800/50 hover:-translate-y-2 transition-all group">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-black text-white mb-2">{f.title}</h3>
                <p className="text-sm font-medium text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 TESTIMONIALS */}
      <section id="testimonials" className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">{lT('testimonials.title')}</h2>
            <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">{lT('testimonials.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="flex text-amber-400 mb-6"><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/></div>
              <p className="text-slate-300 font-medium leading-relaxed mb-8">{lT('test1.text')}</p>
              <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 mr-2">
              <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'en' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLanguage('bn')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'bn' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>বাং</button>
              <button onClick={() => setLanguage('hi')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'hi' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>हिं</button>
            </div>
                <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
                <div><h4 className="font-black text-sm">Sarah J.</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{lT('test1.role')}</p></div>
              </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="flex text-amber-400 mb-6"><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/></div>
              <p className="text-slate-300 font-medium leading-relaxed mb-8">{lT('test2.text')}</p>
              <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 mr-2">
              <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'en' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLanguage('bn')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'bn' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>বাং</button>
              <button onClick={() => setLanguage('hi')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'hi' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>हिं</button>
            </div>
                <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
                <div><h4 className="font-black text-sm">Prof. Rahman</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{lT('test2.role')}</p></div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="flex text-amber-400 mb-6"><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/></div>
              <p className="text-slate-300 font-medium leading-relaxed mb-8">{lT('test3.text')}</p>
              <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 mr-2">
              <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'en' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLanguage('bn')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'bn' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>বাং</button>
              <button onClick={() => setLanguage('hi')} className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${language === 'hi' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>हिं</button>
            </div>
                <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
                <div><h4 className="font-black text-sm">Ahmed H.</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{lT('test3.role')}</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 TOP 50 FAQS */}
      <section id="faq" className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">{lT('faq.title')}</h2>
            <p className="text-xl text-slate-400 font-medium">{lT('faq.subtitle')}</p>
          </div>

          <div className="space-y-4">
            {Array.from({length: 50}).map((_, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm hover:border-emerald-500/30">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left font-black text-slate-200 flex items-center justify-between hover:bg-slate-900 transition-colors"
                >
                  {lT(`faq.${idx + 1}.q`)}
                  <ChevronDown className={`transform transition-transform ${openFaq === idx ? 'rotate-180 text-emerald-500' : 'text-slate-500'}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-5">
                      <p className="text-slate-400 font-medium leading-relaxed pt-2 border-t border-slate-800">{lT(`faq.${idx + 1}.a`)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 PRICING SECTION (Copied from Pricing Page) */}
      <section id="pricing" className="py-24 bg-slate-950 border-t border-slate-900 font-sans">
        
        {/* HERO SECTION */}
        <div className="bg-slate-950 pt-10 pb-32 px-4 md:px-8 relative overflow-hidden rounded-b-[3rem]">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none blur-3xl animate-pulse"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest mb-8">
              <Crown size={16} /> {lT('pricing.badge')}
            </motion.div>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
              {lT('pricing.title1')} <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{lT('pricing.title2')}</span>
            </motion.h2>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-400 font-medium max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
              {lT('pricing.subtitle')}
            </motion.p>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-20 relative z-20">
          
          {/* Currency & Plan Type Toggles */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-10">
            {/* Currency Toggle */}
            <div className="flex bg-slate-900 rounded-full p-1 border border-slate-800 shadow-xl">
              <button 
                onClick={() => setCurrency('BDT')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${currency === 'BDT' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {lT('pricing.toggle.bdt')}
              </button>
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${currency === 'USD' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {lT('pricing.toggle.usd')}
              </button>
            </div>

            {/* Plan Type Toggle */}
            <div className="flex bg-slate-900 rounded-full p-1 border border-slate-800 shadow-xl">
              <button 
                onClick={() => setPlanType('solo')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${planType === 'solo' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {lT('pricing.toggle.solo')}
              </button>
              <button 
                onClick={() => setPlanType('family')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${planType === 'family' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Users size={16} /> {lT('pricing.toggle.family')}
              </button>
            </div>
          </div>

          {isLoadingPricing ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-500" size={48} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* FREE PLAN */}
              {planType === 'solo' && (
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="p-8 md:p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl shadow-slate-950/50 flex flex-col">
                <h3 className="text-2xl font-black text-white mb-2">{lT('pricing.free.title')}</h3>
                <p className="text-slate-400 text-sm mb-8 font-medium leading-relaxed">{lT('pricing.free.desc')}</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">{currency === 'BDT' ? `৳ ${lT('pricing.free.price')}` : `$ ${lT('pricing.free.price')}`}</span>
                  <span className="text-slate-500 font-bold">{lT('pricing.free.period')}</span>
                </div>
                
                <ul className="space-y-5 mb-10 flex-1">
                  <li className="flex items-start gap-3 text-sm text-slate-300 font-bold"><CheckCircle2 size={20} className="text-slate-500 shrink-0"/> {lT('pricing.free.f1')}</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300 font-bold"><CheckCircle2 size={20} className="text-slate-500 shrink-0"/> {lT('pricing.free.f2')}</li>
                  <li className="flex items-start gap-3 text-sm text-slate-500 font-bold line-through"><XCircle size={20} className="text-rose-500/50 shrink-0"/> {lT('pricing.free.f3')}</li>
                </ul>
                
                <button disabled className="w-full py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl cursor-not-allowed border border-slate-700">
                  {lT('pricing.free.btn')}
                </button>
              </motion.div>
              )}

              {/* DYNAMIC PRO TIERS */}
              {tiers.filter(t => planType === 'family' ? t.planKind === 'family' : (!t.planKind || t.planKind === 'solo')).map((tier, idx) => (
                <motion.div 
                  key={tier.id}
                  initial={{ y: 40, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.4 + (idx * 0.1) }} 
                  className={`p-8 md:p-10 rounded-[2.5rem] flex flex-col relative overflow-hidden group transition-all hover:-translate-y-2
                    ${tier.popular 
                      ? 'bg-slate-950 border-2 border-emerald-500/50 shadow-[0_30px_60px_rgba(16,185,129,0.2)] lg:scale-105 z-10' 
                      : 'bg-slate-900 border border-slate-800 hover:border-emerald-500/30 shadow-xl'
                    }`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={150} className="text-emerald-500" /></div>
                  )}
                  
                  {tier.popular && (
                    <div className="inline-flex w-max items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6">
                      <Sparkles size={14} /> {lT('pricing.pro.popular')}
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-black text-white mb-2">{tier.title}</h3>
                  <p className="text-slate-400 text-sm mb-6 font-medium leading-relaxed">
                    Access to {tier.tokens.toLocaleString()} {lT('pricing.pro.desc')}
                  </p>
                  
                  <div className="mb-8 flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">
                        {currency === 'BDT' ? `৳ ${tier.bdPrice}` : `$${tier.intPrice}`}
                      </span>
                      <span className="text-slate-500 font-bold">/{tier.durationDays} {lT('pricing.pro.days')}</span>
                    </div>
                    {/* Strikethrough pricing */}
                    {(currency === 'BDT' ? tier.originalBdPrice : tier.originalIntPrice) && (
                      <div className="text-slate-500 font-bold text-sm">
                        {lT('pricing.pro.regularly')} <span className="line-through">{currency === 'BDT' ? `৳ ${tier.originalBdPrice}` : `$${tier.originalIntPrice}`}</span>
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-5 mb-10 flex-1">
                    <li className="flex items-start gap-3 text-sm text-slate-300 font-bold">
                      <Zap size={20} className="text-amber-500 shrink-0"/> {tier.tokens.toLocaleString()} {lT('pricing.pro.tokens')}
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-300 font-bold">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0"/> {lT('pricing.pro.unlockAll')}
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-300 font-bold">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0"/> {lT('pricing.pro.priority')}
                    </li>
                  </ul>
                  
                  <button 
                    onClick={() => handleUpgrade(tier)} 
                    className={`w-full py-4 font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg
                      ${tier.popular 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                  >
                    {lT('pricing.pro.upgrade')} <ChevronRight size={16} />
                  </button>
                </motion.div>
              ))}

            </div>
          )}
        </div>

        {/* COMPARISON: WHY WE ARE BETTER */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">{lT('compare.title')}</h2>
            <p className="text-slate-400 font-medium">{lT('compare.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Prepia Side */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-emerald-500/30 shadow-xl shadow-emerald-900/10 relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-slate-900"><CheckCircle2 size={24}/></div>
              <h3 className="text-xl font-black text-white mb-6 mt-2">Prepia</h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0"><Target size={16} className="text-emerald-400"/></div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">{lT('compare.p.f1.title')}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{lT('compare.p.f1.desc')}</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0"><Zap size={16} className="text-emerald-400"/></div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">{lT('compare.p.f2.title')}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{lT('compare.p.f2.desc')}</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* General AI Side */}
            <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 relative shadow-lg">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-900"><XCircle size={24}/></div>
              <h3 className="text-xl font-black text-white mb-6 mt-2">ChatGPT / Claude</h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><ShieldCheck size={16} className="text-slate-500"/></div>
                  <div>
                    <h4 className="font-bold text-slate-300 text-sm mb-1">{lT('compare.c.f1.title')}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{lT('compare.c.f1.desc')}</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><ShieldCheck size={16} className="text-slate-500"/></div>
                  <div>
                    <h4 className="font-bold text-slate-300 text-sm mb-1">{lT('compare.c.f2.title')}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{lT('compare.c.f2.desc')}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* TOKEN ECONOMICS */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 mt-32 mb-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">{lT('economics.title')}</h2>
            <p className="text-slate-400 font-medium">{lT('economics.subtitle')}</p>
          </div>
          
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0">
              {featureCosts.map((item, idx) => (
                <div key={idx} className="p-4 border-b border-r border-slate-800 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                  <span className="text-sm font-bold text-slate-300">{item.feature}</span>
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">
                    <Zap size={12} className="text-amber-400 fill-amber-400"/>
                    <span className="text-xs font-black text-amber-400">{item.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 text-center border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <div className="text-2xl font-black tracking-tight text-white mb-6">Prepia<span className="text-emerald-500">.</span></div>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <Link href="/privacy-policy" className="hover:text-white transition-colors font-bold text-sm">{lT('footer.privacy')}</Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors font-bold text-sm">{lT('footer.terms')}</Link>
            <Link href="/refund-policy" className="hover:text-white transition-colors font-bold text-sm">{lT('footer.refund')}</Link>
            <Link href="/docs" className="hover:text-white transition-colors font-bold text-sm">{lT('footer.docs')}</Link>
            <Link href="/pricing" className="hover:text-white transition-colors font-bold text-sm">{lT('footer.pricing')}</Link>
            <Link href="/contact" className="hover:text-white transition-colors font-bold text-sm">{lT('footer.contact')}</Link>
          </div>
          <p className="text-sm font-medium">{lT('footer.rights')}</p>
        </div>
      </footer>

      <LandingContactWidget />

      <CheckoutModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={user?.id || ''}
        selectedTier={selectedTier}
        currency={currency}
      />
    </div>
  );
}
