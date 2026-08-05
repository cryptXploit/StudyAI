import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowRight, FileText, Lock } from 'lucide-react';

type Props = {
  params: Promise<{ id: string }>;
};

// SSR Metadata for Social Sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  const { data: document } = await supabase
    .from('user_notes')
    .select('title')
    .eq('id', resolvedParams.id)
    .single();

  if (!document) {
    return {
      title: 'Study Material | Prepia AI',
      description: 'Access shared study materials, flashcards, and notes on Prepia AI.',
    };
  }

  const title = document.title || 'Shared Study Material';
  const description = `Access these study notes and flashcards on Prepia AI, the #1 AI Study Operating System.`;

  return {
    title: `${title} - Prepia AI`,
    description,
    openGraph: {
      title: `${title} - Prepia AI`,
      description,
      images: [`https://prepia.app/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent('Shared Study Material')}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Prepia AI`,
      description,
      images: [`https://prepia.app/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent('Shared Study Material')}`],
    }
  };
}

export default async function PublicStudyPage({ params }: Props) {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // Fetch the actual study material securely
  const { data: document, error: fetchError } = await supabase
    .from('user_notes')
    .select('id, title, is_public') 
    .eq('id', resolvedParams.id)
    .single();
  
  const isPrivateAndLoggedOut = document && !document.is_public && !session;
  const hasError = fetchError || isPrivateAndLoggedOut || !document;

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 p-6">
        <Lock size={48} className="text-slate-600 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Private or Missing Material</h1>
        <p className="text-slate-400 mb-6 text-center max-w-md">
          This study material is either private, deleted, or you do not have permission to view it.
        </p>
        <Link href="/" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 flex items-center justify-between px-6 h-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
             <img src="/icon.svg" alt="Prepia Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-black tracking-tight text-white hidden sm:block">Prepia AI</span>
        </Link>
        <div className="flex gap-4 items-center">
          {!session ? (
            <>
              <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-emerald-500">Sign In</Link>
              <Link href="/signup" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">Try for Free</Link>
            </>
          ) : (
            <Link href="/dashboard" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">Go to Dashboard</Link>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-xl shadow-emerald-900/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-500/20">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">{document.title || 'Untitled Note'}</h1>
              <p className="text-slate-400 mt-1">Shared Study Material</p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none mt-8 p-6 bg-slate-950 rounded-2xl border border-slate-800/50">
            <p className="text-slate-300 font-medium leading-relaxed">
              This document was processed using Prepia AI's advanced RAG architecture. 
              To view flashcards, interact with the 3D knowledge universe, or chat with this document, you need to save it to your dashboard.
            </p>
          </div>

          {!session && (
            <div className="mt-12 bg-gradient-to-r from-emerald-600/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center flex flex-col items-center">
              <h3 className="text-2xl font-black text-white mb-2">Want to interact with this material?</h3>
              <p className="text-slate-400 mb-6 max-w-lg">
                Create a free account on Prepia AI to chat with this document, generate quizzes, and create flashcards instantly.
              </p>
              <Link href="/signup" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95">
                Save to My Dashboard <ArrowRight size={20} />
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}