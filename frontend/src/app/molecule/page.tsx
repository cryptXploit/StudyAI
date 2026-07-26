'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Beaker, Sparkles, Loader2, Save, CheckCircle2, History, Search, FlaskConical, Dna, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    chemLab: "3D Chemistry Lab",
    labDesc: "Visualize molecules and crystals in interactive 3D.",
    searchPlaceholder: "Enter chemical name (e.g., Caffeine, Dopamine)...",
    visualize: "Visualize",
    properties: "Chemical Properties",
    formula: "Molecular Formula",
    weight: "Molecular Weight",
    iupac: "IUPAC Name",
    smiles: "SMILES",
    aiInsight: "AI Assistant Insight",
    saveToLab: "Save to Lab Book",
    saved: "Saved!",
    labBook: "Your Lab Book",
    noSaved: "No molecules saved yet.",
    styles: "View Styles",
    stick: "Stick",
    sphere: "Sphere",
    ballAndStick: "Ball & Stick",
    fetching: "Fetching data from PubChem...",
    notFound: "Compound not found. Please check the spelling.",
    autoSpin: "Auto Spin"
  },
  Bangla: {
    chemLab: "থ্রিডি কেমিস্ট্রি ল্যাব",
    labDesc: "অণু ও ক্রিস্টালগুলো ইন্টারঅ্যাকটিভ থ্রিডিতে দেখুন।",
    searchPlaceholder: "রাসায়নিক নাম লিখুন (যেমন: Caffeine, Glucose)...",
    visualize: "ভিজ্যুয়ালাইজ করুন",
    properties: "রাসায়নিক বৈশিষ্ট্য",
    formula: "আণবিক সংকেত",
    weight: "আণবিক ভর",
    iupac: "IUPAC নাম",
    smiles: "SMILES কোড",
    aiInsight: "এআই অ্যাসিস্ট্যান্ট ইনসাইট",
    saveToLab: "ল্যাব বুকে সেভ করুন",
    saved: "সেভ হয়েছে!",
    labBook: "আপনার ল্যাব বুক",
    noSaved: "কোনো অণু সেভ করা নেই।",
    styles: "ভিউ স্টাইল",
    stick: "স্টিক",
    sphere: "স্ফিয়ার",
    ballAndStick: "বল ও স্টিক",
    fetching: "PubChem থেকে ডেটা আনা হচ্ছে...",
    notFound: "যৌগটি পাওয়া যায়নি। বানান ঠিক আছে কিনা চেক করুন।",
    autoSpin: "অটো স্পিন"
  },
  Hindi: {
    chemLab: "3D रसायन विज्ञान प्रयोगशाला",
    labDesc: "अणुओं और क्रिस्टल को इंटरैक्टिव 3D में देखें।",
    searchPlaceholder: "रासायनिक नाम दर्ज करें (उदा. Caffeine, Glucose)...",
    visualize: "कल्पना करें",
    properties: "रासायनिक गुण",
    formula: "आणविक सूत्र",
    weight: "आणविक भार",
    iupac: "IUPAC नाम",
    smiles: "SMILES कोड",
    aiInsight: "AI सहायक जानकारी",
    saveToLab: "लैब बुक में सहेजें",
    saved: "सहेजा गया!",
    labBook: "आपकी लैब बुक",
    noSaved: "कोई अणु सहेजा नहीं गया।",
    styles: "दृश्य शैलियाँ",
    stick: "स्टिक",
    sphere: "गोला (Sphere)",
    ballAndStick: "गेंद और स्टिक",
    fetching: "पबकेम से डेटा लाया जा रहा है...",
    notFound: "यौगिक नहीं मिला। कृपया वर्तनी जांचें।",
    autoSpin: "ऑटो स्पिन"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

interface CompoundData {
  cid: string;
  name: string;
  formula: string;
  weight: string;
  iupac: string;
  smiles: string;
}

// 🟢 1. BUNDLE SIZE BLOAT FIX (Code Splitting): 
// 3D Engine will NOT load initially. It only loads when user actually searches a molecule.
const Molecule3DViewer = dynamic(() => import('@/components/MoleculeViewer'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] md:h-[500px] flex flex-col items-center justify-center bg-slate-50 text-teal-500 rounded-2xl">
      <Loader2 size={40} className="animate-spin mb-4" />
      <p className="font-mono text-xs uppercase tracking-widest font-bold">Initializing WebGL Engine...</p>
    </div>
  )
});

export default function MoleculePage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const contextParam = searchParams.get('context');

  useEffect(() => {
    if (contextParam) setSearchQuery(contextParam);
  }, [contextParam]);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [compound, setCompound] = useState<CompoundData | null>(null);
  const [aiInsight, setAiInsight] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  const [historyList, setHistoryList] = useState<any[]>([]);
  const [is3DmolReady, setIs3DmolReady] = useState(false);
  const [currentStyle, setCurrentStyle] = useState('ballAndStick');
  const [isSpinning, setIsSpinning] = useState(false);

  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  // 🟢 MOBILE UI STATES
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'labbook'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    fetchHistory();

    const loadLanguage = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };
    loadLanguage();
    window.addEventListener('languageChanged', loadLanguage);

    if (!document.getElementById('3dmol-script')) {
      const script = document.createElement('script');
      script.id = '3dmol-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.4.2/3Dmol-min.js';
      script.onload = () => setIs3DmolReady(true);
      document.body.appendChild(script);
    } else {
      setIs3DmolReady(true);
    }

    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  // 🟢 2. AGGRESSIVE CLIENT CACHING (API Spamming Fix)
  const fetchHistory = async () => {
    // A. Instant UI render from cache
    const cachedHistory = sessionStorage.getItem('Prepia_molecule_history');
    if (cachedHistory) {
      setHistoryList(JSON.parse(cachedHistory));
    }

    // B. Background Sync without blocking UI
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase.from('saved_molecules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (data) {
      setHistoryList(data);
      sessionStorage.setItem('Prepia_molecule_history', JSON.stringify(data));
    }
  };

  const handleSearch = async (e?: React.FormEvent, directName?: string) => {
    if (e) e.preventDefault();
    const query = directName || searchQuery;
    if (!query.trim()) return;

    if (compound && compound.name.toLowerCase() === query.trim().toLowerCase()) return;

    setIsLoading(true);
    setErrorMsg('');
    setAiInsight('');
    setIsSaved(false);
    setIsSpinning(false); 

    // 🟢 CONNECTION PROTECTOR: 15s Timeout for PubChem API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
      const pubChemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query.trim())}/property/MolecularFormula,MolecularWeight,IUPACName,SMILES/JSON`;
      const response = await fetch(pubChemUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error("Compound not found");
      
      const data = await response.json();
      const props = data.PropertyTable.Properties[0];
      
      const newCompound = {
        cid: props.CID.toString(),
        name: query.trim(),
        formula: props.MolecularFormula,
        weight: props.MolecularWeight,
        iupac: props.IUPACName,
        smiles: props.SMILES
      };

      setCompound(newCompound);
      setSearchQuery(''); 
      
      // 🟢 Reset URL for clean UI after generation
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      fetchAiInsight(newCompound.name);

    } catch (err: any) {
      setCompound(null); 
      if (err.name === 'AbortError') {
        setErrorMsg("Network Timeout: PubChem is not responding. Try again.");
      } else {
        setErrorMsg(t.notFound);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiInsight = async (name: string) => {
    setIsInsightLoading(true);
    
    // 🟢 CONNECTION PROTECTOR: 30s Timeout for AI Backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/molecule/insight` : `${apiUrl}/api/molecule/insight`;

      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ compoundName: name, language }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (res.status === 402) {
        const errData = await res.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 15);
            setShowTokenModal(true);
            setAiInsight("⚠️ Not enough tokens to generate new AI insight. You can still view the 3D model.");
            return;
        }
      }

      const data = await res.json();
      
      if (data && data.insight) {
          setAiInsight(data.insight);
          refreshTokens(); // Refresh in case tokens were deducted
      } else if (data && data.error) {
          console.error("Backend AI Error:", data.error);
          setAiInsight(`⚠️ Error: ${data.error}`);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setAiInsight("⚠️ Connection timeout: AI Assistant took too long to respond.");
      } else {
        console.error("AI Insight Error:", e);
        setAiInsight("⚠️ Connection error to AI Assistant.");
      }
    } finally {
      setIsInsightLoading(false);
    }
  };

  const saveToLabBook = async () => {
    if (!compound) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('saved_molecules').insert([{
        user_id: user.id,
        compound_name: compound.name,
        cid: compound.cid,
        formula: compound.formula,
        weight: compound.weight
      }]);
      
      setIsSaved(true);
      sessionStorage.removeItem('Prepia_molecule_history'); // 🟢 Bust Cache
      fetchHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMolecule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('saved_molecules').delete().eq('id', id);
    sessionStorage.removeItem('Prepia_molecule_history'); // 🟢 Bust Cache
    fetchHistory();
  };

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-50 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-white bg-slate-950 lg:border lg:border-slate-200 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">
        
        {/* Left Sidebar: Lab Book (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-80 bg-white border-r border-slate-200 p-5 flex-col h-full shrink-0">
          <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-2xl">
            <h2 className="text-teal-600 font-black flex items-center gap-2 text-lg"><Beaker size={20}/> {t.chemLab}</h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">{t.labDesc}</p>
          </div>

          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <History size={14} className="text-teal-500" /> {t.labBook}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {historyList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center mt-6">{t.noSaved}</p>
            ) : (
              historyList.map(item => (
                <div key={item.id} onClick={() => handleSearch(undefined, item.compound_name)} className="group p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-teal-400 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 text-sm truncate uppercase tracking-wide">{item.compound_name}</h4>
                    <button onClick={(e) => deleteMolecule(item.id, e)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs font-bold text-slate-500">
                    <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">{item.formula}</span>
                    <span>{item.weight} g/mol</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-950 lg:bg-slate-50">
          
          {/* Top Search Bar (Desktop) */}
          <div className="hidden lg:flex p-6 border-b border-slate-200 bg-white z-10 shadow-sm flex-col lg:flex-row gap-4 items-center">
            <button onClick={() => router.push('/chat')} className="flex shrink-0 items-center gap-2 px-4 py-3 font-black rounded-xl transition uppercase tracking-wider text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">💬 Back to AI Chat</button>
            <form onSubmit={(e) => handleSearch(e)} className="flex gap-4 items-center flex-1 w-full max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder={t.searchPlaceholder} 
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none font-bold placeholder:font-medium transition-all" 
                />
              </div>
              <button type="submit" disabled={isLoading || !searchQuery.trim()} className="flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black rounded-xl transition shadow-lg whitespace-nowrap">
                {isLoading ? <Loader2 size={18} className="animate-spin"/> : <FlaskConical size={18}/>}
                {t.visualize}
              </button>
            </form>
            {errorMsg && <p className="text-red-500 text-sm font-bold text-center mt-3 w-full">{errorMsg}</p>}
          </div>

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-teal-500"><Beaker size={16}/> {t.chemLab}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.labDesc}</p>
            </div>
            <button onClick={() => router.push('/chat')} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">Chat</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar p-4 lg:p-6 pb-40">
            {!compound && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60 animate-in zoom-in duration-500">
                <Dna size={80} className="text-slate-300 mb-6" />
                <h3 className="text-3xl font-black text-slate-400">{t.chemLab}</h3>
                <p className="text-slate-500 mt-2 max-w-sm">{t.labDesc}</p>
              </div>
            ) : isLoading && !compound ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-teal-600 mb-4" size={48} />
                <p className="text-slate-500 font-bold">{t.fetching}</p>
              </div>
            ) : compound ? (
              <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                
                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-slate-900 lg:bg-white p-2 rounded-3xl shadow-sm border border-slate-800 lg:border-slate-200">
                    <Molecule3DViewer 
                       cid={compound.cid} 
                       style={currentStyle} 
                       spin={isSpinning} 
                       isReady={is3DmolReady} 
                    />
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 lg:bg-white rounded-2xl border border-slate-800 lg:border-slate-200 shadow-sm">
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 lg:text-slate-400 mr-2 self-center">{t.styles}</span>
                      <button onClick={() => setCurrentStyle('stick')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentStyle === 'stick' ? 'bg-teal-500/20 lg:bg-teal-100 text-teal-400 lg:text-teal-700' : 'bg-slate-800 lg:bg-slate-100 text-slate-400 lg:text-slate-600 hover:bg-slate-700 lg:hover:bg-slate-200'}`}>{t.stick}</button>
                      <button onClick={() => setCurrentStyle('sphere')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentStyle === 'sphere' ? 'bg-teal-500/20 lg:bg-teal-100 text-teal-400 lg:text-teal-700' : 'bg-slate-800 lg:bg-slate-100 text-slate-400 lg:text-slate-600 hover:bg-slate-700 lg:hover:bg-slate-200'}`}>{t.sphere}</button>
                      <button onClick={() => setCurrentStyle('ballAndStick')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${currentStyle === 'ballAndStick' ? 'bg-teal-500/20 lg:bg-teal-100 text-teal-400 lg:text-teal-700' : 'bg-slate-800 lg:bg-slate-100 text-slate-400 lg:text-slate-600 hover:bg-slate-700 lg:hover:bg-slate-200'}`}>{t.ballAndStick}</button>
                    </div>
                    <button onClick={() => setIsSpinning(!isSpinning)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${isSpinning ? 'bg-indigo-500/20 lg:bg-indigo-100 text-indigo-400 lg:text-indigo-700' : 'bg-slate-800 lg:bg-slate-100 text-slate-400 lg:text-slate-600 hover:bg-slate-700 lg:hover:bg-slate-200'}`}>
                      {t.autoSpin}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900 lg:bg-white p-6 rounded-3xl border border-slate-800 lg:border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-2xl font-black text-slate-200 lg:text-slate-800 uppercase tracking-tight">{compound.name}</h3>
                      <button 
                        onClick={saveToLabBook} 
                        disabled={isSaved || isSaving}
                        className={`p-2 rounded-xl transition ${isSaved ? 'bg-emerald-500/20 lg:bg-emerald-100 text-emerald-400 lg:text-emerald-600' : 'bg-slate-800 lg:bg-slate-100 text-slate-400 lg:text-slate-500 hover:bg-teal-500/20 hover:text-teal-400 lg:hover:bg-teal-100 lg:hover:text-teal-600'}`}
                        title={t.saveToLab}
                      >
                        {isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />}
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-black tracking-widest text-slate-500 lg:text-slate-400 uppercase mb-1">{t.formula}</p>
                        <p className="font-bold text-teal-400 lg:text-teal-600 text-lg bg-teal-500/10 lg:bg-teal-50 px-3 py-1.5 rounded-lg inline-block">{compound.formula}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black tracking-widest text-slate-500 lg:text-slate-400 uppercase mb-1">{t.weight}</p>
                        <p className="font-bold text-slate-300 lg:text-slate-700">{compound.weight} g/mol</p>
                      </div>
                      <div>
                        <p className="text-xs font-black tracking-widest text-slate-500 lg:text-slate-400 uppercase mb-1">{t.iupac}</p>
                        <div className="max-h-20 overflow-y-auto custom-scrollbar pr-1">
                          <p className="font-medium text-sm text-slate-400 lg:text-slate-600 leading-relaxed break-words">{compound.iupac}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-black tracking-widest text-slate-500 lg:text-slate-400 uppercase mb-1">{t.smiles}</p>
                        <div className="max-h-24 overflow-y-auto custom-scrollbar bg-slate-950 lg:bg-slate-50 p-2 rounded-lg border border-slate-800 lg:border-slate-100">
                          <p className="font-mono text-xs text-slate-500 break-all">{compound.smiles}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-lg border border-slate-700 text-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60} /></div>
                    <h4 className="flex items-center gap-2 text-indigo-400 font-black mb-4 uppercase tracking-widest text-xs">
                      <Sparkles size={16} /> {t.aiInsight}
                    </h4>
                    
                    {isInsightLoading ? (
                      <div className="flex items-center gap-3 text-slate-400 font-medium py-4">
                        <Loader2 size={18} className="animate-spin" /> Fetching interesting facts...
                      </div>
                    ) : aiInsight ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:marker:text-indigo-400">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}>{aiInsight}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No insights available.</p>
                    )}
                  </div>

                </div>
              </div>
            ) : null}
          </div>

          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            <div className="w-full max-w-md flex flex-col pointer-events-auto">
              {/* Mobile Action Pills */}
              <div className="flex gap-2 overflow-x-auto mb-3 px-1 pb-1 custom-scrollbar-hide">
                <button onClick={() => setIsMobileDrawerOpen('labbook')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/80 border-slate-700 text-slate-400">
                  <History size={12}/> {t.labBook}
                </button>
              </div>

              <form onSubmit={handleSearch} className="relative group mx-1">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/50 to-emerald-500/50 rounded-[2rem] blur-md opacity-70 transition duration-500 group-focus-within:opacity-100"></div>
                <div className="relative flex shadow-xl rounded-[2rem] border transition-all backdrop-blur-xl overflow-hidden p-1 bg-slate-900/90 border-slate-700/50 focus-within:border-teal-500 focus-within:bg-slate-900">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="e.g. Caffeine..."
                    disabled={isLoading}
                    className="w-full pl-4 pr-12 py-3.5 bg-transparent border-none focus:ring-0 outline-none disabled:opacity-50 text-[15px] font-medium text-white placeholder:text-slate-500"
                  />
                  <button type="submit" disabled={isLoading || !searchQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-teal-400 disabled:opacity-50 active:scale-95 transition-transform">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
        <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <History size={18} className="text-teal-400"/> {t.labBook}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-20 custom-scrollbar">
            {historyList.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noSaved}</p>
            ) : (
              historyList.map(item => (
                <div key={item.id} onClick={() => { handleSearch(undefined, item.compound_name); setIsMobileDrawerOpen('none'); }} className="group p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-teal-500 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-200 text-sm truncate uppercase tracking-wide">{item.compound_name}</h4>
                    <button onClick={(e) => deleteMolecule(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs font-bold text-slate-500">
                    <span className="text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-md">{item.formula}</span>
                    <span>{item.weight} g/mol</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
            <button onClick={() => setIsMobileDrawerOpen('none')} className="w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
              <CheckCircle2 size={16}/> Done
            </button>
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
