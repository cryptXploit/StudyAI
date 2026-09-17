'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, Target, Network, MessageSquare, Briefcase, Zap, Calculator, ChevronRight, Lock, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const DEMO_FEATURES = [
  {
    id: 'solver',
    name: 'Universal Solver',
    icon: <Calculator className="w-5 h-5" />,
    color: 'emerald',
    description: 'Solve complex math, physics, or general questions instantly.',
    mockInput: 'Solve: 2x² - 8 = 0',
    mockOutput: 'Let\'s solve the equation step-by-step:\n\n1. Move 8 to the right side:\n   2x² = 8\n\n2. Divide by 2:\n   x² = 4\n\n3. Take the square root:\n   x = 2 or x = -2\n\n**Final Answer:** x = 2, -2'
  },
  {
    id: 'mindmap',
    name: 'Mind Map AI',
    icon: <Network className="w-5 h-5" />,
    color: 'indigo',
    description: 'Instantly visualize concepts with interactive mind maps.',
    mockInput: 'Create a mind map of Artificial Intelligence branches',
    mockOutput: '```mermaid\nmindmap\n  root((Artificial Intelligence))\n    Machine Learning\n      Deep Learning\n      Neural Networks\n    Natural Language Processing\n      Chatbots\n      Translation\n    Computer Vision\n      Image Recognition\n      Facial Recognition\n    Robotics\n```'
  },
  {
    id: 'chat',
    name: 'Pro Chat',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'violet',
    description: 'Chat with the most advanced AI models for deep insights.',
    mockInput: 'Explain Quantum Computing to a 5-year-old',
    mockOutput: 'Imagine you have a magic coin. A regular coin can only be Heads OR Tails. But a magic quantum coin can be Heads, Tails, or BOTH at the same time while it\'s spinning in the air!\n\nRegular computers use regular coins (0s or 1s). Quantum computers use magic coins (qubits), which lets them solve some giant puzzles millions of times faster!'
  },
  {
    id: 'career',
    name: 'Career Hacker',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'amber',
    description: 'Get AI-driven career roadmaps and resume optimizations.',
    mockInput: 'Roadmap to become a Software Engineer in 2026',
    mockOutput: 'Here is your 6-month Software Engineering Roadmap:\n\n**Month 1-2: The Fundamentals**\n- Learn HTML, CSS, and modern JavaScript (ES6+).\n- Master Git and GitHub.\n\n**Month 3-4: Frameworks & Backend**\n- Learn React or Next.js for frontend.\n- Learn Node.js and Express for backend.\n\n**Month 5-6: Projects & Prep**\n- Build 3 full-stack portfolio projects.\n- Practice LeetCode algorithms.\n- Optimize your LinkedIn profile.'
  },
  {
    id: 'youtube-decoder',
    name: 'YouTube Decoder',
    icon: <PlayCircle className="w-5 h-5" />,
    color: 'red',
    description: 'Summarize and extract key insights from any YouTube video.',
    mockInput: 'Summarize video: https://youtube.com/watch?v=mock-video',
    mockOutput: '**Video Summary: The Future of AI**\n\n1. **Introduction:** AI is moving from narrow tasks to general reasoning.\n2. **Key Breakthroughs:** Transformers and large language models (LLMs) changed the game.\n3. **Future Predictions:** AI agents will autonomously handle multi-step workflows.\n\n*Key Quote:* "AI won\'t replace humans, but humans using AI will replace those who don\'t."'
  },
  {
    id: 'presentation',
    name: 'AI Presentation',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'blue',
    description: 'Generate beautiful slide decks instantly from a simple prompt.',
    mockInput: 'Create a 3-slide presentation on Renewable Energy',
    mockOutput: '---Slide 1---\n**Title:** The Power of Renewable Energy\n**Subtitle:** A Sustainable Future\n\n---Slide 2---\n**Title:** Types of Renewables\n- Solar Energy\n- Wind Power\n- Hydroelectric\n\n---Slide 3---\n**Title:** Why It Matters\n- Combats climate change\n- Reduces carbon footprint\n- Infinite resource supply'
  },
  {
    id: 'flashcards',
    name: 'Smart Flashcards',
    icon: <BrainCircuit className="w-5 h-5" />,
    color: 'pink',
    description: 'Auto-generate flashcards from text for active recall.',
    mockInput: 'Make 2 flashcards about the Mitochondria',
    mockOutput: '**Card 1**\n*Front:* What is the primary function of the mitochondria?\n*Back:* To generate most of the chemical energy needed to power the cell\'s biochemical reactions (powerhouse of the cell).\n\n**Card 2**\n*Front:* What is the energy molecule produced by the mitochondria?\n*Back:* ATP (Adenosine Triphosphate).'
  },
  {
    id: 'flowchart',
    name: 'Flowchart Generator',
    icon: <Network className="w-5 h-5" />,
    color: 'cyan',
    description: 'Generate flowcharts and process diagrams with AI.',
    mockInput: 'Flowchart for user login process',
    mockOutput: '```mermaid\ngraph TD\n    A[User Enters Credentials] --> B{Are credentials valid?}\n    B -- Yes --> C[Generate JWT Token]\n    C --> D[Redirect to Dashboard]\n    B -- No --> E[Show Error Message]\n    E --> A\n```'
  },
  {
    id: 'notes-purifier',
    name: 'Notes Purifier',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'purple',
    description: 'Turn messy notes into perfectly structured study material.',
    mockInput: 'Clean this: Photosynthesis is how plants make food using sun, water, and CO2. Oxygen is released.',
    mockOutput: '**Photosynthesis Overview**\n\n**Definition:**\nThe process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.\n\n**Key Components (Inputs):**\n- Sunlight (Energy)\n- Water (H2O)\n- Carbon Dioxide (CO2)\n\n**Byproducts (Outputs):**\n- Glucose (Food/Energy)\n- Oxygen (O2)'
  }
];

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
          setDisplayedOutput(text.slice(0, currentIndex + 1));
          currentIndex += Math.floor(Math.random() * 3) + 1; // Type 1-3 chars at a time
          timeout = setTimeout(typeNextChar, 15);
        } else {
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
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col relative h-[450px]">
          
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
                    {activeFeature.mockInput}
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
                  className="flex justify-start"
                >
                  <div className="bg-slate-800/50 border border-slate-700/50 text-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm max-w-[95%] font-medium text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {displayedOutput}
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
          <div className="p-4 bg-slate-900 border-t border-slate-800 relative">
            
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
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-text hover:border-slate-500 transition-colors"
              >
                {activeFeature.mockInput}
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
