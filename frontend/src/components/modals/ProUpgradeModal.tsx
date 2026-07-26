'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Rocket, Star, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProUpgradeModal({ isOpen, onClose }: ProUpgradeModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire dopamine-inducing confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-[0_0_100px_rgba(245,158,11,0.4)] text-center"
          >
            {/* Background Glows */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent animate-spin-slow pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <motion.div 
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.6)] border-4 border-white/20"
              >
                <Crown size={48} className="text-white drop-shadow-md" />
              </motion.div>
              
              <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-4 tracking-tight">
                PRO UNLOCKED!
              </h2>
              
              <p className="text-slate-300 font-medium mb-8 leading-relaxed max-w-sm mx-auto text-sm md:text-base">
                Welcome to the elite club. You now have the ultimate unfair advantage for your exams. The universe of knowledge is yours.
              </p>

              <div className="space-y-3 mb-8 w-full max-w-xs text-left">
                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 p-3 rounded-xl">
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                  <span className="text-slate-200 text-sm font-bold">10,000 Premium Tokens</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 p-3 rounded-xl">
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                  <span className="text-slate-200 text-sm font-bold">Unlimited Pro Models</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 p-3 rounded-xl">
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                  <span className="text-slate-200 text-sm font-bold">All Gamification Unlocked</span>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full max-w-xs py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_10px_30px_rgba(245,158,11,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Rocket size={18} /> Enter the Matrix
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
