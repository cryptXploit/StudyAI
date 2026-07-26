'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, Bookmark, Share2, BrainCircuit, Lock, Sparkles, Zap, ChevronUp, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import SecureLayout from '@/components/layout/SecureLayout';

// --- MOCK FALLBACK DATA ---
// If your database 'chunks' table is empty, this premium mock data will show up automatically.
const FALLBACK_CHUNKS = [
  { id: '1', content: "Quantum Entanglement is a physical phenomenon that occurs when a group of particles are generated, interact, or share spatial proximity in a way such that the quantum state of each particle of the group cannot be described independently of the state of the others.", topic: "Quantum Physics" },
  { id: '2', content: "In Machine Learning, Gradient Descent is a first-order iterative optimization algorithm for finding a local minimum of a differentiable function. The idea is to take repeated steps in the opposite direction of the gradient.", topic: "Artificial Intelligence" },
  { id: '3', content: "The Mitochondria is the powerhouse of the cell, responsible for generating most of the chemical energy needed to power the cell's biochemical reactions. This energy is stored in a molecule called ATP.", topic: "Cell Biology" },
  { id: '4', content: "A Dipole Antenna is the simplest and most widely used class of antenna. It consists of two identical conductive elements such as metal wires or rods, which are bilaterally symmetrical.", topic: "Telecommunications" },
  { id: '5', content: "In React, a Hook is a special function that lets you 'hook into' React features. For example, useState is a Hook that lets you add React state to function components.", topic: "Web Development" }
];

type SwipeDirection = 'up' | 'down' | 'none';

export default function ForYouFeedPage() {
  const supabase = createClient();
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [likedCards, setLikedCards] = useState<Set<string>>(new Set());
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());

  // Configuration
  const PREMIUM_TRIGGER_INTERVAL = 5; // Shows premium card every 5 swipes

  useEffect(() => {
    fetchConceptChunks();
  }, []);

  const fetchConceptChunks = async () => {
    setIsLoading(true);
    try {
      // Trying to fetch random chunks from your RAG database. 
      // Replace 'document_chunks' with your actual table name if different.
      const { data, error } = await supabase
        .from('document_chunks')
        .select('id, content, metadata')
        .limit(20);

      if (data && data.length > 0) {
        // Format your DB data
        const formattedData = data.map(d => ({
          id: d.id,
          content: d.content,
          topic: d.metadata?.topic || 'General Concept'
        }));
        setCards(shuffleArray(formattedData));
      } else {
        // Fallback to mock data for instant preview
        setCards(shuffleArray([...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS])); 
      }
    } catch (error) {
      setCards(shuffleArray([...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS]));
    } finally {
      setIsLoading(false);
    }
  };

  const shuffleArray = (array: any[]) => array.sort(() => Math.random() - 0.5);

  const handleDragEnd = (e: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.y < -swipeThreshold) {
      // Swiped Up -> Next Card
      if (currentIndex < cards.length - 1) setCurrentIndex(prev => prev + 1);
    } else if (info.offset.y > swipeThreshold) {
      // Swiped Down -> Previous Card
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    }
  };

  const handleAction = (type: 'like' | 'save', id: string) => {
    if (type === 'like') {
      const newSet = new Set(likedCards);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      setLikedCards(newSet);
    } else {
      const newSet = new Set(savedCards);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      setSavedCards(newSet);
    }
  };

  if (isLoading) {
    return (
      <SecureLayout>
        <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-slate-950">
           <div className="animate-pulse flex flex-col items-center">
              <BrainCircuit size={48} className="text-emerald-500 mb-4 animate-bounce" />
              <p className="text-emerald-500/80 font-black tracking-widest uppercase text-xs">Curating Your Neural Feed...</p>
           </div>
        </div>
      </SecureLayout>
    );
  }

  const isPremiumCard = (currentIndex + 1) % PREMIUM_TRIGGER_INTERVAL === 0 && currentIndex !== 0;
  const activeCard = cards[currentIndex];

  return (
    <SecureLayout>
      {/* 🟢 FULL SCREEN TIKTOK CONTAINER */}
      <div className="h-[calc(100vh-80px)] w-full max-w-md mx-auto bg-black relative overflow-hidden md:rounded-[2rem] md:my-4 md:border-4 md:border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* Top Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none flex justify-center pt-4">
          <span className="text-white/90 font-black tracking-widest uppercase text-xs flex items-center gap-2">
             <Zap size={14} className="text-amber-400" /> For You <span className="w-1 h-1 bg-white rounded-full mx-1"></span> Following
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          >
            {isPremiumCard ? (
              <PremiumPaywallCard currentIndex={currentIndex} />
            ) : (
              <ConceptCard 
                data={activeCard} 
                isQuiz={currentIndex % 2 !== 0} // Every alternate card acts as a quiz!
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* 🟢 RIGHT SIDEBAR (Like, Save, Share) - TikTok Style */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-6 z-30">
           <SidebarButton 
             icon={<Heart size={26} className={likedCards.has(activeCard?.id) ? "fill-rose-500 text-rose-500" : "text-white"} />} 
             label={likedCards.has(activeCard?.id) ? "1.2k" : "Like"} 
             onClick={() => handleAction('like', activeCard?.id)} 
           />
           <SidebarButton 
             icon={<Bookmark size={26} className={savedCards.has(activeCard?.id) ? "fill-amber-400 text-amber-400" : "text-white"} />} 
             label={savedCards.has(activeCard?.id) ? "Saved" : "Save"} 
             onClick={() => handleAction('save', activeCard?.id)} 
           />
           <SidebarButton 
             icon={<Share2 size={26} className="text-white" />} 
             label="Share" 
             onClick={() => {}} // Could trigger Web Share API
           />
        </div>

        {/* Bottom Swipe Indicator */}
        <div className="absolute bottom-4 left-0 w-full flex flex-col items-center justify-center opacity-50 z-20 pointer-events-none animate-bounce">
           <ChevronUp size={24} className="text-white mb-[-10px]" />
           <span className="text-[9px] text-white font-bold uppercase tracking-widest">Swipe to learn</span>
        </div>
      </div>
    </SecureLayout>
  );
}

// ---------------------------------------------------------
// 🧠 CONCEPT CARD COMPONENT (Handles both Normal & Quiz Mode)
// ---------------------------------------------------------
const ConceptCard = ({ data, isQuiz }: { data: any, isQuiz: boolean }) => {
  const [revealed, setRevealed] = useState(false);

  // 0-Cost Client-Side Blanking Algorithm for Quiz Mode
  // It finds the longest word or a capitalized word to act as the hidden answer.
  let displayContent = data?.content || "";
  let hiddenWord = "";
  let maskedContent = displayContent;

  if (isQuiz) {
    const words = displayContent.split(' ');
    const potentialTargets = words.filter((w: string) => w.length > 5 && /^[A-Z]/.test(w));
    hiddenWord = potentialTargets.length > 0 ? potentialTargets[0] : words[Math.floor(words.length / 2)];
    
    maskedContent = displayContent.replace(
      hiddenWord, 
      revealed ? hiddenWord : '____?____'
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden flex flex-col justify-center items-center px-6">
       {/* Background Sci-Fi Effects */}
       <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
       <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-indigo-500/20 via-slate-900 to-rose-500/20 animate-pulse pointer-events-none blur-3xl"></div>

       {/* Content Box */}
       <div className="relative z-10 w-full">
         <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6 shadow-xl">
           {isQuiz ? '🎯 Pop Quiz' : '🧠 Core Concept'} • {data?.topic}
         </span>

         <h2 className="text-2xl md:text-3xl font-black text-white leading-snug tracking-tight mb-8">
           {isQuiz ? (
             <span>
               {maskedContent.split('____?____').map((part: string, i: number, arr: any[]) => (
                 <React.Fragment key={i}>
                   {part}
                   {i < arr.length - 1 && (
                     <span className={`inline-block border-b-2 mx-1 px-2 transition-all duration-300 ${revealed ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10' : 'text-slate-500 border-slate-500 animate-pulse'}`}>
                       {revealed ? hiddenWord : '?????'}
                     </span>
                   )}
                 </React.Fragment>
               ))}
             </span>
           ) : (
             displayContent
           )}
         </h2>

         {isQuiz && !revealed && (
           <button 
             onClick={() => setRevealed(true)}
             className="w-max px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 transition-transform"
           >
             Reveal Answer
           </button>
         )}

         {isQuiz && revealed && (
           <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm animate-in fade-in slide-in-from-bottom-2">
             <CheckCircle2 size={18} /> Awesome! Swipe up for next.
           </div>
         )}
       </div>
    </div>
  );
};

// ---------------------------------------------------------
// 💎 PREMIUM PAYWALL CARD (The Hook)
// ---------------------------------------------------------
const PremiumPaywallCard = ({ currentIndex }: { currentIndex: number }) => {
  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col justify-center items-center px-6 text-center">
       <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-rose-600/10"></div>
       
       <motion.div 
         initial={{ scale: 0.8, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="relative z-10 flex flex-col items-center"
       >
         <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.5)] rotate-12">
            <Lock size={36} className="text-white" />
         </div>

         <h2 className="text-3xl font-black text-white mb-2">Deep Dive Locked</h2>
         <p className="text-slate-400 text-sm mb-8 max-w-[250px] leading-relaxed">
           You've crushed {currentIndex} concepts today! The next card contains a highly restricted examination hack.
         </p>

         <button className="w-full max-w-[250px] py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-2xl active:scale-95">
           <Sparkles size={18} /> Unlock Pro
         </button>
         
         <button className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300">
           Or invite 1 friend
         </button>
       </motion.div>
    </div>
  );
};

// ---------------------------------------------------------
// 📱 SIDEBAR BUTTON (Like, Share)
// ---------------------------------------------------------
const SidebarButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <div className="flex flex-col items-center gap-1">
    <button 
      onClick={onClick}
      className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-transform border border-white/10 shadow-lg"
    >
      {icon}
    </button>
    <span className="text-[10px] font-bold text-white shadow-black drop-shadow-md">{label}</span>
  </div>
);
