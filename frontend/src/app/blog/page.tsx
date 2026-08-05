import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { BookOpen, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { blogPosts } from './blogData';

export const metadata: Metadata = {
  title: 'Prepia AI Blog | Study Hacks & EdTech Insights',
  description: 'Read the latest study hacks, AI education trends, and tips to survive your university exams using Prepia AI.',
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 transition-all flex items-center justify-between px-6 h-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
             <img src="/icon.svg" alt="Prepia Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">Prepia</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/tools" className="text-sm font-bold text-slate-300 hover:text-emerald-500 hidden sm:flex items-center">Tools</Link>
          <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-emerald-500 flex items-center">Sign In</Link>
          <Link href="/signup" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">Try for Free</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full font-bold text-sm mb-6 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Sparkles size={16} /> The Prepia Journal
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6">
            Study Smarter, Not Harder.
          </h1>
          <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">
            Insights on AI in education, exam survival guides, and the latest productivity hacks for university students.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Link 
              key={post.slug} 
              href={`/blog/${post.slug}`}
              className="group bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 flex flex-col h-full"
            >
              <div className="h-48 w-full bg-slate-800 relative overflow-hidden">
                {/* Fallback pattern if no image */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 to-transparent mix-blend-overlay group-hover:opacity-40 transition-opacity"></div>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-4">
                  <span className="flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full"><BookOpen size={12} /> {post.category}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {post.date}</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 leading-tight group-hover:text-emerald-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-slate-400 font-medium line-clamp-3 mb-6 flex-grow">
                  {post.excerpt}
                </p>
                <div className="text-emerald-500 font-bold flex items-center gap-2 group-hover:gap-3 transition-all mt-auto">
                  Read Article <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
