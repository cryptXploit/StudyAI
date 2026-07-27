'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { useAuth } from '@/components/providers/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Radar, Target, UploadCloud, Lock, ShieldAlert, BrainCircuit, History, Calendar, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import { useRouter } from 'next/navigation';
import { showPublicError } from '@/lib/errors/publicError';

export default function ExamOraclePage() {
  const { user } = useAuth();
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();
  const router = useRouter();

  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const [pastPapers, setPastPapers] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [predictions, setPredictions] = useState<any[] | null>(null);
  const isProUser = tier === 'PRO'; // Verify with backend tier
  
  // 🟢 NEW: Async Background States
  const [extractingJobId, setExtractingJobId] = useState<string | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<string[]>([]);
  const [isCooking, setIsCooking] = useState(false);
  
  // 🟢 NEW: History States
  const [activeTab, setActiveTab] = useState<'scanner' | 'history'>('scanner');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(20);

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'config'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = React.useRef(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  // 🟢 Fetch History & Syllabuses on Load
  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchSyllabuses();
    }
  }, [user]);

  // 🟢 Background Polling for Extraction Job
  useEffect(() => {
    if (!extractingJobId) return;
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
        const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/oracle/extract-status/${extractingJobId}` : `${apiUrl}/api/oracle/extract-status/${extractingJobId}`;
        const res = await fetch(fetchUrl, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
        });
        
        if (res.status === 429) {
          console.warn("Rate limited. Waiting for next polling interval.");
          return;
        }
        
        if (res.status === 404) {
          console.error("Job not found on server.");
          setIsCooking(false);
          setExtractingJobId(null);
          clearInterval(interval);
          showPublicError();
          return;
        }

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Invalid JSON during polling:", text);
          return;
        }

        if (data.state === 'completed') {
          setExtractedQuestions(data.result?.questions || []);
          setIsCooking(false);
          setExtractingJobId(null);
          clearInterval(interval);
        } else if (data.state === 'failed') {
          setIsCooking(false);
          setExtractingJobId(null);
          clearInterval(interval);
          showPublicError(data);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 10000); // 10s interval to prevent rate limit
    return () => clearInterval(interval);
  }, [extractingJobId]);

  const fetchSyllabuses = async () => {
    const { data } = await supabase.from('syllabuses').select('*, chapters:syllabus_chapters(*)').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (data) setSyllabuses(data);
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('oracle_history')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setHistoryList(data);
    setIsLoadingHistory(false);
  };

  // 🟢 Enhanced Prediction & Save Logic
  const handleRunOracle = async () => {
    if (!selectedSyllabusId || pastPapers.length === 0 || !user) return;

    if (tier !== 'PRO' && tokens < 20) {
      setRequiredTokensForModal(20);
      setShowTokenModal(true);
      return;
    }
    
    setIsScanning(true);
    setPredictions(null);
    setActiveTab('scanner');
    
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/oracle/predict` : `${apiUrl}/api/oracle/predict`;

      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syllabusId: selectedSyllabusId,
          chapterId: selectedChapterId,
          questions: extractedQuestions
        }),
      });

      if (!res.ok && res.status === 429) {
        throw new Error("Server is busy due to high demand. Please try again in a few moments.");
      }

      let data;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid response from server. Please try again.");
      }

      if (!res.ok) {
        if (data.error === 'INSUFFICIENT_TOKENS') {
          setRequiredTokensForModal(data.required || 20);
          setShowTokenModal(true);
          return;
        }
        throw new Error(data.message || data.error || 'Our AI Study Engine could not complete this request. Please try again in a few moments.');
      }

      const generatedPredictions = data.predictions;
      
      // Save to Supabase History (0 API Cost)
      const syllabusName = syllabuses.find(s => s.id === selectedSyllabusId)?.course_name || 'Unknown Subject';
      
      const { data: savedRecord, error } = await supabase
        .from('oracle_history')
        .insert({
          user_id: user.id,
          syllabus_name: syllabusName,
          predictions: generatedPredictions, // Saves as JSONB
        })
        .select()
        .single();

      if (savedRecord) {
        setHistoryList(prev => [savedRecord, ...prev]);
      }

      setPredictions(generatedPredictions);
      refreshTokens();
    } catch (err: any) {
      showPublicError();
    } finally {
      setIsScanning(false);
    }
  };

  // 🟢 Load past prediction from history
  const loadHistoryItem = (item: any) => {
    setPredictions(item.predictions);
    setActiveTab('scanner');
  };

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] w-full max-w-[1440px] mx-auto overflow-y-auto lg:overflow-hidden lg:border-slate-800 lg:border lg:rounded-3xl shadow-2xl mt-0 lg:mt-4 custom-scrollbar transition-colors duration-500 bg-slate-950 lg:bg-slate-900">
        
        {/* 🟢 LEFT SIDE: CONFIGURATION PANEL (Desktop Only) */}
        <div className="hidden lg:flex lg:w-[35%] lg:border-r border-slate-800 p-5 lg:p-8 flex-col h-auto lg:h-full lg:overflow-y-auto custom-scrollbar relative shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] bg-slate-900 space-y-6">
          
          {/* HERO BANNER (Desktop) */}
          <div className="relative bg-slate-950 rounded-[2rem] p-6 text-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-fuchsia-500/20 shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Radar size={120} className="text-fuchsia-500 animate-spin-slow" style={{ animationDuration: '20s' }} />
            </div>
            <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[200%] bg-gradient-to-br from-fuchsia-600/20 via-transparent to-violet-600/10 pointer-events-none blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-[10px] font-black uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                <Sparkles size={12} /> Premium Feature
              </div>
              <h1 className="text-2xl font-black mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-fuchsia-200 to-violet-300">
                Exam Oracle Engine
              </h1>
              <p className="text-slate-400 font-medium text-xs leading-relaxed">
                Upload past question papers and let our Vector Similarity Engine predict tomorrow's exam topics with terrifying accuracy.
              </p>
            </div>
          </div>
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <Target className="text-fuchsia-500" size={20} /> Matrix Configuration
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">1. Target Syllabus (Course)</label>
                  <select 
                    value={selectedSyllabusId} 
                    onChange={(e) => { setSelectedSyllabusId(e.target.value); setSelectedChapterId(''); }}
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer mb-4"
                  >
                    <option value="">Select an active course...</option>
                    {syllabuses.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
                  </select>

                  {selectedSyllabusId && (
                    <>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 mt-4">2. Specific Chapter (Optional)</label>
                      <select 
                        value={selectedChapterId} 
                        onChange={(e) => setSelectedChapterId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Full Course (All Chapters)</option>
                        {syllabuses.find(s => s.id === selectedSyllabusId)?.chapters?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">3. Feed Past Papers (PDF/JPG/PNG)</label>
                  <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-fuchsia-400 hover:bg-fuchsia-50/50 transition-colors group relative overflow-hidden">
                    {isCooking && <div className="absolute inset-0 bg-fuchsia-50/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex flex-col items-center">
                        <Radar className="text-fuchsia-500 animate-spin mb-2" size={24} />
                        <span className="text-[10px] font-black text-fuchsia-600 tracking-widest uppercase">AI is Cooking... 🍳</span>
                      </div>
                    </div>}
                    <input type="file" multiple accept=".pdf, .jpg, .jpeg, .png" className="hidden" onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files);
                        setPastPapers(files);
                        setIsCooking(true);
                        setExtractedQuestions([]);
                        
                        try {
                          const formData = new FormData();
                          files.forEach(f => formData.append('pastPapers', f));
                          const { data: { session } } = await supabase.auth.getSession();
                          const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
                          const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/oracle/extract` : `${apiUrl}/api/oracle/extract`;
                          const res = await fetch(fetchUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${session?.access_token}` },
                            body: formData,
                          });

                          if (res.status === 429) {
                            showPublicError();
                            setIsCooking(false);
                            return;
                          }

                          let data;
                          try {
                            const text = await res.text();
                            data = JSON.parse(text);
                          } catch (e) {
                            console.error("Invalid JSON during extraction start:", e);
                            showPublicError();
                            setIsCooking(false);
                            return;
                          }

                          if (data.jobId) setExtractingJobId(data.jobId);
                        } catch (err) {
                          console.error("Extraction start failed", err);
                          setIsCooking(false);
                        }
                      }
                    }} />
                    <UploadCloud size={32} className="text-slate-400 group-hover:text-fuchsia-500 mb-2 transition-colors" />
                    <span className="text-xs font-bold text-slate-500">
                      {pastPapers.length > 0 ? `${pastPapers.length} Papers Selected` : 'Click or drag past papers here'}
                    </span>
                  </label>
                </div>

                <button 
                  onClick={handleRunOracle} 
                  disabled={!selectedSyllabusId || pastPapers.length === 0 || isScanning || isCooking || extractedQuestions.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-black tracking-widest uppercase text-xs rounded-2xl shadow-[0_10px_30px_rgba(217,70,239,0.3)] flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isCooking ? 'AI is Cooking... 🍳' : isScanning ? 'Initiating Matrix Scan...' : 'Predict Exam Topics'}
                </button>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex gap-3">
              <ShieldAlert size={20} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wide">
                Disclaimer: Oracle is a statistical probability tool based on vector similarity, not a leaked paper.
              </p>
            </div>
          </div>

          {/* 🟢 RIGHT SIDE: RESULTS & HISTORY BOARD */}
        <div ref={scrollRef} onScroll={handleScroll} className="w-full lg:w-[65%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative lg:overflow-y-auto custom-scrollbar bg-slate-950 lg:bg-slate-950/50">
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-fuchsia-400"><Radar size={16}/> Exam Oracle</h2>
              <p className="text-[9px] font-bold text-fuchsia-500/70 flex items-center gap-1.5 uppercase tracking-widest">Vector Prediction Engine</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col relative pb-40 lg:pb-8 animate-in fade-in zoom-in duration-300 custom-scrollbar">
              
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-50"></div>

              {/* 🟢 TAB NAVIGATION (Scanner vs History) */}
              <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                 <div className="flex gap-4">
                    <button onClick={() => setActiveTab('scanner')} className={`flex items-center gap-2 font-black tracking-widest uppercase text-xs transition-colors ${activeTab === 'scanner' ? 'text-fuchsia-400' : 'text-slate-500 hover:text-slate-300'}`}>
                      <BrainCircuit size={18} /> Current Scan
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 font-black tracking-widest uppercase text-xs transition-colors ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                      <History size={18} /> History Vault
                    </button>
                 </div>
              </div>

              {/* 🟢 CONTENT: HISTORY VAULT */}
              {activeTab === 'history' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
                  {isLoadingHistory ? (
                     <div className="h-full flex items-center justify-center text-slate-500"><Radar className="animate-spin" size={40}/></div>
                  ) : historyList.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500 mt-20">
                        <History size={64} className="mb-4 opacity-20" />
                        <p className="font-bold tracking-widest uppercase text-xs">No Past Scans Found</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {historyList.map((item) => (
                          <div key={item.id} onClick={() => loadHistoryItem(item)} className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl cursor-pointer transition-all group hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                             <div className="flex items-center justify-between mb-3">
                               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1"><Calendar size={12}/> {new Date(item.created_at).toLocaleDateString()}</span>
                               <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                             </div>
                             <h4 className="text-white font-bold text-sm mb-1">{item.syllabus_name}</h4>
                             <p className="text-xs text-slate-500 font-medium">{item.predictions?.length || 0} Topics Predicted</p>
                          </div>
                        ))}
                     </div>
                  )}
                </motion.div>
              )}

              {/* 🟢 CONTENT: CURRENT SCANNER */}
              {activeTab === 'scanner' && (
                <>
                  {!isScanning && !predictions && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 mt-20">
                      <Radar size={64} className="mb-4 opacity-20" />
                      <p className="font-bold tracking-widest uppercase text-xs text-center leading-relaxed">Awaiting Matrix Configuration<br/><span className="text-[10px] text-slate-600">Or load a previous scan from History Vault</span></p>
                    </div>
                  )}

                  {isScanning && (
                    <div className="flex-1 flex flex-col items-center justify-center mt-20">
                      <div className="relative w-32 h-32 mb-8">
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 border-2 border-fuchsia-500 rounded-full"></motion.div>
                        <div className="absolute inset-0 flex items-center justify-center text-fuchsia-500">
                          <Radar size={40} className="animate-spin" />
                        </div>
                      </div>
                      <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="text-fuchsia-400 font-black tracking-widest uppercase text-xs text-center leading-relaxed">
                        Analyzing Vector Distances...<br/>
                        <span className="text-[10px] text-slate-500">Saving securely to History Vault</span>
                      </motion.p>
                    </div>
                  )}

                  {predictions && !isScanning && (
                    <div className="space-y-4">
                      {predictions.map((pred: any, index: number) => {
                        const isHighChance = pred.confidence >= 80;
                        return (
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} key={pred.id} className={`p-5 rounded-2xl border bg-slate-900/50 backdrop-blur-sm relative overflow-hidden group ${isHighChance ? 'border-rose-500/30' : 'border-amber-500/30'}`}>
                            {isHighChance && (
                              <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest rounded-bl-xl border-b border-l border-rose-500/30">
                                High Alert ⚠️
                              </div>
                            )}
                            
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                              <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-white/10 shrink-0 relative overflow-hidden bg-black">
                                {!isProUser ? (
                                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                                     <Lock size={16} className="text-fuchsia-500 mb-1" />
                                     <span className="text-[8px] font-bold text-fuchsia-400 uppercase tracking-widest">Locked</span>
                                   </div>
                                ) : (
                                   <>
                                     <span className={`text-xl font-black ${isHighChance ? 'text-rose-400' : 'text-amber-400'}`}>{pred.confidence}%</span>
                                     <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Chance</span>
                                   </>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-black text-sm md:text-base mb-1 truncate">{pred.topic}</h4>
                                <div className="mt-2">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Most Repeated Format:</p>
                                  {!isProUser ? (
                                    <div className="text-transparent bg-slate-800/80 rounded-md select-none blur-sm text-xs leading-relaxed px-2 py-1">
                                      This is a highly restricted hidden text that shows exactly how the question will appear in the exam.
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-300 bg-slate-800/50 p-2 rounded-md border border-slate-700 leading-relaxed font-medium">"{pred.format}"</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {!isProUser && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 p-6 bg-gradient-to-r from-fuchsia-600/20 to-violet-600/20 rounded-2xl border border-fuchsia-500/30 flex flex-col items-center text-center shadow-[0_0_30px_rgba(217,70,239,0.15)]">
                          <Lock size={32} className="text-fuchsia-400 mb-3" />
                          <h3 className="text-xl font-black text-white mb-2">Decrypt Exact Probabilities</h3>
                          <p className="text-sm font-medium text-slate-300 max-w-md mx-auto mb-6">Unlock Pro to reveal exact percentages, hidden formats, and ensure your victory tonight.</p>
                          <button onClick={() => router.push('/pricing')} className="w-full sm:w-auto px-8 py-3.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.5)] active:scale-95 transition-all">
                            <Sparkles size={16} className="inline mr-2" /> Unlock Oracle Pro
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-3 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            {/* Mobile Action Pills */}
            <div className="flex gap-2 overflow-x-auto mb-3 pointer-events-auto custom-scrollbar-hide px-1 pb-1">
              <button onClick={() => setIsMobileDrawerOpen('config')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${(selectedSyllabusId || pastPapers.length > 0) ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                <Target size={12}/> Config
              </button>
              <button onClick={() => { setActiveTab('history'); window.scrollTo({top:0, behavior:'smooth'}); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${activeTab === 'history' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                <History size={12}/> Vault
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia-500/50 to-violet-500/50 rounded-[2rem] blur-md opacity-70 transition duration-500"></div>
              <div className="relative flex shadow-xl rounded-[2rem] border transition-all backdrop-blur-xl overflow-hidden p-1 bg-slate-900/90 border-slate-700/50">
                <button 
                  onClick={handleRunOracle} 
                  disabled={!selectedSyllabusId || pastPapers.length === 0 || isScanning || isCooking || extractedQuestions.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-black tracking-widest uppercase text-xs rounded-2xl shadow-sm flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isCooking ? 'AI is Cooking... 🍳' : isScanning ? 'Initiating Scan...' : 'Predict Topics'}
                </button>
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
              {isMobileDrawerOpen === 'config' && <><Target size={18} className="text-fuchsia-500"/> Matrix Configuration</>}
            </h3>
          </div>

          {/* CONFIG DRAWER */}
          {isMobileDrawerOpen === 'config' && (
            <div className="space-y-6 pb-20">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">1. Target Syllabus (Course)</label>
                  <select 
                    value={selectedSyllabusId} 
                    onChange={(e) => { setSelectedSyllabusId(e.target.value); setSelectedChapterId(''); }}
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm font-bold text-slate-300 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer mb-4"
                  >
                    <option value="">Select an active course...</option>
                    {syllabuses.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
                  </select>

                  {selectedSyllabusId && (
                    <>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 mt-4">2. Specific Chapter (Optional)</label>
                      <select 
                        value={selectedChapterId} 
                        onChange={(e) => setSelectedChapterId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm font-bold text-slate-300 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Full Course (All Chapters)</option>
                        {syllabuses.find(s => s.id === selectedSyllabusId)?.chapters?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">3. Feed Past Papers (PDF/JPG/PNG)</label>
                  <label className="w-full h-32 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-colors group relative overflow-hidden">
                    {isCooking && <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex flex-col items-center">
                        <Radar className="text-fuchsia-500 animate-spin mb-2" size={24} />
                        <span className="text-[10px] font-black text-fuchsia-400 tracking-widest uppercase">AI is Cooking... 🍳</span>
                      </div>
                    </div>}
                    <input type="file" multiple accept=".pdf, .jpg, .jpeg, .png" className="hidden" onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files);
                        setPastPapers(files);
                        setIsCooking(true);
                        setExtractedQuestions([]);
                        
                        try {
                          const formData = new FormData();
                          files.forEach(f => formData.append('pastPapers', f));
                          const { data: { session } } = await supabase.auth.getSession();
                          const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
                          const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/oracle/extract` : `${apiUrl}/api/oracle/extract`;
                          const res = await fetch(fetchUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${session?.access_token}` },
                            body: formData,
                          });

                          if (res.status === 429) {
                            showPublicError();
                            setIsCooking(false);
                            return;
                          }

                          let data;
                          try {
                            const text = await res.text();
                            data = JSON.parse(text);
                          } catch (e) {
                            console.error("Invalid JSON during extraction start:", e);
                            showPublicError();
                            setIsCooking(false);
                            return;
                          }

                          if (data.jobId) setExtractingJobId(data.jobId);
                        } catch (err) {
                          console.error("Extraction start failed", err);
                          setIsCooking(false);
                        }
                      }
                    }} />
                    <UploadCloud size={32} className="text-slate-500 group-hover:text-fuchsia-500 mb-2 transition-colors" />
                    <span className="text-xs font-bold text-slate-400">
                      {pastPapers.length > 0 ? `${pastPapers.length} Papers Selected` : 'Click or tap to upload'}
                    </span>
                  </label>
                </div>
            </div>
          )}

          {/* Sticky Done Button */}
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
