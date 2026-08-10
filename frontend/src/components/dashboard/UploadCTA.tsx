'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MonitorPlay, ListTree, PlusCircle } from 'lucide-react';

interface UploadCTAProps {
  type: 'source' | 'syllabus';
  title: string;
  description: string;
}

export default function UploadCTA({ type, title, description }: UploadCTAProps) {
  const router = useRouter();
  
  return (
    <div className={`text-center mt-4 p-5 border-2 border-dashed rounded-2xl relative overflow-hidden group transition-all
      ${type === 'source' ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-amber-500/30 bg-amber-500/5'}
    `}>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
        ${type === 'source' ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10' : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10'}
      `}></div>
      <div className="relative z-10 flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 shadow-inner
          ${type === 'source' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}
        `}>
          {type === 'source' ? <MonitorPlay size={20}/> : <ListTree size={20}/>}
        </div>
        <p className="text-sm font-bold text-slate-300 mb-1">{title}</p>
        <p className="text-[11px] text-slate-500 mb-4 px-2 font-medium leading-relaxed">{description}</p>
        <button 
          onClick={() => router.push(`/dashboard?tab=upload&type=${type}`)}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-1.5 text-white
            ${type === 'source' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'}
          `}
        >
          <PlusCircle size={14}/> {type === 'source' ? 'Upload Source' : 'Forge Syllabus'}
        </button>
      </div>
    </div>
  );
}
