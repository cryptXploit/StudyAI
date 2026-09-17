'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, Target, Network, MessageSquare, Briefcase, Zap, Calculator, ChevronRight, Lock, PlayCircle, Loader2, CheckCircle2, Copy, FileJson, Presentation as PresentationIcon, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';

const DEMO_FEATURES = [
  {
    id: 'solver',
    name: 'Universal Solver',
    icon: <Calculator className="w-5 h-5" />,
    color: 'emerald',
    description: 'Solve complex math, physics, or general questions instantly.',
    mockInput: 'Solve the quadratic equation: $$ 2x^2 - 8 = 0 $$',
    mockOutput: 'Let\'s solve the equation step-by-step:\n\n1. Move 8 to the right side:\n   $$ 2x^2 = 8 $$\n\n2. Divide both sides by 2:\n   $$ x^2 = 4 $$\n\n3. Take the square root of both sides:\n   $$ x = \\pm \\sqrt{4} $$\n\n**Final Answer:** \n$$ x = 2 \\text{ or } x = -2 $$'
  },
  {
    id: 'mindmap',
    name: 'Mind Map AI',
    icon: <Network className="w-5 h-5" />,
    color: 'indigo',
    description: 'Instantly visualize concepts with interactive mind maps.',
    mockInput: 'Create a mind map of Artificial Intelligence branches',
    mockOutput: '```mermaid\nmindmap\n  root((AI))\n    Machine Learning\n      Deep Learning\n      Neural Networks\n    NLP\n      Chatbots\n      Translation\n    Computer Vision\n      Image Recognition\n      Facial Recognition\n```'
  },
  {
    id: 'chat',
    name: 'Pro Chat',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'violet',
    description: 'Chat with the most advanced AI models for deep insights.',
    mockInput: 'Give me a JSON structure for a user profile',
    mockOutput: '```json\n{\n  "user": {\n    "id": "usr_9832",\n    "name": "Jane Doe",\n    "role": "Pro Member",\n    "preferences": {\n      "theme": "dark",\n      "notifications": true\n    },\n    "skills": ["React", "TypeScript", "Node.js"]\n  }\n}\n```'
  },
  {
    id: 'career',
    name: 'Career Hacker',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'amber',
    description: 'Get AI-driven career roadmaps and resume optimizations.',
    mockInput: 'HTML Resume Template for Software Engineer',
    mockOutput: '```html\n<div class="resume-card" style="font-family: sans-serif; background: #1e293b; padding: 20px; border-radius: 12px; color: #f8fafc;">\n  <h2 style="color: #38bdf8; margin-bottom: 5px;">Jane Doe</h2>\n  <p style="color: #94a3b8; font-size: 14px; margin-top: 0;">Senior Software Engineer</p>\n  <hr style="border-color: #334155;" />\n  <ul style="color: #cbd5e1; font-size: 14px;">\n    <li>Built scalable APIs with Node.js</li>\n    <li>Optimized React frontend performance by 40%</li>\n    <li>Mentored junior developers</li>\n  </ul>\n</div>\n```'
  },
  {
    id: 'presentation',
    name: 'AI Presentation',
    icon: <PresentationIcon className="w-5 h-5" />,
    color: 'blue',
    description: 'Generate beautiful slide decks instantly from a simple prompt.',
    mockInput: 'Create a presentation on Renewable Energy',
    mockOutput: '<div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 30px; border-radius: 16px; text-align: center; border: 1px solid #4f46e5; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2);">\n  <h1 style="color: #fff; font-size: 2.5rem; margin-bottom: 10px;">Renewable Energy</h1>\n  <h3 style="color: #a5b4fc; font-weight: normal;">The Future of Sustainable Power</h3>\n  <div style="display: flex; justify-content: center; gap: 20px; margin-top: 30px;">\n    <span style="background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 20px; color: #818cf8;">Solar</span>\n    <span style="background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 20px; color: #818cf8;">Wind</span>\n    <span style="background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 20px; color: #818cf8;">Hydro</span>\n  </div>\n</div>'
  },
  {
    id: 'flashcards',
    name: 'Smart Flashcards',
    icon: <BrainCircuit className="w-5 h-5" />,
    color: 'pink',
    description: 'Auto-generate flashcards from text for active recall.',
    mockInput: 'Make a flashcard about the Mitochondria',
    mockOutput: '<div style="perspective: 1000px; max-width: 400px; margin: 0 auto;">\n  <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 30px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transform-style: preserve-3d; transition: transform 0.6s;">\n    <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Flashcard</p>\n    <h3 style="color: #f8fafc; font-size: 1.25rem;">What is the primary function of the mitochondria?</h3>\n    <hr style="border-color: #334155; margin: 20px 0;" />\n    <p style="color: #ec4899; font-weight: bold;">Powerhouse of the cell (Produces ATP)</p>\n  </div>\n</div>'
  },
  {
    id: 'flowchart',
    name: 'Flowchart Generator',
    icon: <Network className="w-5 h-5" />,
    color: 'cyan',
    description: 'Generate flowcharts and process diagrams with AI.',
    mockInput: 'Flowchart for user login process',
    mockOutput: '```mermaid\ngraph TD\n    A[Enter Credentials] --> B{Valid?}\n    B -- Yes --> C[Redirect Dashboard]\n    B -- No --> D[Show Error]\n    D --> A\n```'
  }
];


const MermaidDemo = ({ code }: { code: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    const renderChart = async () => {
      try {
        setError(false);
        const { svg } = await mermaid.render('mermaid-demo-' + Math.random().toString(36).substring(7), code);
        if (isMounted) setSvg(svg);
      } catch (err) {
        setError(true);
      }
    };
    renderChart();
    return () => { isMounted = false; };
  }, [code]);
  
  if (error) return <div className="text-red-400 p-4 border border-red-500/20 bg-red-500/10 rounded-xl text-sm font-mono flex items-center justify-center">Loading diagram...</div>;
  if (!svg) return <div className="animate-pulse bg-slate-800/50 h-40 rounded-xl w-full border border-slate-700/50"></div>;
  return <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-xl flex justify-center shadow-lg my-4 overflow-x-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default function LandingInteractiveDemo() {
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState(DEMO_FEATURES[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [displayedOutput, setDisplayedOutput] = useState('');
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // Typewriter effect simulator
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isSimulating) {
      setDisplayedOutput('');
      setShowSignupPrompt(false);
      
      let currentIndex = 0;
      const text = activeFeature.mockOutput;
      
      const typeNextChar = () => {
        if (currentIndex < text.length) {
          // Type chunks instead of single chars to make HTML/Mermaid render faster and smoother
          const chunkSize = Math.floor(Math.random() * 5) + 3; 
          setDisplayedOutput(text.slice(0, currentIndex + chunkSize));
          currentIndex += chunkSize;
          timeout = setTimeout(typeNextChar, 10);
        } else {
          setDisplayedOutput(text); // Ensure complete text
          setIsSimulating(false);
        }
      };
      
      timeout = setTimeout(typeNextChar, 300); // Initial delay
    }
    
    return () => clearTimeout(timeout);
  }, [isSimulating, activeFeature]);

  const handleTestClick = () => {
    if (isSimulating) return;
    setIsSimulating(true);
  };

  const handleCustomInput = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowSignupPrompt(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 mb-24 pointer-events-auto relative z-20">
      
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
          Experience the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Magic</span> Instantly
        </h2>
        <p className="text-slate-400 font-medium">Test our premium AI features right here, no signup required.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 md:p-6">
        
        {/* Sidebar - Feature Selection */}
        <div className="lg:col-span-4 space-y-2">
          {DEMO_FEATURES.map((feature) => (
            <button
              key={feature.id}
              onClick={() => {
                if (!isSimulating) {
                  setActiveFeature(feature);
                  setDisplayedOutput('');
                  setShowSignupPrompt(false);
                }
              }}
              disabled={isSimulating}
              className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-4 ${
                activeFeature.id === feature.id
                  ? 'bg-slate-800 border-slate-700 shadow-md'
                  : 'bg-transparent hover:bg-slate-800/50 border-transparent'
              } border`}
            >
              <div className={`p-2.5 rounded-xl ${
                activeFeature.id === feature.id 
                  ? `bg-${feature.color}-500/20 text-${feature.color}-400` 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {feature.icon}
              </div>
              <div>
                <h3 className={`font-bold text-sm md:text-base ${activeFeature.id === feature.id ? 'text-white' : 'text-slate-300'}`}>
                  {feature.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Display - Interactive Area */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col relative h-[500px]">
          
          {/* Header */}
          <div className="border-b border-slate-800 p-4 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Live Demo: {activeFeature.name}
            </div>
          </div>

          {/* Chat/Output Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            
            {/* User Message */}
            <AnimatePresence mode="wait">
              {displayedOutput && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="flex justify-end"
                >
                  <div className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] font-medium text-sm">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {activeFeature.mockInput}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Response */}
            <AnimatePresence>
              {(isSimulating || displayedOutput) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="flex justify-start w-full"
                >
                  <div className="bg-slate-800/40 border border-slate-700/50 text-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm w-full max-w-full font-medium text-sm leading-relaxed overflow-x-hidden">
                    
                    <div className="prose prose-invert max-w-none text-sm break-words">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
                        rehypePlugins={[rehypeKatex, rehypeRaw]} // Enabled rehypeRaw for HTML injection!
                        components={{
                        code: ({node, inline, className, children, ...props}: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          if (!inline && match && match[1] === 'mermaid') {
                            if (isSimulating) {
                              return (
                                <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700/50">
                                  <pre className="p-4 bg-slate-900/80 overflow-x-auto text-sm font-mono text-cyan-300">
                                    <code {...props}>{children}</code>
                                  </pre>
                                </div>
                              );
                            }
                            return <MermaidDemo code={String(children).replace(/\n$/, '')} />;
                          }
                          return !inline ? (
                            <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
                              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 backdrop-blur border-b border-slate-800 text-xs font-mono text-slate-400">
                                <span>{match ? match[1] : 'code'}</span>
                                <button className="hover:text-indigo-400 transition-colors flex items-center gap-1"><Copy size={12}/> Copy</button>
                              </div>
                              <pre className="p-4 bg-slate-950 overflow-x-auto text-sm font-mono text-indigo-300">
                                <code {...props}>{children}</code>
                              </pre>
                            </div>
                          ) : (
                            <code className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono text-[13px] border border-indigo-500/20" {...props}>{children}</code>
                          );
                        },
                        table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-slate-700/50 rounded-xl bg-slate-900/50"><table className="min-w-full divide-y divide-slate-700/50 text-sm" {...props}/></div>,
                        th: ({node, ...props}) => <th className="bg-slate-800/80 px-4 py-2 text-left font-bold text-slate-300" {...props}/>,
                        td: ({node, ...props}) => <td className="px-4 py-2 border-t border-slate-700/50 text-slate-400" {...props}/>,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed text-slate-300" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2 text-white" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-4 mb-2 text-white" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-1 text-slate-200" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-300" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-300" {...props} />
                      }}
                    >
                      {displayedOutput}
                    </ReactMarkdown>
                    </div>

                    {isSimulating && (
                      <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1 align-middle"></span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Initial Empty State */}
            {!isSimulating && !displayedOutput && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                <BrainCircuit className="w-12 h-12 opacity-20" />
                <p className="font-medium text-sm">Click "Run Demo" to see the AI in action</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 relative mt-auto">
            
            {/* Signup Prompt Overlay */}
            <AnimatePresence>
              {showSignupPrompt && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-4 right-4 mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-xl shadow-xl flex items-center justify-between border border-emerald-400/30"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-emerald-100" />
                    <div>
                      <h4 className="text-white font-bold text-sm">Want to ask your own questions?</h4>
                      <p className="text-emerald-100 text-xs mt-0.5">Create a free account to unlock all AI tools.</p>
                    </div>
                  </div>
                  <Link 
                    href="/signup" 
                    className="px-4 py-2 bg-white text-emerald-700 text-sm font-black rounded-lg shadow-sm hover:scale-105 transition-transform"
                  >
                    Sign Up Free
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 relative">
              <div 
                onClick={handleCustomInput}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-text hover:border-slate-500 transition-colors flex items-center"
              >
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                   {activeFeature.mockInput}
                </ReactMarkdown>
              </div>
              <button 
                onClick={handleTestClick}
                disabled={isSimulating || !!displayedOutput}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shrink-0"
              >
                {isSimulating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : displayedOutput ? (
                  <><CheckCircle2 className="w-4 h-4" /> Finished</>
                ) : (
                  <><Zap className="w-4 h-4" /> Run Demo</>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
