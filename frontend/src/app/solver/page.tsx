'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { BrainCircuit, Sparkles, Loader2, History, Copy, Check, Calculator, ShieldCheck, Activity, BarChart3, Binary, Grid3X3, BookOpen, ListTree, CheckSquare, Circle, Target, MonitorPlay, CheckCircle2, ImagePlus, X, Trash2, Edit2, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { useTokens } from '@/hooks/useTokens';
import { getPublicErrorMessage, showPublicError } from '@/lib/errors/publicError';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import { Mafs, Coordinates, Plot, Theme } from 'mafs';
import * as math from 'mathjs';
import 'mafs/core.css';
import 'mafs/font.css';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const translations = {
  English: { proSolver: "Pro Solver", eliteAssist: "Elite Academic Assistance", yourLibrary: "Solved History", noHistory: "No solved problems yet.", placeholder: "Describe your complex problem, or attach an image...", solveProblem: "Solve Problem", solveAndPlot: "Solve & Visualize", solutionAwaits: "Awaiting Problem", awaitsDesc: "Submit a complex problem or image on the left to get a detailed Elite solution.", copySolution: "Copy Solution", copied: "Copied!", proBadge: "PRO TIER FEATURE", tools: "Visual Tools", knowledgeBase: "RAG Sources", syllabusConstraint: "Syllabus Boundary", selectCourse: "-- Select Course/Subject --", selectChapter: "Select Chapter (Max 1)", selectTopics: "Select Topics (Optional)", imageSource: "Image Source", aiTyping: "AI is analyzing & typing...", interactiveConcept: "Interactive Concept:", syllabusDrawer: "Syllabus", filesDrawer: "Files", libraryDrawer: "Library", untitledFile: "Untitled File" },
  Bangla: { proSolver: "প্রো সলভার", eliteAssist: "এলিট অ্যাকাডেমিক সহায়তা", yourLibrary: "সমাধানের হিস্ট্রি", noHistory: "কোনো সমস্যা সমাধান করা হয়নি।", placeholder: "আপনার জটিল সমস্যা বিস্তারিত লিখুন বা ছবি যুক্ত করুন...", solveProblem: "সমস্যা সমাধান করুন", solveAndPlot: "সমাধান ও ভিজ্যুয়ালাইজ", solutionAwaits: "সমস্যার অপেক্ষায়", awaitsDesc: "বিস্তারিত সমাধানের জন্য বাম পাশে আপনার সমস্যা বা ছবি সাবমিট করুন।", copySolution: "সমাধান কপি করুন", copied: "কপি হয়েছে!", proBadge: "প্রো-টিয়ার ফিচার", tools: "ভিজ্যুয়াল টুলস", knowledgeBase: "RAG সোর্সসমূহ", syllabusConstraint: "সিলেবাস বাউন্ডারি", selectCourse: "-- কোর্স/সাবজেক্ট নির্বাচন করুন --", selectChapter: "চ্যাপ্টার নির্বাচন করুন (সর্বোচ্চ ১)", selectTopics: "টপিকস নির্বাচন করুন (ঐচ্ছিক)", imageSource: "ছবির সোর্স", aiTyping: "AI বিশ্লেষণ এবং টাইপ করছে...", interactiveConcept: "ইন্টারেক্টিভ কনসেপ্ট:", syllabusDrawer: "সিলেবাস", filesDrawer: "ফাইলসমূহ", libraryDrawer: "লাইব্রেরি", untitledFile: "নামবিহীন ফাইল" },
  Hindi: { proSolver: "प्रो सॉल्वर", eliteAssist: "एलीट अकादमिक सहायता", yourLibrary: "समाधान इतिहास", noHistory: "अभी तक कोई समस्या हल नहीं हुई।", placeholder: "अपनी जटिल समस्या का वर्णन करें या चित्र संलग्न करें...", solveProblem: "समस्या हल करें", solveAndPlot: "हल करें और विज़ुअलाइज़ करें", solutionAwaits: "समस्या की प्रतीक्षा में", awaitsDesc: "विस्तृत समाधान प्राप्त करने के लिए बाईं ओर एक समस्या या चित्र सबमिट करें।", copySolution: "समाधान कॉपी करें", copied: "कॉपी हो गया!", proBadge: "प्रो टियर फ़ीचर", tools: "विज़ुअल टूल्स", knowledgeBase: "RAG स्रोत", syllabusConstraint: "सिलेबस सीमा", selectCourse: "-- कोर्स/विषय चुनें --", selectChapter: "अध्याय चुनें (अधिकतम 1)", selectTopics: "विषय चुनें (वैकल्पिक)", imageSource: "छवि स्रोत", aiTyping: "AI विश्लेषण और टाइप कर रहा है...", interactiveConcept: "इंटरएक्टिव कॉन्सेप्ट:", syllabusDrawer: "सिलेबस", filesDrawer: "फ़ाइलें", libraryDrawer: "लाइब्रेरी", untitledFile: "बिना नाम की फ़ाइल" }
};
type LanguageType = 'English' | 'Bangla' | 'Hindi';

const MemoizedMarkdown = React.memo(({ content }: { content: string }) => {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} rehypePlugins={[rehypeKatex]}
      components={{
        table: ({node, ...props}) => <div className="overflow-x-auto my-6 border border-slate-700/50 rounded-xl shadow-sm bg-slate-900/50"><table className="min-w-full divide-y divide-slate-700/50 text-sm" {...props}/></div>,
        th: ({node, ...props}) => <th className="bg-slate-800/80 px-4 py-3 text-left font-bold text-slate-300 uppercase tracking-wider" {...props}/>,
        td: ({node, ...props}) => <td className="px-4 py-3 border-t border-slate-700/50 text-slate-400 font-medium" {...props}/>,
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
        code: ({node, inline, className, children, ...props}: any) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <div className="relative group my-6 rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 backdrop-blur border-b border-slate-800 text-xs font-mono text-slate-400">
                <span>{match ? match[1] : 'code'}</span>
                <button onClick={() => navigator.clipboard.writeText(String(children))} className="hover:text-indigo-400 transition-colors flex items-center gap-1"><Copy size={12}/> Copy</button>
              </div>
              <pre className="p-4 bg-slate-950/90 overflow-x-auto text-sm font-mono text-indigo-300">
                <code {...props}>{children}</code>
              </pre>
            </div>
          ) : (
            <code className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono text-[13px] border border-indigo-500/20" {...props}>{children}</code>
          );
        },
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 bg-indigo-500/10 py-3 px-5 rounded-r-2xl my-6 text-slate-300 italic shadow-inner font-medium" {...props}/>
      }}
    >
      {content}
    </ReactMarkdown>
  );
}, (prev, next) => prev.content === next.content);

const CurveCrafter = React.memo(({ equation }: { equation: string }) => { const [sliderVal, setSliderVal] = useState(0); const mathFunction = useMemo(() => { try { if (!equation) return (x: number) => 0; const node = math.parse(equation); const code = node.compile(); return (x: number) => { const val = code.evaluate({ x }); return isNaN(val) ? 0 : val; }; } catch (e) { return (x: number) => 0; } }, [equation]); const dynamicY = useMemo(() => mathFunction(sliderVal), [mathFunction, sliderVal]); return ( <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] my-8 animate-in fade-in zoom-in duration-500 hover:shadow-[0_10px_40px_rgba(236,72,153,0.15)] transition-all"> <div className="flex items-center gap-2 mb-5 text-pink-400 font-black uppercase tracking-widest text-xs"><Activity size={16} /> Curve Crafter Dynamic Explorer</div> <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-2 border border-slate-800 shadow-inner"> <Mafs zoom={{ min: 0.1, max: 10 }} viewBox={{ x: [-5, 5], y: [-5, 5] }}> <Coordinates.Cartesian xAxis={{ lines: 1 }} yAxis={{ lines: 1 }} /> <Plot.OfX y={mathFunction} color={Theme.indigo} weight={3} /> <Plot.OfX y={(x) => (x === sliderVal ? dynamicY : NaN)} style="dashed" color={Theme.pink} /> </Mafs> </div> <div className="mt-6 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm"> <div className="flex justify-between items-center mb-4"> <p className="text-slate-300 font-bold text-sm">Real-time Value Explorer</p> <div className="bg-pink-500/20 text-pink-300 px-4 py-1.5 rounded-lg text-xs font-mono font-bold truncate max-w-[200px] border border-pink-500/30"> f({sliderVal.toFixed(2)}) = {dynamicY.toFixed(4)} </div> </div> <input type="range" min="-10" max="10" step="0.1" value={sliderVal} onChange={(e) => setSliderVal(parseFloat(e.target.value))} className="w-full accent-pink-500 cursor-pointer h-2 bg-slate-700/50 rounded-lg appearance-none shadow-inner transition-all hover:bg-slate-600" /> </div> </div> ); }); CurveCrafter.displayName = "CurveCrafter";
const StatisticalPlotter = React.memo(({ dataString }: { dataString: string }) => { const { dataX, dataY, regression } = useMemo(() => { let xs = [1, 2, 3]; let ys = [2, 4, 5]; try { const parsed = JSON.parse(dataString); if (parsed.dataX && parsed.dataY) { xs = parsed.dataX; ys = parsed.dataY; } } catch (e) {} const n = xs.length; const sumX = xs.reduce((a, b) => a + b, 0); const sumY = ys.reduce((a, b) => a + b, 0); const sumXY = xs.reduce((sum, xi, i) => sum + xi * ys[i], 0); const sumXX = xs.reduce((sum, xi) => sum + xi * xi, 0); const slope = (n * sumXX - sumX * sumX) === 0 ? 0 : (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX); const intercept = (sumY - slope * sumX) / n; return { dataX: xs, dataY: ys, regression: { slope, intercept } }; }, [dataString]); const chartData = { datasets: [ { label: 'Regression', data: dataX.map((x) => ({ x, y: regression.slope * x + regression.intercept })), borderColor: '#f43f5e', borderWidth: 3, fill: false, pointRadius: 0, tension: 0.1 }, { label: 'Scatter', data: dataX.map((x, i) => ({ x, y: dataY[i] })), backgroundColor: '#6366f1', borderColor: '#6366f1', pointRadius: 6, pointHoverRadius: 8, showLine: false } ] }; const chartOptions = { responsive: true, plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'inherit', weight: 'bold' } } } }, scales: { x: { type: 'linear' as const, position: 'bottom' as const, grid: { color: '#334155' }, ticks: { color: '#94a3b8', font: { weight: 'bold' } } }, y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', font: { weight: 'bold' } } } } }; return ( <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] my-8 animate-in fade-in zoom-in duration-500 hover:shadow-[0_10px_40px_rgba(245,158,11,0.15)] transition-all"> <div className="flex items-center justify-between mb-5"> <div className="flex items-center gap-2 text-amber-400 font-black uppercase tracking-widest text-xs"><BarChart3 size={16} /> Statistical Regression</div> <div className="bg-amber-500/20 text-amber-300 px-4 py-1.5 rounded-lg text-xs font-mono font-bold border border-amber-500/30">y = {regression.slope.toFixed(2)}x {regression.intercept >= 0 ? '+' : '-'} {Math.abs(regression.intercept).toFixed(2)}</div> </div> <div className="p-5 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-inner"><Line data={chartData} options={chartOptions as any} /></div> </div> ); }); StatisticalPlotter.displayName = "StatisticalPlotter";
const MatrixVisualizer = React.memo(({ matrixStr }: { matrixStr: string }) => { return ( <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] my-8 animate-in fade-in zoom-in duration-500 hover:shadow-[0_10px_40px_rgba(16,185,129,0.15)] transition-all"> <div className="flex items-center gap-2 mb-5 text-emerald-400 font-black uppercase tracking-widest text-xs"><Grid3X3 size={16} /> Matrix Representation</div> <div className="p-6 bg-slate-950/80 backdrop-blur-md rounded-2xl font-mono text-center text-teal-400 border border-slate-800 shadow-inner text-sm overflow-x-auto whitespace-pre font-bold">{matrixStr}</div> </div> ); }); MatrixVisualizer.displayName = "MatrixVisualizer";
const LogicGateSimulator = React.memo(({ equation }: { equation: string }) => { return ( <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] my-8 animate-in fade-in zoom-in duration-500 hover:shadow-[0_10px_40px_rgba(6,182,212,0.15)] transition-all"> <div className="flex items-center gap-2 mb-5 text-cyan-400 font-black uppercase tracking-widest text-xs"><Binary size={16} /> Boolean Logic Simulation</div> <div className="bg-slate-950/80 backdrop-blur-md p-6 rounded-2xl text-sm font-mono text-slate-400 border border-slate-800 shadow-inner overflow-x-auto"><span className="text-indigo-400 font-bold">{equation}</span></div> </div> ); }); LogicGateSimulator.displayName = "LogicGateSimulator";

export default function SolverPage() {
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();
  const [problem, setProblem] = useState('');
  
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  const [solution, setSolution] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [widgetType, setWidgetType] = useState<string | null>(null);
  const [extractedPayload, setExtractedPayload] = useState<any | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  
  const [learningResources, setLearningResources] = useState<any[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<any | null>(null);

  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editHistoryText, setEditHistoryText] = useState('');

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];
  
  const [uiTheme, setUiTheme] = useState<'dark'|'light'>('dark');

  const solutionEndRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const targetTextRef = useRef('');

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'syllabus'|'files'|'history'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = () => {
    if (!rightPanelRef.current) return;
    const currentScrollY = rightPanelRef.current.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(10);

  useEffect(() => { 
    fetchFilesAndSyllabuses(); fetchHistory(); 
    const loadSettings = () => { 
      const savedLang = localStorage.getItem('Prepia_language'); if (savedLang) setLanguage(savedLang as LanguageType); 
      const savedTheme = localStorage.getItem('Prepia_theme'); if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
    };
    loadSettings(); 
    window.addEventListener('settingsChanged', loadSettings); 
    return () => window.removeEventListener('settingsChanged', loadSettings);
  }, []);

  useEffect(() => { if (solution) solutionEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [solution]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => { setSolution((prev) => { if (prev.length < targetTextRef.current.length) return targetTextRef.current.substring(0, prev.length + 5); return prev; }); }, 15);
    } else { if (targetTextRef.current) setSolution(targetTextRef.current); }
    return () => clearInterval(interval);
  }, [isLoading]);

  const fetchFilesAndSyllabuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const { data: fData } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed').order('created_at', { ascending: false });
      if (fData) setFiles(fData);
      
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      
      // 🟢 FIXED URL LOGIC
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/list` : `${apiUrlBase}/api/syllabus/list`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const sData = await res.json();
      if (sData.success) setSyllabuses(sData.syllabuses);

      const { data: resourcesData } = await supabase.from('learning_resources').select('*').eq('is_active', true);
      if (resourcesData) setLearningResources(resourcesData);
    } catch(e) {}
  };

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const { data } = await supabase.from('solved_problems').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setHistoryList(data);
    } catch (e) {}
  };

  const deleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from('solved_problems').delete().eq('id', id);
    fetchHistory();
  };

  const startEditHistory = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setEditingHistoryId(item.id);
    setEditHistoryText(item.problem_statement);
  };

  const saveHistoryEdit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editHistoryText.trim()) {
      try {
        const { error } = await supabase.from('solved_problems').update({ problem_statement: editHistoryText }).eq('id', id);
        if (!error) await fetchHistory();
      } catch (err) {}
    }
    setEditingHistoryId(null);
  };

  const handleCopy = () => { navigator.clipboard.writeText(solution); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImageBase64(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerWidgetGeneration = async (problemText: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      
      // 🟢 FIXED URL LOGIC
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/curve/extract` : `${apiUrlBase}/api/curve/extract`;
      
      const res = await fetch(fetchUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ problem: problemText }) });
      const data = await res.json();
      if (data.valid && data.type) { setWidgetType(data.type.toLowerCase()); setExtractedPayload(data); } else { setWidgetType(null); }
    } catch (e) { setWidgetType(null); }
  };

  const toggleSourceFile = (id: string) => { setSelectedFileIds(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]); };

  const handleSyllabusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedSyllabusId(e.target.value); setSelectedChapterId(''); setSelectedTopics([]); };
  const selectChapter = (chapterId: string) => { if (selectedChapterId === chapterId) { setSelectedChapterId(''); setSelectedTopics([]); } else { setSelectedChapterId(chapterId); setSelectedTopics([]); } };
  const toggleTopic = (topic: string) => { setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]); };

  const findMatchingSimulation = (text: string) => {
    if (!learningResources.length) return null;
    const lowerText = text.toLowerCase();
    let bestMatch = null; let maxHits = 0;
    learningResources.forEach(res => {
      const keys = res.keywords.split(',').map((k:string) => k.trim().toLowerCase()).filter(Boolean);
      let hits = 0; keys.forEach(k => { if (lowerText.includes(k)) hits++; });
      if (hits > maxHits) { maxHits = hits; bestMatch = res; }
    });
    return bestMatch;
  };

  const submitProblem = async (e: React.FormEvent, withVisuals: boolean = false) => {
    e.preventDefault();
    if ((!problem.trim() && !imageBase64) || isLoading) return;

    if (tier !== 'PRO' && tokens < 10) {
      setRequiredTokensForModal(10);
      setShowTokenModal(true);
      return;
    }

    setProcessingImage(imageBase64); 
    setImageBase64(null); 
    setSolution(''); setWidgetType(null); setExtractedPayload(null); setActiveSimulation(null); targetTextRef.current = ''; setIsLoading(true);
    
    // 🟢 Scroll Mobile view directly to output panel
    setTimeout(() => {
      rightPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    if (withVisuals && problem) triggerWidgetGeneration(problem);
    if (problem) { const matchedSimulation = findMatchingSimulation(problem); if (matchedSimulation) setActiveSimulation(matchedSimulation); }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/solver/solve` : `${apiUrlBase}/api/solver/solve`;
      
      const selectedCourse = syllabuses.find(s => s.id === selectedSyllabusId);
      const selectedChapterData = selectedCourse?.chapters?.find((c:any) => c.id === selectedChapterId);
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          problem, image: processingImage || imageBase64, fileIds: selectedFileIds, 
          language, syllabusCourseName: selectedCourse ? selectedCourse.course_name : '', 
          syllabusChapter: selectedChapterData ? selectedChapterData.title : '', syllabusTopics: selectedTopics 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.body) throw new Error('No response from server');
      const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8'); let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]' || !dataStr) continue;
             try { 
               const data = JSON.parse(dataStr); 
               // 🟢 FIXED: Handle Content AND Errors!
               if (data.error) {
                 if (data.error === 'INSUFFICIENT_TOKENS') {
                   setRequiredTokensForModal(data.required || 10);
                   setShowTokenModal(true);
                   setIsLoading(false);
                   return;
                 }
                 targetTextRef.current += `\n\n${getPublicErrorMessage(data)}`;
                 showPublicError(data);
               } else if (data.content) {
                 targetTextRef.current += data.content; 
               }
            } catch (e) {}
          }
        }
      }
      refreshTokens();
      setTimeout(() => fetchHistory(), 1500);
    } catch (error: any) {
      targetTextRef.current = getPublicErrorMessage();
      showPublicError();
    } finally { 
      setIsLoading(false); 
    }
  };

  const activeCourse = syllabuses.find(s => s.id === selectedSyllabusId);
  const activeChapter = activeCourse?.chapters?.find((c:any) => c.id === selectedChapterId);

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className={`flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] w-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden ${uiTheme === 'dark' ? 'bg-slate-950 lg:border-slate-800' : 'bg-white lg:bg-slate-50 lg:border-slate-200/60'} lg:border lg:rounded-3xl shadow-2xl mt-0 lg:mt-4 custom-scrollbar transition-colors duration-500`}>
        
        {/* Left Panel (Desktop Only) */}
        <div className="hidden lg:flex lg:w-[35%] bg-slate-950 lg:border-r border-slate-800/80 p-5 lg:p-8 flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar relative shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10 flex items-center gap-1"><ShieldCheck size={12}/> {t.proBadge}</div>
          <div className="flex items-center gap-4 mb-8 mt-2">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.15)]"><BrainCircuit size={28} /></div>
            <div><h2 className="text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-100 to-slate-300 tracking-tight">{t.proSolver}</h2><p className="text-xs font-bold text-indigo-400/80 uppercase tracking-widest">{t.eliteAssist}</p></div>
          </div>

          <div className="mb-6 space-y-4">
            {files.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                <label className="text-[11px] font-black tracking-widest text-indigo-400 uppercase mb-2 flex items-center gap-1.5"><BookOpen size={14}/> {t.knowledgeBase}</label>
                <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1">
                  {files.map(f => (
                    <div key={f.id} onClick={() => toggleSourceFile(f.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${selectedFileIds.includes(f.id) ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800'}`}>
                      <CheckSquare size={14} className={selectedFileIds.includes(f.id) ? 'text-indigo-400' : 'text-slate-600'} />
                      <span className="truncate">{f.name || f.original_name || f.file_name || t.untitledFile}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {syllabuses.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                <label className="text-[11px] font-black tracking-widest text-amber-400 uppercase mb-2 flex items-center gap-1.5"><ListTree size={14}/> {t.syllabusConstraint}</label>
                
                <select value={selectedSyllabusId} onChange={handleSyllabusSelect} className="w-full bg-slate-950 border border-slate-700 p-2 rounded-xl text-xs font-bold focus:border-amber-500 outline-none text-slate-300 mb-2">
                  <option value="">{t.selectCourse}</option>
                  {syllabuses.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
                </select>

                {selectedSyllabusId && activeCourse?.chapters && activeCourse.chapters.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t.selectChapter}</p>
                    <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                      {activeCourse.chapters.map((chap: any) => (
                        <div key={chap.id} onClick={() => selectChapter(chap.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-bold transition-all border ${selectedChapterId === chap.id ? 'bg-amber-500/10 border-amber-500/50 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                          {selectedChapterId === chap.id ? <CheckCircle2 size={14} className="text-amber-400 shrink-0"/> : <Circle size={14} className="text-slate-600 shrink-0"/>}
                          <span className="truncate">{chap.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedChapterId && activeChapter?.topics && activeChapter.topics.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Target size={10}/> {t.selectTopics}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeChapter.topics.map((topic: string, i: number) => (
                        <button key={i} type="button" onClick={() => toggleTopic(topic)} className={`text-[10px] font-black tracking-wide px-2 py-1 rounded-md border transition-all ${selectedTopics.includes(topic) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form className="space-y-5">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={t.placeholder} className="relative w-full p-5 pb-14 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none font-medium text-slate-200 placeholder:text-slate-600 shadow-inner transition-all duration-300" rows={4} />
              
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-slate-800/80 backdrop-blur-sm hover:bg-indigo-500 text-slate-400 hover:text-white rounded-xl transition-all duration-300 border border-slate-700 hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] active:scale-95 z-10">
                  <ImagePlus size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                
                {imageBase64 && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-in zoom-in duration-300 z-10">
                    <img src={imageBase64} alt="Attached" className="object-cover w-full h-full" />
                    <button type="button" onClick={() => setImageBase64(null)} className="absolute top-0 right-0 bg-red-500/90 backdrop-blur-md p-1 text-white hover:bg-red-500 transition-colors"><X size={10}/></button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 pt-2">
              <button type="button" onClick={(e) => submitProblem(e, false)} disabled={isLoading || (!problem.trim() && !imageBase64)} className="flex-1 w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black uppercase tracking-wide text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.5)] transition-all duration-300 active:scale-[0.98] disabled:active:scale-100 disabled:shadow-none border border-indigo-400/20">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />}{t.solveProblem}</button>
              <button type="button" onClick={(e) => submitProblem(e, true)} disabled={isLoading || (!problem.trim() && !imageBase64)} className="flex-1 w-full py-3.5 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-black uppercase tracking-wide text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(244,63,94,0.3)] hover:shadow-[0_8px_25px_rgba(244,63,94,0.5)] transition-all duration-300 active:scale-[0.98] disabled:active:scale-100 disabled:shadow-none border border-pink-400/20"><Sparkles size={18} />{t.solveAndPlot}</button>
            </div>
          </form>

          {/* History */}
          <div className="mt-8 pt-8 border-t border-slate-800/50">
            <h3 className="text-xs font-black tracking-widest text-indigo-400 uppercase mb-4 flex items-center gap-2"><History size={14} /> {t.yourLibrary}</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? <p className="text-xs text-slate-600 text-center py-4 bg-slate-900 rounded-xl">{t.noHistory}</p> : historyList.map((item) => (
                <div key={item.id} className="group p-4 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/50 transition-all flex flex-col gap-2" onClick={() => { if(editingHistoryId === item.id) return; setSolution(item.solution_content); setProblem(item.problem_statement); setProcessingImage(null); targetTextRef.current = item.solution_content; triggerWidgetGeneration(item.problem_statement); setActiveSimulation(findMatchingSimulation(item.problem_statement)); rightPanelRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>
                  {editingHistoryId === item.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input type="text" value={editHistoryText} onChange={e => setEditHistoryText(e.target.value)} className="flex-1 bg-slate-950 border border-indigo-500/50 rounded-md px-2 py-1 text-xs text-white outline-none" autoFocus />
                      <button onClick={(e) => saveHistoryEdit(e, item.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-md transition-colors"><Save size={14}/></button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingHistoryId(null); }} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"><X size={14}/></button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-bold text-slate-300 line-clamp-2 flex-1">{item.problem_statement}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={(e) => startEditHistory(e, item)} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition-all"><Edit2 size={12}/></button>
                        <button onClick={(e) => deleteHistory(e, item.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-md transition-all"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div ref={rightPanelRef} onScroll={handleScroll} className={`w-full lg:w-[65%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative lg:overflow-y-auto custom-scrollbar transition-colors duration-500 ${uiTheme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 lg:bg-white text-slate-800'}`}>
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} ${uiTheme === 'dark' ? 'border-slate-700/50 bg-slate-900/80' : 'border-slate-200/50 bg-white/90'}`}>
            <div className="flex flex-col">
              <h2 className={`text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${uiTheme === 'dark' ? 'from-indigo-100 to-indigo-500' : 'from-indigo-600 to-indigo-400'}`}>{t.proSolver}</h2>
              <p className="text-[9px] font-bold text-indigo-500 flex items-center gap-1.5 uppercase tracking-widest"><BrainCircuit size={10} className="text-indigo-500"/> {t.eliteAssist}</p>
            </div>
            <div className="bg-gradient-to-l from-indigo-500 to-purple-600 text-white text-[9px] font-black tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] flex items-center gap-1"><ShieldCheck size={10}/> PRO</div>
          </div>

          <div className="p-5 lg:p-10 flex-1 relative pb-40 lg:pb-10">
            {!solution && !isLoading && !processingImage ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-70 p-4 min-h-[50vh]"><div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner"><Calculator size={48} className="text-slate-500" /></div><h3 className="text-2xl lg:text-3xl font-black text-slate-400/80 tracking-tight">{t.solutionAwaits}</h3><p className="text-slate-500 mt-3 max-w-sm font-medium">{t.awaitsDesc}</p></div>
            ) : (
              <div className={`max-w-3xl mx-auto w-full relative animate-in fade-in duration-700 ${uiTheme === 'dark' ? 'dark' : ''}`}>
              
              {processingImage && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-sm">
                   <div className="bg-slate-100 text-[10px] font-bold text-slate-500 px-3 py-1.5 border-b border-slate-200 uppercase tracking-widest">{t.imageSource}</div>
                   <img src={processingImage} alt="Processing source" className="w-full object-contain max-h-48" />
                </div>
              )}

              {isLoading && solution.length < 5 && (
                <div className="flex items-center gap-3 text-indigo-500 font-black tracking-widest uppercase text-sm mb-6 animate-pulse">
                  <Loader2 size={18} className="animate-spin" /> {t.aiTyping}
                </div>
              )}

              {solution && !isLoading && <button onClick={handleCopy} className={`absolute -top-4 -right-4 p-2 ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white' : 'bg-white border-slate-200'} border rounded-lg shadow-sm text-xs font-bold flex items-center gap-2 z-10`}><Copy size={16} />{copied ? t.copied : t.copySolution}</button>}
              
              <div className={`prose prose-lg max-w-none mb-8 prose-p:leading-relaxed prose-p:tracking-wide prose-headings:font-black font-sans ${uiTheme === 'dark' ? 'prose-invert text-slate-300 prose-headings:text-white' : 'prose-slate text-slate-700 prose-headings:text-slate-900'} transition-colors duration-500`}><MemoizedMarkdown content={solution} /></div>
              
              {activeSimulation && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl my-8 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-cyan-400 font-black uppercase tracking-widest text-xs">
                      <MonitorPlay size={16} /> {t.interactiveConcept} {activeSimulation.title}
                    </div>
                  </div>
                  <div className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video relative">
                    <iframe src={activeSimulation.embed_url} width="100%" height="100%" className="absolute inset-0 border-none" allowFullScreen />
                  </div>
                </div>
              )}

              {widgetType === "graph" && extractedPayload && <CurveCrafter equation={extractedPayload.equation || extractedPayload.function || extractedPayload.expression || ""} />}
              {widgetType === "matrix" && extractedPayload && <MatrixVisualizer matrixStr={JSON.stringify(extractedPayload.matrix || extractedPayload.data || {})} />}
              {widgetType === "stats" && extractedPayload && <StatisticalPlotter dataString={JSON.stringify(extractedPayload)} />}
              {widgetType === "logic" && extractedPayload && <LogicGateSimulator equation={extractedPayload.expression || extractedPayload.equation || ""} />}
              
              <div ref={solutionEndRef} className="h-20" />
            </div>
          )}
          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-950 via-slate-950/80 to-transparent' : 'from-slate-50 via-slate-50/80 to-transparent'} ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            
            <div className="flex gap-2 overflow-x-auto mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('syllabus')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedSyllabusId ? (uiTheme === 'dark' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                <ListTree size={12}/> {t.syllabusDrawer} {selectedChapterId && `(1)`}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('files')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${selectedFileIds.length > 0 ? (uiTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')}`}>
                <BookOpen size={12}/> {t.filesDrawer} {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
              </button>
              <button onClick={() => setIsMobileDrawerOpen('history')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-indigo-400' : 'bg-white border-slate-200 text-indigo-600'}`}>
                <History size={12}/> {t.libraryDrawer}
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-[2rem] blur-md opacity-50 group-focus-within:opacity-100 transition duration-500 ${uiTheme === 'dark' ? 'group-focus-within:opacity-100' : 'group-focus-within:opacity-70'}`}></div>
              <form className={`relative shadow-xl rounded-[2rem] border focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all backdrop-blur-xl ${uiTheme === 'dark' ? 'bg-slate-900/90 border-slate-700/50 focus-within:border-indigo-500/50' : 'bg-white/90 border-slate-200 focus-within:border-indigo-400 focus-within:bg-white'} overflow-hidden`}>
                <div className="flex">
                  <div className="p-2 border-r border-slate-200/20 dark:border-slate-700/50 flex flex-col items-center justify-end shrink-0">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><ImagePlus size={18} /></button>
                  </div>
                  <textarea
                    value={problem} onChange={(e) => setProblem(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitProblem(e, false); } }}
                    placeholder={t.placeholder} disabled={isLoading}
                    className={`w-full pl-3 pr-2 py-3.5 max-h-24 min-h-[50px] bg-transparent border-none focus:ring-0 resize-none outline-none disabled:opacity-50 text-sm font-medium ${uiTheme === 'dark' ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}`} rows={1}
                  />
                  <div className="p-2 flex flex-col justify-end shrink-0 border-l border-slate-200/20 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={(e) => submitProblem(e, false)} disabled={(!problem.trim() && !imageBase64) || isLoading} className="p-1.5 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white transition-colors shadow-sm"><Calculator size={14} /></button>
                      <button type="button" onClick={(e) => submitProblem(e, true)} disabled={(!problem.trim() && !imageBase64) || isLoading} className="p-1.5 rounded-md bg-pink-500 hover:bg-pink-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white transition-colors shadow-sm"><Sparkles size={14} /></button>
                    </div>
                  </div>
                </div>
                {imageBase64 && (
                  <div className="absolute top-2 left-12 w-10 h-10 rounded-md overflow-hidden border border-indigo-500">
                    <img src={imageBase64} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImageBase64(null)} className="absolute top-0 right-0 bg-red-500 p-0.5 text-white"><X size={8}/></button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[75vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'} ${uiTheme === 'dark' ? 'bg-slate-900 border-t border-slate-700' : 'bg-white border-t border-slate-200'}`}>
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-black tracking-tight flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              {isMobileDrawerOpen === 'syllabus' && <><ListTree size={18} className="text-amber-500"/> Syllabus Boundary</>}
              {isMobileDrawerOpen === 'files' && <><BookOpen size={18} className="text-indigo-500"/> Knowledge Base</>}
              {isMobileDrawerOpen === 'history' && <><History size={18} className="text-indigo-500"/> Solved History</>}
            </h3>
          </div>

          {/* SYLLABUS DRAWER */}
          {isMobileDrawerOpen === 'syllabus' && (
            <div className="pb-10 space-y-4">
              <select value={selectedSyllabusId} onChange={handleSyllabusSelect} className={`w-full border p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50 ${uiTheme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'}`}>
                <option value="">{t.selectCourse}</option>
                {syllabuses.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
              </select>

              {selectedSyllabusId && activeCourse?.chapters && (
                <div className="mt-4">
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.selectChapter}</p>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {activeCourse.chapters.map((chap: any) => (
                      <div key={chap.id} onClick={() => selectChapter(chap.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer text-xs font-bold transition-all border-2 active:scale-95 ${selectedChapterId === chap.id ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : (uiTheme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700')}`}>
                        {selectedChapterId === chap.id ? <CheckCircle2 size={16} className="text-amber-500 shrink-0"/> : <Circle size={16} className="text-slate-400 shrink-0"/>}
                        <span className="truncate">{chap.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedChapterId && activeChapter?.topics && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}><Target size={12}/> {t.selectTopics}</p>
                  <div className="flex flex-wrap gap-2">
                    {activeChapter.topics.map((topic: string, i: number) => (
                      <button key={i} type="button" onClick={() => toggleTopic(topic)} className={`text-[11px] font-black tracking-wide px-3 py-2 rounded-lg border-2 transition-all active:scale-95 ${selectedTopics.includes(topic) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : (uiTheme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')}`}>
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FILES DRAWER */}
          {isMobileDrawerOpen === 'files' && (
            <div className="space-y-2 pb-10">
              {files.length === 0 ? (
                <div className={`text-center mt-4 p-6 border-2 border-dashed rounded-3xl ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}><p className="text-sm text-slate-500 font-medium">No Indexed Notes Found</p></div>
              ) : (
                files.map(file => (
                  <div key={file.id} onClick={() => toggleSourceFile(file.id)}
                    className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all active:scale-95 ${selectedFileIds.includes(file.id) ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : (uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-transparent shadow-sm')}`}
                  >
                    <div className="mt-0.5">{selectedFileIds.includes(file.id) ? <CheckSquare className="text-indigo-500" size={18} /> : <div className={`w-4 h-4 border-2 rounded ${uiTheme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />}</div>
                    <div className="overflow-hidden"><p className={`text-sm font-bold truncate ${selectedFileIds.includes(file.id) ? 'text-indigo-500' : (uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700')}`}>{file.name || file.file_name || 'Untitled'}</p></div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* HISTORY DRAWER */}
          {isMobileDrawerOpen === 'history' && (
            <div className="space-y-3 pb-10">
              {historyList.length === 0 ? (
                <div className={`text-center mt-4 p-6 border-2 border-dashed rounded-3xl ${uiTheme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}><p className="text-sm text-slate-500 font-medium">{t.noHistory}</p></div>
              ) : (
                historyList.map((item) => (
                  <div key={item.id} onClick={() => {
                      setSolution(item.solution_content); setProblem(item.problem_statement); setProcessingImage(null); targetTextRef.current = item.solution_content; triggerWidgetGeneration(item.problem_statement); setActiveSimulation(findMatchingSimulation(item.problem_statement)); setIsMobileDrawerOpen('none'); rightPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-sm ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    <p className={`text-sm font-bold line-clamp-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{item.problem_statement}</p>
                    <p className="text-[10px] font-black text-indigo-500 uppercase mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sticky Done Button */}
          <div className={`sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t ${uiTheme === 'dark' ? 'from-slate-900 via-slate-900 to-transparent' : 'from-white via-white to-transparent'}`}>
            <button onClick={() => setIsMobileDrawerOpen('none')} className={`w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white`}>
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>

    </SecureLayout>
  );
}
