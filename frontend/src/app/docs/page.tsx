'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Zap, Target, ArrowRight, XCircle, Search, ArrowLeft, Terminal, Layout, FileText, ChevronRight, Rocket, ShieldCheck, Database, Server, Code, Copy, Check, Menu, X, Globe, Cpu, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- DATA STRUCTURE FOR RICH CONTENT ---
type ContentBlock = 
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'alert'; variant: 'info' | 'warning' | 'success' | 'danger'; title: string; text: string }
  | { type: 'list'; items: string[] };

type DocItem = {
  name: string;
  description: string;
  content: ContentBlock[];
};

type DocSection = {
  title: string;
  icon: React.ReactNode;
  items: DocItem[];
};

const DOCS_DATA: DocSection[] = [
  {
    title: 'Getting Started',
    icon: <Rocket size={18} />,
    items: [
      {
        name: 'Introduction',
        description: 'Welcome to the Prepia Documentation.',
        content: [
          { type: 'h1', text: 'Welcome to Prepia Engine' },
          { type: 'p', text: 'Prepia is a next-generation academic copilot. Unlike traditional search engines or general-purpose LLMs (like standard ChatGPT), Prepia strictly grounds its answers in your specific course materials using an advanced Retrieval-Augmented Generation (RAG) architecture.' },
          { type: 'alert', variant: 'info', title: 'Why Prepia?', text: 'By processing your actual syllabus, textbooks, and notes, Prepia completely eliminates hallucinations. If it\'s not in your uploaded context, Prepia won\'t make it up.' },
          { type: 'h2', text: 'The Core Philosophy' },
          { type: 'list', items: [
            'Hyper-Specific Context: Every answer is tied to your exact academic requirements.',
            'Zero Prompt Engineering: We built 28 specialized micro-apps so you just click buttons instead of writing paragraphs of instructions.',
            'Dopamine-Driven Design: Studying shouldn\'t be boring. We use gamification, neural feeds, and 3D visualization to keep you engaged.'
          ]}
        ]
      },
      {
        name: 'Quickstart Guide',
        description: 'Get up and running in under 5 minutes.',
        content: [
          { type: 'h1', text: 'Quickstart Guide' },
          { type: 'p', text: 'Follow these steps to experience the power of Prepia immediately.' },
          { type: 'h3', text: '1. Create an Account' },
          { type: 'p', text: 'Sign up to receive your initial 500 free tokens. These are enough to run several heavy AI tasks and experience the ecosystem.' },
          { type: 'h3', text: '2. Upload your Context Pack' },
          { type: 'p', text: 'Go to your Dashboard and drop a PDF syllabus, a textbook chapter, or even an image of your handwritten notes. Our backend will automatically OCR, chunk, and embed the data into our Pinecone Vector Database.' },
          { type: 'h3', text: '3. Run a Micro-App' },
          { type: 'p', text: 'Instead of chatting, try a specific tool. Click "Night Before Exam" and select the file you just uploaded. Within seconds, you\'ll receive a condensed, highly-probable cheat sheet.' }
        ]
      }
    ]
  },
  {
    title: 'Core Architecture',
    icon: <Database size={18} />,
    items: [
      {
        name: 'RAG Pipeline & Embeddings',
        description: 'How we process and retrieve your data.',
        content: [
          { type: 'h1', text: 'The RAG Pipeline' },
          { type: 'p', text: 'Retrieval-Augmented Generation (RAG) is the backbone of Prepia. Here is exactly what happens when you upload a document.' },
          { type: 'h3', text: '1. Ingestion & OCR' },
          { type: 'p', text: 'Files are processed. If they are images or scanned PDFs, our Vision models extract the text.' },
          { type: 'h3', text: '2. Chunking & Embedding' },
          { type: 'p', text: 'The text is split into semantic chunks (usually 512-1024 tokens) and converted into dense vector embeddings using OpenAI\'s `text-embedding-3-small` model.' },
          { type: 'code', language: 'typescript', code: `// Simplified embedding logic\nconst embeddingResponse = await openai.embeddings.create({\n  model: "text-embedding-3-small",\n  input: textChunk,\n});\nconst vector = embeddingResponse.data[0].embedding;` },
          { type: 'h3', text: '3. Vector Storage' },
          { type: 'p', text: 'The vectors are stored in Pinecone, partitioned by your `user_id` to ensure absolute tenant isolation.' },
          { type: 'alert', variant: 'success', title: 'Blazing Fast', text: 'Our vector searches typically resolve in under 40ms, ensuring your AI chats feel completely real-time.' }
        ]
      },
      {
        name: 'Security & Privacy',
        description: 'How we protect your academic data.',
        content: [
          { type: 'h1', text: 'Security Architecture' },
          { type: 'p', text: 'We take data privacy extremely seriously. Your study materials might contain personal notes or proprietary university documents.' },
          { type: 'h2', text: 'Row Level Security (RLS)' },
          { type: 'p', text: 'We use Supabase PostgreSQL with strict RLS policies. No user can read another user\'s data at the database level.' },
          { type: 'code', language: 'sql', code: `-- Example RLS Policy\nCREATE POLICY "Users can only view their own files" \nON storage.objects FOR SELECT \nUSING ( auth.uid() = owner );` },
          { type: 'alert', variant: 'warning', title: 'Data Retention', text: 'Free tier users have their uploaded files purged after 7 days to save storage costs. Pro users enjoy unlimited, permanent storage.' }
        ]
      }
    ]
  },
  {
    title: 'Micro-Apps Reference',
    icon: <Layout size={18} />,
    items: [
      {
        name: 'Night Before Exam',
        description: 'The ultimate panic button.',
        content: [
          { type: 'h1', text: 'Night Before Exam' },
          { type: 'p', text: 'This is our most compute-heavy, sophisticated tool. It is designed for the scenario where you have 12 hours until an exam and 500 pages left to read.' },
          { type: 'h2', text: 'How it works' },
          { type: 'list', items: [
            'It scans the entire syllabus to identify the core learning objectives.',
            'It cross-references the syllabus with the textbook to find the highest-density information.',
            'It generates a highly condensed, bulleted cheat sheet focusing ONLY on what is mathematically most likely to be tested.'
          ]},
          { type: 'alert', variant: 'danger', title: 'High Token Cost', text: 'Because this tool reads vast amounts of data simultaneously using large context windows, it costs 5 tokens per run.' }
        ]
      },
      {
        name: '3D Chemistry Lab',
        description: 'Visualize molecules in your browser.',
        content: [
          { type: 'h1', text: '3D Chemistry Lab' },
          { type: 'p', text: 'Organic chemistry is hard because it requires spatial reasoning. Prepia solves this by rendering molecules in interactive 3D.' },
          { type: 'p', text: 'Simply type a chemical name or a SMILES string (e.g., `CC(=O)OC1=CC=CC=C1C(=O)O` for Aspirin).' },
          { type: 'code', language: 'javascript', code: `// Internal rendering engine uses Three.js\nconst renderMolecule = (smiles) => {\n  const structure = await fetchCheminformaticsData(smiles);\n  initializeThreeJSCanvas(structure);\n};` }
        ]
      }
    ]
  },
  {
    title: 'Platform & Billing',
    icon: <Globe size={18} />,
    items: [
      {
        name: 'Token Economics',
        description: 'Understanding how costs are calculated.',
        content: [
          { type: 'h1', text: 'Token Economics' },
          { type: 'p', text: 'Prepia operates on a token system because AI compute is expensive. Rather than limiting your usage arbitrarily, you pay exactly for what you use.' },
          { type: 'h2', text: 'Cost Breakdown' },
          { type: 'list', items: [
            'Standard Chat Query: 2 Tokens',
            'Flashcard Generation: 5 Tokens',
            'Podcast Generation: 15 Tokens',
            'Career Hacker Roadmap: 20 Tokens'
          ]},
          { type: 'alert', variant: 'info', title: 'Earning Free Tokens', text: 'You can earn tokens by completing daily quests, maintaining a login streak, or inviting friends. 1 Friend = 50 Tokens!' }
        ]
      }
    ]
  }
];

// --- COMPONENTS ---

function CodeBlock({ language, code }: { language: string, code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-6 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{language}</span>
        <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors">
          {copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-emerald-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function AlertBlock({ variant, title, text }: { variant: 'info' | 'warning' | 'success' | 'danger', title: string, text: string }) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    danger: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  };
  const Icon = variant === 'info' ? Search : variant === 'warning' ? Zap : variant === 'success' ? CheckCircle2 : XCircle;

  return (
    <div className={`my-6 p-5 rounded-2xl border flex gap-4 items-start ${styles[variant]}`}>
      <Icon className="shrink-0 mt-0.5" size={20} />
      <div>
        <h4 className="font-bold mb-1 text-white">{title}</h4>
        <p className="text-sm opacity-90 leading-relaxed m-0">{text}</p>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeSection = DOCS_DATA[activeSectionIdx];
  const activeItem = activeSection.items[activeItemIdx];

  // Flatten for search
  const flatItems = DOCS_DATA.flatMap((sec, sIdx) => 
    sec.items.map((item, iIdx) => ({ ...item, sIdx, iIdx, secTitle: sec.title }))
  );
  
  const searchResults = searchQuery 
    ? flatItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 flex flex-col selection:bg-emerald-500/30">
      
      {/* TOP NAVBAR */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 h-16 flex items-center px-4 md:px-8 justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-slate-400 hover:text-white">
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"><span className="text-white font-black text-sm">AI</span></div>
            <span className="text-xl font-black tracking-tight text-white hidden sm:block">Prepia <span className="text-slate-500 font-medium text-sm ml-2">Docs</span></span>
          </Link>
        </div>

        <div className="flex-1 max-w-md mx-4 lg:mx-12 relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search documentation..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
          />
          
          {/* Search Dropdown */}
          <AnimatePresence>
            {searchQuery && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full mt-2 left-0 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No results found for "{searchQuery}"</div>
                ) : (
                  <div className="p-2 flex flex-col gap-1">
                    {searchResults.map((res, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setActiveSectionIdx(res.sIdx);
                          setActiveItemIdx(res.iIdx);
                          setSearchQuery('');
                        }}
                        className="text-left px-4 py-3 hover:bg-slate-800 rounded-xl transition-colors flex flex-col"
                      >
                        <span className="text-sm font-bold text-white">{res.name}</span>
                        <span className="text-xs text-slate-500">{res.secTitle}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-bold text-slate-400 hover:text-white hidden md:block transition-colors">Dashboard</Link>
          <Link href="/pricing" className="text-sm font-bold text-slate-400 hover:text-white hidden md:block transition-colors">Pricing</Link>
          <Link href="/login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-transform active:scale-95 shadow-md">Sign In</Link>
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <div className="flex-1 max-w-[90rem] mx-auto w-full flex relative">
        
        {/* SIDEBAR (Desktop) */}
        <aside className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-72 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl md:bg-transparent overflow-y-auto z-40 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            
            {/* Mobile Search */}
            <div className="relative mb-8 sm:hidden">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search docs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none"
              />
            </div>

            {DOCS_DATA.map((section, sIdx) => (
              <div key={sIdx} className="mb-8">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3 px-2">
                  {section.icon} {section.title}
                </h4>
                <ul className="space-y-1">
                  {section.items.map((item, iIdx) => {
                    const isActive = activeSectionIdx === sIdx && activeItemIdx === iIdx;
                    return (
                      <li key={iIdx}>
                        <button 
                          onClick={() => { setActiveSectionIdx(sIdx); setActiveItemIdx(iIdx); setIsMobileMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-between group
                            ${isActive 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                        >
                          {item.name}
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]"></div>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}

        {/* CONTENT AREA */}
        <main className="flex-1 w-full min-w-0 bg-slate-950 relative">
          
          {/* Decorative background blur */}
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
          
          <div className="max-w-4xl mx-auto p-6 md:p-12 lg:p-16">
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-8 uppercase tracking-widest">
              <span className="text-emerald-500">{activeSection.title}</span>
              <ChevronRight size={14} />
              <span className="text-slate-400">{activeItem.name}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeSectionIdx}-${activeItemIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {/* Content Renderer */}
                <div className="space-y-6">
                  {activeItem.content.map((block, idx) => {
                    switch (block.type) {
                      case 'h1':
                        return <h1 key={idx} className="text-4xl md:text-5xl font-black text-white tracking-tight mb-8 leading-tight">{block.text}</h1>;
                      case 'h2':
                        return <h2 key={idx} className="text-2xl md:text-3xl font-black text-white tracking-tight mt-12 mb-6 flex items-center gap-3"><div className="w-1 h-6 bg-emerald-500 rounded-full"></div>{block.text}</h2>;
                      case 'h3':
                        return <h3 key={idx} className="text-xl font-bold text-slate-200 mt-8 mb-4">{block.text}</h3>;
                      case 'p':
                        return <p key={idx} className="text-slate-400 text-lg leading-relaxed">{block.text}</p>;
                      case 'code':
                        return <CodeBlock key={idx} language={block.language} code={block.code} />;
                      case 'alert':
                        return <AlertBlock key={idx} variant={block.variant} title={block.title} text={block.text} />;
                      case 'list':
                        return (
                          <ul key={idx} className="space-y-3 mt-4 mb-6">
                            {block.items.map((li, i) => (
                              <li key={i} className="flex items-start gap-3 text-slate-400 leading-relaxed">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0"></div>
                                <span>{li}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>

                {/* Footer Nav Links */}
                <div className="mt-24 pt-8 border-t border-slate-800 flex justify-between items-center">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Was this helpful?</span>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm font-bold text-slate-300 transition-colors">Yes</button>
                      <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm font-bold text-slate-300 transition-colors">No</button>
                    </div>
                  </div>
                  
                  <Link href="/dashboard" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                    Go to Dashboard <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
        </main>
        
        {/* RIGHT SIDEBAR (On this page) - Optional for large screens */}
        <aside className="hidden xl:block w-64 p-8 border-l border-slate-800/50 shrink-0">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">On this page</h4>
          <ul className="space-y-3">
            {activeItem.content.filter(b => b.type === 'h2' || b.type === 'h3').map((heading, idx) => (
              <li key={idx} className={`${heading.type === 'h3' ? 'pl-4' : ''}`}>
                <a href="#" className={`text-sm font-medium transition-colors ${heading.type === 'h2' ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {'text' in heading ? heading.text : ''}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
