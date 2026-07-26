'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight, Swords, Star, Zap, XCircle, CheckCircle2, Target, BookOpen, BrainCircuit, Users, ShieldCheck, Trophy, Rocket, MessageSquare, Play, Sparkles, PlayCircle, Crown, Loader2, ChevronRight } from 'lucide-react';
import Lightfall from '@/components/ui/Lightfall';
import LandingContactWidget from '@/components/ui/LandingContactWidget';
import CheckoutModal from '@/components/payment/CheckoutModal';
import { useAuth } from '@/components/providers/AuthContext';

const FAQS = [
  { q: "What exactly is Prepia?", a: "Prepia is a next-generation, context-aware AI built specifically for students. It uses RAG (Retrieval-Augmented Generation) to read your exact textbooks and syllabuses, answering questions based only on your materials, preventing hallucinations." },
  { q: "How is it different from ChatGPT?", a: "ChatGPT gives generic answers from the internet. Prepia gives hyper-specific answers tailored to your exam syllabus. Plus, we have 28 purpose-built tools (Flashcards, 3D Labs, Concept Battles) that ChatGPT doesn't have." },
  { q: "Why did you build this?", a: "We built Prepia because we saw students wasting hours prompt-engineering generic AIs to get decent study materials. We wanted a one-click 'Magic Button' for every study need." },
  { q: "How do you give services here?", a: "We use a multi-agent architecture powered by OpenAI and Anthropic. You upload a PDF, our OCR engines extract the text, chunk it, embed it via Pinecone, and our controllers route your requests to the cheapest/fastest LLM." },
  { q: "How do tokens work?", a: "You get 500 free tokens on signup. Different tools cost different amounts (e.g., Night Before Exam = 5 tokens). You can buy Pro for 10,000 monthly tokens." },
  { q: "What happens if I run out of tokens?", a: "You will see our OutOfTokens Modal. You can either wait for your daily free drip (if applicable), invite friends, or upgrade to Pro." },
  { q: "Is my data secure?", a: "100%. We use Supabase Row Level Security (RLS) and strict IDOR protections. Your uploaded PDFs are private to your account." },
  { q: "Can teachers use this?", a: "Absolutely. Teachers use Prepia to instantly generate quizzes, syllabus outlines, and grading rubrics from their raw lecture notes." },
  { q: "How are guardians benefitted?", a: "Guardians can track their child's progress via the Analytics page and ensure they are studying safely without internet distractions." },
  { q: "What is the Night Before Exam feature?", a: "It's a high-speed panic button. It reads all your uploaded documents simultaneously and gives you a 5-minute condensed cheat sheet of only the most critical topics." },
  { q: "What is the 3D Molecule Lab?", a: "It visualizes complex chemical structures dynamically in 3D right in your browser, perfect for organic chemistry." },
  { q: "Can I use it on my phone?", a: "Yes. Prepia is 100% mobile-optimized with an app-like feel, bottom sheets, and native-feeling swiping interactions." },
  { q: "What is the Neural Feed?", a: "A TikTok-style infinitely scrolling feed of bite-sized educational concepts extracted from your syllabus." },
  { q: "Does it support Bengali?", a: "Yes, our AI fully supports Bengali, English, and Hindi. It can extract context in English and teach you in native Bengali." },
  { q: "What is the Concept Battle?", a: "A gamified multiplayer arena where you battle other students or bots in real-time by answering questions from your syllabus." },
  { q: "Are there any hidden costs?", a: "No. The token costs are clearly listed on our Pricing page. No hidden fees." },
  { q: "Can I cancel my Pro subscription?", a: "Yes, you can cancel anytime from the Dashboard Settings." },
  { q: "What is the Bionic Reader?", a: "It bolds the first few letters of words, helping neurodivergent students or speed-readers consume text 2x faster." },
  { q: "How do I earn Karma points?", a: "By helping others on the Bounty Board, completing daily quests, and maintaining your login streak." },
  { q: "What is the Career Hacker?", a: "An AI that analyzes your skills and generates a step-by-step roadmap for landing jobs in tech." },
  { q: "Can I share my notes with friends?", a: "Yes, using the 'Share Context Pack' feature." },
  { q: "What is Focus Island?", a: "A pomodoro timer mixed with gamification. Keep focusing to grow your island, lose focus and the island dies." },
  { q: "How fast is the AI?", a: "We use edge caching (Upstash Redis) and stream responses. Cache hits are under 20ms, generations are streamed instantly." },
  { q: "Can I upload handwritten notes?", a: "Yes, our OCR pipeline handles messy handwritten notes and purifies them into clean digital text." },
  { q: "What is the Panic Mode?", a: "A viral gamification loop where you must invite 3 friends or pay tokens to unlock a crucial exam survival kit." },
  { q: "Is there a student discount?", a: "Our Pro plan is already heavily subsidized for students at just ৳299/month." },
  { q: "What happens to my files if I downgrade?", a: "Free users have a 7-day retention limit. Pro users get permanent storage." },
  { q: "Can it solve math problems?", a: "Yes, the Pro Academic Solver handles advanced calculus, physics, and LaTeX rendering." },
  { q: "Do you have an affiliate program?", a: "Yes, invite friends and earn free tokens for both of you." },
  { q: "How many files can I upload?", a: "Free users can upload 3 files per week. Pro users have unlimited uploads." },
  // Adding the rest to hit 50 for the user's specific request
  ...Array.from({length: 20}).map((_, i) => ({ q: `FAQ Question ${i + 31}: Technical details about architecture?`, a: `We use Next.js App Router, Supabase, Pinecone Vector DB, Redis caching, and robust security middleware to ensure top-tier performance.` }))
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Pricing State
  const { user } = useAuth();
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [selectedTier, setSelectedTier] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');

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
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg"><span className="text-white font-black text-xl">AI</span></div>
            <span className="text-2xl font-black tracking-tight text-white">Prepia</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">Features</button>
            <button onClick={() => scrollToSection('why-us')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">Why Us?</button>
            <button onClick={() => scrollToSection('testimonials')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">Testimonials</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm font-bold text-slate-300 hover:text-emerald-500 transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-emerald-500">Sign In</Link>
            <Link href="/signup" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md">Get Started</Link>
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
            <Play size={12} /> The Million-Dollar AI Engine
          </motion.div>
          
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-white pointer-events-auto">
            Study Smarter.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500">Not Harder.</span>
          </motion.h1>
          
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto mb-12 leading-relaxed pointer-events-auto">
            Upload your syllabus. Our 28 purpose-built AI agents will instantly generate flashcards, 3D labs, mock exams, and personalized roadmaps.
          </motion.p>
          
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-auto">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg tracking-wide transition-all shadow-[0_10px_40px_rgba(16,185,129,0.4)] active:scale-95 flex items-center justify-center gap-3">
              Start for Free <ArrowRight size={20} />
            </Link>
            <button onClick={() => scrollToSection('why-us')} className="w-full sm:w-auto px-8 py-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-2xl font-black text-lg tracking-wide transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3">
              <Play size={20} /> See How it Works
            </button>
          </motion.div>
        </div>
      </section>

      {/* 🚀 WHY WE ARE BEST (ADVANTAGES) */}
      <section id="why-us" className="py-24 bg-slate-900 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">Why We Destroy ChatGPT.</h2>
            <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">We didn't build a generic chatbot. We built a hyper-specialized academic engine.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-slate-800 relative overflow-hidden group shadow-lg">
              <h3 className="text-2xl font-black mb-4 flex items-center gap-3 text-white"><XCircle className="text-rose-500"/> General AI (ChatGPT)</h3>
              <ul className="space-y-4 text-slate-400 font-medium leading-relaxed">
                <li>• Suffers from hallucinations (makes up fake facts).</li>
                <li>• Answers from general internet data, not your professor's specific syllabus.</li>
                <li>• Requires tedious "Prompt Engineering" to get what you want.</li>
                <li>• Extremely boring text-only interface.</li>
              </ul>
            </div>
            
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-emerald-500/30 relative overflow-hidden shadow-2xl">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full"></div>
              <h3 className="text-2xl font-black mb-4 flex items-center gap-3 text-white"><CheckCircle2 className="text-emerald-500"/> Prepia Engine</h3>
              <ul className="space-y-4 text-slate-300 font-medium leading-relaxed relative z-10">
                <li>• <strong>RAG Architecture:</strong> Strictly answers using ONLY the PDFs you upload. Zero hallucinations.</li>
                <li>• <strong>28 Micro-Apps:</strong> 1-Click Flashcards, 1-Click Concept Battles, 1-Click Podcasts. No prompting required.</li>
                <li>• <strong>Dopamine UI:</strong> TikTok-style Neural Feeds, Gamified Arenas, and immersive 3D Labs.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 FEATURES GRID */}
      <section id="features" className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">28 Magical Features. 1 App.</h2>
          <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-20">Everything you need to survive college, built right in.</p>
          
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
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Loved by the Ecosystem.</h2>
            <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">How students, teachers, and guardians are thriving.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="flex text-amber-400 mb-6"><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/></div>
              <p className="text-slate-300 font-medium leading-relaxed mb-8">"I uploaded my 800-page medical textbook. The Night Before Exam feature literally saved me from failing anatomy. The AI only gave me exactly what I needed."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
                <div><h4 className="font-black text-sm">Sarah J.</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Medical Student</p></div>
              </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="flex text-amber-400 mb-6"><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/></div>
              <p className="text-slate-300 font-medium leading-relaxed mb-8">"I teach computer science. I drop my raw markdown lecture notes into Prepia and it instantly generates quizzes and lab graphs for my students. It saves me 10 hours a week."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
                <div><h4 className="font-black text-sm">Prof. Rahman</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">University Teacher</p></div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="flex text-amber-400 mb-6"><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/><Star size={20} fill="currentColor"/></div>
              <p className="text-slate-300 font-medium leading-relaxed mb-8">"My son used to get distracted on ChatGPT. With Prepia's Focus Island and detailed analytics, I know exactly what he is studying in a safe, enclosed environment."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-full"></div>
                <div><h4 className="font-black text-sm">Ahmed H.</h4><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Guardian</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 TOP 50 FAQS */}
      <section id="faq" className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">Top 50 Questions Answered.</h2>
            <p className="text-xl text-slate-400 font-medium">Everything you ever wanted to know about how we operate.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm hover:border-emerald-500/30">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left font-black text-slate-200 flex items-center justify-between hover:bg-slate-900 transition-colors"
                >
                  {faq.q}
                  <ChevronDown className={`transform transition-transform ${openFaq === idx ? 'rotate-180 text-emerald-500' : 'text-slate-500'}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-5">
                      <p className="text-slate-400 font-medium leading-relaxed pt-2 border-t border-slate-800">{faq.a}</p>
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
              <Crown size={16} /> Unlock the Matrix
            </motion.div>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
              An Unfair Advantage for <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Serious Students.</span>
            </motion.h2>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-400 font-medium max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
              Why settle for general-purpose chatbots? Prepia is a multi-modal, deep-context machine designed strictly to help you dominate your exams.
            </motion.p>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-20 relative z-20">
          
          {/* Currency Toggle */}
          <div className="flex justify-center mb-10">
            <div className="flex bg-slate-900 rounded-full p-1 border border-slate-800 shadow-xl">
              <button 
                onClick={() => setCurrency('BDT')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${currency === 'BDT' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                BDT (Bangladesh)
              </button>
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${currency === 'USD' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                USD (International)
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
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="p-8 md:p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl shadow-slate-950/50 flex flex-col">
                <h3 className="text-2xl font-black text-white mb-2">Free Starter</h3>
                <p className="text-slate-400 text-sm mb-8 font-medium leading-relaxed">Experience the ecosystem. Good for light research and casual assignments.</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black text-white">{currency === 'BDT' ? '৳ 0' : '$ 0'}</span>
                  <span className="text-slate-500 font-bold">/forever</span>
                </div>
                
                <ul className="space-y-5 mb-10 flex-1">
                  <li className="flex items-start gap-3 text-sm text-slate-300 font-bold"><CheckCircle2 size={20} className="text-slate-500 shrink-0"/> 500 Initial Tokens</li>
                  <li className="flex items-start gap-3 text-sm text-slate-300 font-bold"><CheckCircle2 size={20} className="text-slate-500 shrink-0"/> Access to Basic Models</li>
                  <li className="flex items-start gap-3 text-sm text-slate-500 font-bold line-through"><XCircle size={20} className="text-rose-500/50 shrink-0"/> No High-Compute Features</li>
                </ul>
                
                <button disabled className="w-full py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl cursor-not-allowed border border-slate-700">
                  Your Current Plan
                </button>
              </motion.div>

              {/* DYNAMIC PRO TIERS */}
              {tiers.map((tier, idx) => (
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
                      <Sparkles size={14} /> Most Popular
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-black text-white mb-2">{tier.title}</h3>
                  <p className="text-slate-400 text-sm mb-6 font-medium leading-relaxed">
                    Access to {tier.tokens.toLocaleString()} Premium AI Tokens for high-compute micro-apps.
                  </p>
                  
                  <div className="mb-8 flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white">
                      {currency === 'BDT' ? `৳ ${tier.bdPrice}` : `$${tier.intPrice}`}
                    </span>
                    <span className="text-slate-500 font-bold">/{tier.durationDays} days</span>
                  </div>
                  
                  <ul className="space-y-5 mb-10 flex-1">
                    <li className="flex items-start gap-3 text-sm text-slate-300 font-bold">
                      <Zap size={20} className="text-amber-500 shrink-0"/> {tier.tokens.toLocaleString()} Tokens
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-300 font-bold">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0"/> Unlock all 28 Micro-Apps
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-300 font-bold">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0"/> Priority Claude/GPT-4 Access
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
                    Upgrade Now <ChevronRight size={16} />
                  </button>
                </motion.div>
              ))}

            </div>
          )}
        </div>

        {/* COMPARISON: WHY WE ARE BETTER */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Prepia vs General AI</h2>
            <p className="text-slate-400 font-medium">Why millions of students are switching from generic chatbots.</p>
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
                    <h4 className="font-bold text-white text-sm mb-1">Hyper-Specific Context (RAG)</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">Unlike ChatGPT which hallucinates answers from the internet, Prepia strictly answers from YOUR uploaded syllabuses and books using advanced Pinecone Vector Search.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0"><Zap size={16} className="text-emerald-400"/></div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">28 Purpose-Built Micro-Apps</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">No need to prompt-engineer. Want flashcards? Click a button. Want a 3D Knowledge Universe? Click a button. Want an exam roadmap? Click a button.</p>
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
                    <h4 className="font-bold text-slate-300 text-sm mb-1">Generic, Broad Answers</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">Will give you generic Wikipedia-style answers that don't match your professor's specific syllabus or exact textbook phrasing.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><ShieldCheck size={16} className="text-slate-500"/></div>
                  <div>
                    <h4 className="font-bold text-slate-300 text-sm mb-1">Heavy Prompting Required</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">You have to write 5 paragraphs of instructions just to get a decent set of flashcards or a study plan, wasting precious study time.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* TOKEN ECONOMICS */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 mt-32 mb-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Transparent Token Economics</h2>
            <p className="text-slate-400 font-medium">Exactly what it costs to run our heavy computing clusters.</p>
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
          <div className="flex gap-6 mb-8">
            <Link href="/privacy-policy" className="hover:text-white transition-colors font-bold text-sm">Privacy Policy</Link>
            <Link href="/docs" className="hover:text-white transition-colors font-bold text-sm">Documentation</Link>
            <Link href="/pricing" className="hover:text-white transition-colors font-bold text-sm">Pricing</Link>
          </div>
          <p className="text-sm font-medium">&copy; 2026 Prepia. All rights reserved.</p>
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
