'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, ArrowRight, Zap, BookOpen, Calculator, BrainCircuit, Network, Layers, BarChart3, Headphones, Beaker, CalendarDays, Projector, Cpu, Smartphone, Orbit, Hourglass, Eye, FileSignature, CalendarCheck, Swords, Map, Briefcase, FileText, Medal, X, Mic, MessageSquare, Radar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock list of all features for the Omnibar to search through
const allFeatures = [
  { name: 'AI Notes Workspace', path: '/notes', icon: <FileText size={18} />, category: 'Tools' },
  { name: 'Dashboard', path: '/dashboard', icon: <Search size={18} />, category: 'Core' },
  { name: 'AI Tutor Chat', path: '/chat', icon: <MessageSquare size={18} />, category: 'Core' },
  { name: 'Exam Oracle', path: '/dashboard/oracle', icon: <Radar size={18} />, category: 'Core' },
  { name: 'StoryMode', path: '/story', icon: <BookOpen size={18} />, category: 'Learning' },
  { name: 'Pro Solver', path: '/solver', icon: <Calculator size={18} />, category: 'Tools' },
  { name: 'Quiz Mode', path: '/quiz', icon: <BrainCircuit size={18} />, category: 'Gamified' },
  { name: 'Night Before Exam', path: '/night-before', icon: <Zap size={18} />, category: 'Core' },
  { name: 'Exam Oracle', path: '/dashboard/oracle', icon: <Search size={18} />, category: 'Tools' },

  { name: 'Mind Maps', path: '/mind-map', icon: <Network size={18} />, category: 'Learning' },
  { name: 'Flashcards', path: '/flashcards', icon: <Layers size={18} />, category: 'Learning' },
  { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={18} />, category: 'Core' },
  { name: 'Audio Summary', path: '/podcast', icon: <Headphones size={18}/>, category: 'Learning' },
  { name: '3D Chemistry Lab', path: '/molecule', icon: <Beaker size={18}/>, category: 'Tools' },
  { name: 'Magic Study Planner', path: '/planner', icon: <CalendarDays size={18}/>, category: 'Tools' }, 
  { name: 'AI Presentation Creator', path: '/presentation', icon: <Projector size={18}/>, category: 'Tools' },
  { name: 'Flowchart Generator', path: '/flowchart', icon: <Network size={18}/>, category: 'Learning' },
  { name: 'Logic Workspace', path: '/logicflow', icon: <Cpu size={18}/>, category: 'Tools' },
  { name: 'AI Wallpaper Generator', path: '/wallpaper', icon: <Smartphone size={18}/>, category: 'Fun' },
  { name: 'Knowledge Universe', path: '/universe', icon: <Orbit size={18}/>, category: 'Learning' },
  { name: 'Timeline Mapper', path: '/timeline', icon: <Hourglass size={18}/>, category: 'Learning' },
  { name: 'Bionic Reader', path: '/bionic-reader', icon: <Eye size={18} />, category: 'Accessibility' },
  { name: 'Notes Purifier', path: '/notes-purifier', icon: <FileSignature size={18} />, category: 'Tools' },
  { name: 'Calendar Sync', path: '/calendar-sync', icon: <CalendarCheck size={18} />, category: 'Tools' },
  { name: 'Concept Battle', path: '/concept-battle', icon: <Swords size={18}/>, category: 'Gamified' },
  { name: 'Career Pathway', path: '/career-hacker', icon: <Briefcase size={18}/>, category: 'Tools' },
  { name: 'Book Jumper', path: '/book-jumper', icon: <FileText size={18}/>, category: 'Learning' },
  // { name: 'Live Podcast', path: '/live', icon: <Mic size={18}/>, category: 'Fun' },
];

export default function Omnibar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filteredFeatures = query 
    ? allFeatures.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.category.toLowerCase().includes(query.toLowerCase()))
    : allFeatures.slice(0, 5); // Show top 5 default

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredFeatures.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && filteredFeatures.length > 0) {
      e.preventDefault();
      handleNavigate(filteredFeatures[selectedIndex].path);
    }
  };

  return (
    <>
      {/* Omnibar Trigger Button (Mobile + Desktop fallback) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-400 px-4 py-2 rounded-xl transition-colors border border-slate-800 w-64 shadow-inner"
      >
        <Search size={16} />
        <span className="text-sm font-medium flex-1 text-left">Search Prepia...</span>
        <div className="flex items-center gap-1 text-[10px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded shadow-sm">
          <Command size={10} /> K
        </div>
      </button>

      {/* The Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl bg-slate-950/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-800/50 overflow-hidden"
            >
              <div className="flex items-center px-6 py-4 border-b border-slate-800/50">
                <Search className="text-emerald-500 mr-4" size={24} />
                <input 
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="What do you want to learn today?"
                  className="flex-1 bg-transparent text-xl font-black text-white placeholder:text-slate-500 outline-none"
                />
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-900/50 rounded-xl transition-colors text-slate-500">
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                {filteredFeatures.length > 0 ? (
                  <div className="space-y-2">
                    <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      {query ? 'Search Results' : 'Suggested Tools'}
                    </p>
                    {filteredFeatures.map((feature, idx) => (
                      <div 
                        key={feature.path}
                        onClick={() => handleNavigate(feature.path)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between px-4 py-4 rounded-2xl cursor-pointer transition-all ${selectedIndex === idx ? 'bg-emerald-600 shadow-lg shadow-emerald-500/20 translate-x-2' : 'hover:bg-slate-900'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-900 text-emerald-500 shadow-inner'}`}>
                            {feature.icon}
                          </div>
                          <div>
                            <h4 className={`font-black text-sm ${selectedIndex === idx ? 'text-white' : 'text-slate-200'}`}>{feature.name}</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedIndex === idx ? 'text-emerald-200' : 'text-slate-500'}`}>{feature.category}</span>
                          </div>
                        </div>
                        {selectedIndex === idx && <ArrowRight className="text-white animate-pulse" size={18} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4"><Search className="text-slate-500" size={24}/></div>
                    <p className="text-slate-400 font-bold">No modules found for "{query}"</p>
                    <p className="text-sm text-slate-500 font-medium mt-1">Try searching for "Quiz", "Chemistry", or "Notes"</p>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-3 bg-slate-900/80 border-t border-slate-800/50 flex items-center justify-between text-xs font-bold text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">Use <kbd className="bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-700 mx-1">↑</kbd><kbd className="bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-700">↓</kbd> to navigate</span>
                  <span className="flex items-center gap-1"><kbd className="bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-700">Enter</kbd> to select</span>
                </div>
                <span>Prepia Engine v4.0</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
