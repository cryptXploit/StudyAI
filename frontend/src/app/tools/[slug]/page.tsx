import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowRight, Zap, Target, MessageSquare, Layers, Swords, BookOpen, Clock, Activity, Video, Map, Globe, Image as ImageIcon, Briefcase, FileSignature, Presentation, GitBranch, ShieldAlert, Cpu, Sparkles, BrainCircuit, CheckCircleIcon } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
};

const toolData: Record<string, { title: string; description: string; internalRoute: string; icon: any }> = {
  'pdf-to-podcast': {
    title: 'PDF to Podcast AI Generator | Prepia',
    description: 'Instantly convert your study PDFs, lecture notes, and textbooks into engaging two-person AI podcasts. Listen and learn on the go.',
    internalRoute: '/podcast',
    icon: MessageSquare
  },
  '3d-molecule-renderer': {
    title: '3D Organic Molecule Visualizer | Prepia',
    description: 'Visualize complex chemical structures and organic molecules dynamically in 3D right in your browser. Perfect for chemistry students.',
    internalRoute: '/molecule',
    icon: Target
  },
  'night-before-exam-generator': {
    title: 'Night Before Exam Cheat Sheet Generator | Prepia',
    description: 'Condense 500 pages of syllabus into a 5-minute ultra-condensed cheat sheet. Survive your exams with our Panic Mode AI.',
    internalRoute: '/night-before',
    icon: Zap
  },
  'ai-flashcards-maker': {
    title: 'AI Flashcards Maker from PDF | Prepia',
    description: 'Automatically generate highly accurate, spaced-repetition flashcards directly from your syllabus or textbook using RAG AI.',
    internalRoute: '/flashcards',
    icon: Layers
  },
  'panic-mode': {
    title: 'Panic Mode Exam Survival Kit | Prepia',
    description: 'Unlock the ultimate emergency study kit. Get ultra-condensed notes and critical predictions exactly when you need them most.',
    internalRoute: '/time-bomb',
    icon: ShieldAlert
  },
  'exam-oracle-predictor': {
    title: 'Exam Oracle Predictor | Prepia',
    description: 'Predict the most likely questions for your upcoming exams based on your professor\'s past question patterns and syllabus structure.',
    internalRoute: '/oracle',
    icon: Sparkles
  },
  'ai-workspace': {
    title: 'AI Study Workspace | Prepia',
    description: 'A unified digital workspace to chat with your textbooks, write assignments, and organize your academic life efficiently.',
    internalRoute: '/dashboard',
    icon: Cpu
  },
  'neural-feed': {
    title: 'TikTok-style Neural Feed | Prepia',
    description: 'Swipe through infinitely scrolling, bite-sized educational concepts extracted directly from your syllabus. Dopamine-driven learning.',
    internalRoute: '/story',
    icon: Activity
  },
  'quiz-generator': {
    title: 'AI Quiz & Mock Exam Generator | Prepia',
    description: 'Test your knowledge with instantly generated quizzes and mock exams tailored to your uploaded study materials.',
    internalRoute: '/quiz',
    icon: CheckCircleIcon
  },
  'notes-purifier': {
    title: 'Handwritten Notes Purifier | Prepia',
    description: 'Clean up and digitize your messy handwritten notes using our advanced OCR and AI formatting pipeline.',
    internalRoute: '/notes-purifier',
    icon: FileSignature
  },
  'ai-teacher-chat': {
    title: 'AI Teacher Chat | Prepia',
    description: 'Chat with an empathetic, knowledgeable AI teacher that guides you through complex topics step-by-step using the Socratic method.',
    internalRoute: '/chat',
    icon: MessageSquare
  },
  'pro-academic-solver': {
    title: 'Pro Academic Math & Science Solver | Prepia',
    description: 'Solve advanced calculus, physics, and chemistry problems with detailed step-by-step reasoning and LaTeX rendering.',
    internalRoute: '/solver',
    icon: Target
  },
  'mind-map-generator': {
    title: 'AI Mind Map Generator | Prepia',
    description: 'Visually organize your thoughts and syllabus concepts into beautiful, interactive mind maps instantly.',
    internalRoute: '/mind-map',
    icon: BrainCircuit
  },
  'concept-battle': {
    title: 'Multiplayer Concept Battle Arena | Prepia',
    description: 'Challenge your friends in real-time academic battles. Answer syllabus-based questions faster than your opponent to win.',
    internalRoute: '/concept-battle',
    icon: Swords
  },
  'bionic-reader': {
    title: 'Bionic Speed Reader | Prepia',
    description: 'Read texts 2x faster! Our Bionic Reader bolds the first few letters of words to guide your eyes, perfect for neurodivergent students.',
    internalRoute: '/bionic-reader',
    icon: BookOpen
  },
  'focus-island': {
    title: 'Focus Island Pomodoro Timer | Prepia',
    description: 'A gamified Pomodoro timer. Maintain your focus to grow your digital island; lose focus, and your island withers away.',
    internalRoute: '/focus-island',
    icon: Globe
  },
  'career-hacker': {
    title: 'Career Hacker & Roadmap Generator | Prepia',
    description: 'Get an AI-generated, step-by-step roadmap tailored to your skills to land your dream job in tech, finance, or beyond.',
    internalRoute: '/career-hacker',
    icon: Briefcase
  },
  'youtube-decoder': {
    title: 'YouTube Lecture Decoder | Prepia',
    description: 'Summarize hours of YouTube educational videos into concise notes and actionable insights instantly.',
    internalRoute: '/youtube-decoder',
    icon: Video
  },
  'lab-auto-grapher': {
    title: 'Lab Auto-Grapher | Prepia',
    description: 'Automatically generate precise graphs and charts for your physics and chemistry lab reports with minimal input.',
    internalRoute: '/lab-graph',
    icon: GitBranch
  },
  'timeline-mapper': {
    title: 'Historical Timeline Mapper | Prepia',
    description: 'Visualize historical events and timelines interactively. A must-have tool for history and political science students.',
    internalRoute: '/timeline',
    icon: Clock
  },
  'knowledge-universe': {
    title: '3D Knowledge Universe | Prepia',
    description: 'Explore the interconnectedness of your study topics in a stunning 3D galaxy visualization of your semantic networks.',
    internalRoute: '/universe',
    icon: Globe
  },
  'wallpaper-generator': {
    title: 'Study Motivation Wallpaper Generator | Prepia',
    description: 'Generate beautiful, customized wallpapers with motivational quotes and your study goals to keep you focused.',
    internalRoute: '/wallpaper',
    icon: ImageIcon
  },
  'logic-workspace': {
    title: 'Logic Flow Workspace | Prepia',
    description: 'Design logic flowcharts and algorithms easily. An essential tool for computer science and engineering students.',
    internalRoute: '/logicflow',
    icon: GitBranch
  },
  'presentation-generator': {
    title: 'AI Presentation Generator | Prepia',
    description: 'Turn your essays and reports into beautiful, structured slide decks instantly with AI.',
    internalRoute: '/presentation',
    icon: Presentation
  },
  'syllabus-extractor': {
    title: 'Syllabus Extractor & Tracker | Prepia',
    description: 'Extract learning objectives from your messy course outlines and track your progress throughout the semester.',
    internalRoute: '/syllabus-tracker',
    icon: FileSignature
  },
  'calendar-sync': {
    title: 'Smart Calendar Sync | Prepia',
    description: 'Automatically sync your AI-generated study routines and exam dates directly with Google Calendar.',
    internalRoute: '/calendar-sync',
    icon: Clock
  },
  'geo-mapper': {
    title: 'Geo Mapper | Prepia',
    description: 'Generate and explore interactive geographical maps based on your syllabus data.',
    internalRoute: '/geo-mapper',
    icon: Map
  }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = toolData[slug];
  
  if (!data) {
    return {
      title: 'AI Study Tools | Prepia',
      description: 'Explore the ultimate collection of AI academic micro-apps for students.'
    };
  }

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      // Dynamic OG API call using the tool slug
      images: [`https://prepia.app/api/og?title=${encodeURIComponent(data.title)}&subtitle=${encodeURIComponent('Prepia AI Study Tools')}`],
    }
  };
}

export default async function ToolSEOPage({ params }: Props) {
  const { slug } = await params;
  const data = toolData[slug];
  
  if (!data) {
    redirect('/');
  }

  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // If user is already authenticated, seamlessly redirect them to the actual app tool
  if (session) {
    redirect(data.internalRoute);
  }

  const Icon = data.icon;

  // SEO Marketing Page for Unauthenticated Users / Crawlers
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 transition-all flex items-center justify-between px-6 h-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden rounded-xl shadow-md">
             <img src="/icon.svg" alt="Prepia Logo" className="w-full h-full object-cover scale-125" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">Prepia</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-emerald-500 flex items-center">Sign In</Link>
          <Link href="/signup" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">Try for Free</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center mt-12">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
          <Icon size={40} />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
          {data.title.split('|')[0].trim()}
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mb-12 leading-relaxed">
          {data.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/signup" className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-black text-xl tracking-wide shadow-[0_10px_40px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-3">
            Start Using This Tool Now <ArrowRight size={24} />
          </Link>
        </div>

        <div className="mt-24 w-full max-w-4xl p-8 bg-slate-900 border border-slate-800 rounded-3xl text-left">
          <h2 className="text-2xl font-black text-white mb-4">Why use Prepia's {data.title.split('|')[0].trim()}?</h2>
          <ul className="space-y-4 text-slate-300 font-medium">
            <li className="flex gap-3"><Zap className="text-emerald-500 shrink-0" /> 100% RAG-powered accuracy based only on your uploaded syllabus.</li>
            <li className="flex gap-3"><Zap className="text-emerald-500 shrink-0" /> Generates output instantly without requiring complex prompt engineering.</li>
            <li className="flex gap-3"><Zap className="text-emerald-500 shrink-0" /> Fully integrated into your unified academic dashboard.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}