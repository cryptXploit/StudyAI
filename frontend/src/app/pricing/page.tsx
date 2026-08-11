'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, Zap, Target, ShieldCheck, XCircle, ChevronRight, Crown, Loader2, Users } from 'lucide-react';
import CheckoutModal from '@/components/payment/CheckoutModal';
import { useAuth } from '@/components/providers/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currency, setCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [planType, setPlanType] = useState<'solo' | 'family'>('solo');
  const [tokenCosts, setTokenCosts] = useState<Record<string, number>>({});

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
          setTokenCosts(data.tokenCosts || {});
        }
      } catch (err) {
        console.error('Failed to load pricing config', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleUpgrade = (tier: any) => {
    if (!user) {
      toast.error('Please sign in or create an account to upgrade.');
      router.push('/login?redirect=/pricing');
      return;
    }
    setSelectedTier(tier);
    setIsModalOpen(true);
  };

  const featureCosts = [
    ['Exam Oracle Predictor', 'ORACLE_PREDICT'], ['Career Hacker', 'CAREER_HACKER'], ['Panic Mode Unlock', 'PANIC_MODE_UNLOCK'],
    ['Notes Purifier', 'NOTES_PURIFIER'], ['YouTube Decoder', 'YOUTUBE_DECODER'], ['Lab Auto-Grapher', 'LAB_GRAPH'],
    ['Timeline Mapper', 'TIMELINE_GEN'], ['Knowledge Universe (3D)', 'UNIVERSE_GEN'], ['Wallpaper Generator', 'WALLPAPER_GEN'],
    ['Logic Workspace Flow', 'LOGICFLOW_GEN'], ['Podcast Generator', 'PODCAST_GEN'], ['StoryMode Generation', 'STORY_GEN'],
    ['Syllabus Extractor', 'SYLLABUS_GEN'], ['Pro Academic Solver', 'PROBLEM_SOLVER'], ['Battle Arena Host', 'BATTLE_ARENA_HOST'],
    ['Concept Battle', 'CONCEPT_BATTLE'], ['Calendar Sync', 'CALENDAR_SYNC'], ['Smart Book Jumper', 'BOOK_JUMPER'],
    ['AI Teacher Chat', 'AI_CHAT'], ['Flashcard Gen', 'FLASHCARDS'], ['Night Before Exam', 'NIGHT_BEFORE'],
  ].map(([feature, key]) => ({ feature, cost: tokenCosts[key] ?? 0 }));

  return (
    <>
      <div className="bg-slate-950 min-h-screen pb-24 font-sans selection:bg-emerald-500/30">
        
        {/* HERO SECTION */}
        <div className="bg-slate-950 pt-20 pb-32 px-4 md:px-8 relative overflow-hidden rounded-b-[3rem]">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none blur-3xl animate-pulse"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest mb-8">
              <Crown size={16} /> Unlock the Matrix
            </motion.div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
              An Unfair Advantage for <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Serious Students.</span>
            </motion.h1>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-400 font-medium max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
              Why settle for general-purpose chatbots? Prepia is a multi-modal, deep-context machine designed strictly to help you dominate your exams.
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
                BDT (Bangladesh)
              </button>
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${currency === 'USD' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                USD (International)
              </button>
            </div>

            {/* Plan Type Toggle */}
            <div className="flex bg-slate-900 rounded-full p-1 border border-slate-800 shadow-xl">
              <button 
                onClick={() => setPlanType('solo')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${planType === 'solo' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Solo Plans
              </button>
              <button 
                onClick={() => setPlanType('family')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${planType === 'family' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Users size={16} /> Family Plans
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-500" size={48} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* FREE PLAN */}
              {planType === 'solo' && (
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
                      <Sparkles size={14} /> Most Popular
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-black text-white mb-2">{tier.title}</h3>
                  <p className="text-slate-400 text-sm mb-6 font-medium leading-relaxed">
                    Access to {tier.tokens.toLocaleString()} Premium AI Tokens for high-compute micro-apps.
                  </p>
                  
                  <div className="mb-8 flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">
                        {currency === 'BDT' ? `৳ ${tier.bdPrice}` : `$${tier.intPrice}`}
                      </span>
                      <span className="text-slate-500 font-bold">/{tier.durationDays} days</span>
                    </div>
                    {/* Strikethrough pricing */}
                    {(currency === 'BDT' ? tier.originalBdPrice : tier.originalIntPrice) && (
                      <div className="text-slate-500 font-bold text-sm">
                        Regularly <span className="line-through">{currency === 'BDT' ? `৳ ${tier.originalBdPrice}` : `$${tier.originalIntPrice}`}</span>
                      </div>
                    )}
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

      </div>

      <CheckoutModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={user?.id || ''}
        selectedTier={selectedTier}
        currency={currency}
      />
    </>
  );
}
