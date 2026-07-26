'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Zap, X, ArrowRight, BatteryWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OutOfTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTokens?: number;
}

export default function OutOfTokensModal({ isOpen, onClose, requiredTokens }: OutOfTokensModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden"
        >
          {/* Aesthetic Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <BatteryWarning size={32} />
          </div>

          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Out of Brain Juice!</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
            You've used up your available tokens for today. {requiredTokens ? `This action requires ${requiredTokens} tokens.` : ''} Wait for tomorrow's daily refill or upgrade to PRO for unlimited access!
          </p>

          <div className="space-y-3">
            <button 
              onClick={() => { onClose(); router.push('/pricing'); }}
              className="w-full py-4 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Zap size={18} fill="currentColor" /> Upgrade to PRO
            </button>
            <button 
              onClick={() => { onClose(); router.push('/dashboard/rewards'); }}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Earn Free Tokens <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
