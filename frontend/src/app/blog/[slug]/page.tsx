import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';
import { blogPosts } from '../blogData';
import Markdown from 'react-markdown';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find(p => p.slug === slug);
  
  if (!post) {
    return {
      title: 'Blog Post Not Found | Prepia AI',
    };
  }

  return {
    title: `${post.title} | Prepia AI Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [`https://www.prepia.app/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('Prepia AI Blog')}`],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 pb-24">
      <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 transition-all flex items-center justify-between px-6 h-20 sticky top-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden rounded-xl shadow-md">
             <img src="/icon.svg" alt="Prepia Logo" className="w-full h-full object-cover scale-125" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white hidden sm:block">Prepia</span>
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/blog" className="text-sm font-bold text-slate-300 hover:text-emerald-500 flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Blog
          </Link>
          <Link href="/signup" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">Try Prepia Free</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-12 border-b border-slate-800 pb-12 text-center md:text-left">
          <div className="inline-block px-4 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold text-sm mb-6">
            {post.category}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
            {post.title}
          </h1>
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-4 text-slate-400 font-medium">
            <span className="flex items-center gap-2"><User size={16} /> {post.author}</span>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-2"><Calendar size={16} /> {post.date}</span>
          </div>
        </header>

        <article className="prose prose-invert prose-emerald max-w-none prose-headings:font-black prose-h1:text-4xl prose-p:text-lg prose-p:leading-relaxed prose-p:text-slate-300 prose-a:text-emerald-400">
          <Markdown>{post.content}</Markdown>
        </article>

        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-6 py-3 rounded-full font-bold transition-all border border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400">
              <Share2 size={18} /> Share Article
            </button>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-8 rounded-3xl w-full md:w-auto flex-grow max-w-md shadow-2xl shadow-emerald-900/20 text-center md:text-left">
            <h3 className="text-2xl font-black text-white mb-2">Ready to study smarter?</h3>
            <p className="text-emerald-100 mb-6 font-medium">Join thousands of students getting 4.0 GPAs with AI.</p>
            <Link href="/signup" className="inline-block bg-white text-emerald-900 px-8 py-3 rounded-xl font-black hover:bg-slate-100 transition-all shadow-lg hover:scale-105">
              Create Free Account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
