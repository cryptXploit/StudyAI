'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, GraduationCap, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DreamVarsityWidget() {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [varsityData, setVarsityData] = useState<any>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch dream varsity settings
      const { data: varsity, error } = await supabase
        .from('user_dream_varsity')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (varsity && !error) {
        setVarsityData(varsity);
        
        // If auto mode, we need the streak count
        if (varsity.tracking_mode === 'auto') {
           const { data: profile } = await supabase
             .from('profiles')
             .select('streak_count')
             .eq('id', user.id)
             .single();
           if (profile) {
             setStreakCount(profile.streak_count || 0);
           }
        }
      }
    } catch (e) {
      console.error("Error fetching dream varsity data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveManualProgress = async (newProgress: number, fallingBehind: boolean) => {
    if (!user || !varsityData) return;
    try {
      const updated = {
        ...varsityData,
        progress: newProgress,
        last_active: new Date().toISOString(),
        is_falling_behind: fallingBehind,
        updated_at: new Date().toISOString()
      };
      setVarsityData(updated);
      
      await supabase
        .from('user_dream_varsity')
        .upsert({
          user_id: user.id,
          ...updated
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.error("Error saving dream varsity data:", e);
    }
  };

  const handleCompleteChapter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newProgress = Math.min((varsityData.progress || 0) + 5, 100);
    await saveManualProgress(newProgress, false);
  };

  const simulateInactivity = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newProgress = Math.max((varsityData.progress || 0) - 8, 0);
    await saveManualProgress(newProgress, true);
  };

  if (isLoading) return null;

  if (!varsityData || !varsityData.varsity_name) {
    return (
      <div className="flex justify-end mb-4">
        <Link href="/quests">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md transition-all text-xs font-bold uppercase tracking-widest shadow-sm"
          >
            <Target size={14} /> Set Dream Varsity
          </motion.button>
        </Link>
      </div>
    );
  }

  const isAuto = varsityData.tracking_mode === 'auto';
  // Calculate display progress based on mode
  const displayProgress = isAuto ? Math.min(streakCount * 5, 100) : (varsityData.progress || 0);
  
  // Calculate falling behind status
  let isFallingBehind = false;
  if (isAuto) {
     isFallingBehind = streakCount === 0;
  } else {
     const lastActive = varsityData.last_active ? new Date(varsityData.last_active) : new Date();
     const daysDiff = (new Date().getTime() - lastActive.getTime()) / (1000 * 3600 * 24);
     isFallingBehind = varsityData.is_falling_behind || daysDiff > 2;
  }

  const handleWidgetClick = () => {
    if (isAuto) {
      router.push('/quests');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleWidgetClick}
      className={`mb-6 flex flex-col md:flex-row items-center justify-between gap-4 p-3 md:px-5 md:py-3 rounded-2xl border shadow-sm transition-colors relative group ${
        isFallingBehind 
          ? 'bg-rose-50 border-rose-200' 
          : 'bg-gradient-to-r from-slate-650 to-indigo-950 border-slate-200'
      } ${isAuto ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      {/* Hidden Settings Link for Manual Mode */}
      {!isAuto && (
        <Link href="/quests" className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Settings size={14} />
        </Link>
      )}

      {/* Left: Info & Progress */}
      <div className="flex items-center gap-4 w-full md:w-auto flex-1">
        <div className={`p-2 rounded-xl flex items-center justify-center ${isFallingBehind ? 'bg-rose-100 text-rose-600' : 'bg-white/10 text-emerald-400 backdrop-blur-md'}`}>
          <GraduationCap size={20} />
        </div>
        
        <div className="flex-1 min-w-[120px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isFallingBehind ? 'text-rose-700' : 'text-white'}`}>
              {varsityData.varsity_name} Aspirant {isAuto && <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[9px]">AUTO</span>}
            </span>
            <span className={`text-xs font-bold ${isFallingBehind ? 'text-rose-600' : 'text-emerald-400'}`}>
              {displayProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${displayProgress}%` }}
              className={`h-full ${isFallingBehind ? 'bg-rose-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>
      </div>

      {/* Middle: Warning (if any) */}
      {isFallingBehind && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-100/50 rounded-lg text-rose-700 text-[10px] font-bold md:max-w-[250px] leading-tight flex-shrink-0 border border-rose-200/50">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Warning: Falling behind 4,500 other {varsityData.varsity_name} Aspirants.</span>
        </div>
      )}

      {/* Right: Actions (Only for Manual Mode) */}
      {!isAuto && (
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <button 
            onClick={handleCompleteChapter}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 ${
              isFallingBehind ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/30 shadow-md' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 shadow-md'
            }`}
          >
            <TrendingUp size={14} /> +XP
          </button>
          <button 
            onClick={simulateInactivity}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 border ${
              isFallingBehind ? 'bg-white/50 border-rose-200 text-rose-700 hover:bg-rose-100' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Simulate Inactivity"
          >
            <TrendingDown size={14} /> Skip
          </button>
        </div>
      )}
    </motion.div>
  );
}
