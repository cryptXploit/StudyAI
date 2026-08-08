'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { useAuth } from '@/components/providers/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Radar, Target, UploadCloud, Lock, ShieldAlert, BrainCircuit, History, Calendar, ChevronRight, CheckCircle2, Check } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import { useRouter } from 'next/navigation';
import { showPublicError } from '@/lib/errors/publicError';
import { fetchUserFiles, File as DBFile } from '@/services/dashboard.service';

const translations = {
  English: {
    premiumFeature: "Premium Feature",
    examOracleEngine: "Exam Oracle Engine",
    oracleDescription: "Upload past question papers and let our Vector Similarity Engine predict tomorrow's exam topics with terrifying accuracy.",
    matrixConfig: "Matrix Configuration",
    targetSyllabus: "1. Target Syllabus (Course)",
    selectActiveCourse: "Select an active course...",
    specificChapter: "2. Specific Chapter (Optional)",
    fullCourse: "Full Course (All Chapters)",
    feedPastPapers: "3. Select from Sources",
    aiIsCooking: "AI is Cooking... 🍳",
    papersSelected: "Sources Selected",
    clickOrDrag: "Select one or more source files",
    initiatingScan: "Initiating Matrix Scan...",
    predictExamTopics: "Predict Exam Topics",
    initiatingMobileScan: "Initiating Scan...",
    predictTopics: "Predict Topics",
    disclaimer: "Disclaimer: Oracle is a statistical probability tool based on vector similarity, not a leaked paper.",
    examOracle: "Exam Oracle",
    vectorPredictionEngine: "Vector Prediction Engine",
    currentScan: "Current Scan",
    historyVault: "History Vault",
    noPastScans: "No Past Scans Found",
    topicsPredicted: "Topics Predicted",
    awaitingConfig: "Awaiting Matrix Configuration",
    orLoadPrevious: "Or load a previous scan from History Vault",
    analyzingDistances: "Analyzing Vector Distances...",
    savingSecurely: "Saving securely to History Vault",
    highAlert: "High Alert ⚠️",
    locked: "Locked",
    chance: "Chance",
    mostRepeatedFormat: "Most Repeated Format:",
    highlyRestricted: "This is a highly restricted hidden text that shows exactly how the question will appear in the exam.",
    decryptExactProbabilities: "Decrypt Exact Probabilities",
    unlockProDesc: "Unlock Pro to reveal exact percentages, hidden formats, and ensure your victory tonight.",
    unlockOraclePro: "Unlock Oracle Pro",
    config: "Config",
    vault: "Vault",
    clickOrTap: "Click or tap to upload",
    done: "Done"
  },
  Bangla: {
    premiumFeature: "প্রিমিয়াম ফিচার",
    examOracleEngine: "এক্সাম ওরাকল ইঞ্জিন",
    oracleDescription: "বিগত বছরের প্রশ্নপত্র আপলোড করুন এবং আমাদের ভেক্টর সিমিলারিটি ইঞ্জিনকে আগামীকালের পরীক্ষার টপিক নির্ভুলভাবে প্রেডিক্ট করতে দিন।",
    matrixConfig: "ম্যাট্রিক্স কনফিগারেশন",
    targetSyllabus: "১. টার্গেট সিলেবাস (কোর্স)",
    selectActiveCourse: "একটি সক্রিয় কোর্স নির্বাচন করুন...",
    specificChapter: "২. নির্দিষ্ট অধ্যায় (ঐচ্ছিক)",
    fullCourse: "সম্পূর্ণ কোর্স (সব অধ্যায়)",
    feedPastPapers: "৩. সোর্স থেকে সিলেক্ট করুন",
    aiIsCooking: "এআই প্রসেস করছে... 🍳",
    papersSelected: "টি সোর্স নির্বাচিত",
    clickOrDrag: "একাধিক সোর্স ফাইল সিলেক্ট করুন",
    initiatingScan: "ম্যাট্রিক্স স্ক্যান শুরু হচ্ছে...",
    predictExamTopics: "পরীক্ষার টপিক প্রেডিক্ট করুন",
    initiatingMobileScan: "স্ক্যান শুরু হচ্ছে...",
    predictTopics: "টপিক প্রেডিক্ট করুন",
    disclaimer: "সতর্কীকরণ: ওরাকল ভেক্টর সিমিলারিটির উপর ভিত্তি করে একটি পরিসংখ্যানগত সম্ভাবনা টুল, এটি ফাঁস হওয়া প্রশ্ন নয়।",
    examOracle: "এক্সাম ওরাকল",
    vectorPredictionEngine: "ভেক্টর প্রেডিকশন ইঞ্জিন",
    currentScan: "বর্তমান স্ক্যান",
    historyVault: "হিস্ট্রি ভল্ট",
    noPastScans: "কোনো পূর্ববর্তী স্ক্যান পাওয়া যায়নি",
    topicsPredicted: "টপিক প্রেডিক্ট করা হয়েছে",
    awaitingConfig: "ম্যাট্রিক্স কনফিগারেশনের অপেক্ষায়",
    orLoadPrevious: "অথবা হিস্ট্রি ভল্ট থেকে পূর্ববর্তী স্ক্যান লোড করুন",
    analyzingDistances: "ভেক্টর ডিস্ট্যান্স বিশ্লেষণ করা হচ্ছে...",
    savingSecurely: "হিস্ট্রি ভল্টে নিরাপদে সংরক্ষণ করা হচ্ছে",
    highAlert: "উচ্চ সতর্কতা ⚠️",
    locked: "লকড",
    chance: "সম্ভাবনা",
    mostRepeatedFormat: "সবচেয়ে বেশি রিপিট হওয়া ফরম্যাট:",
    highlyRestricted: "এটি একটি অত্যন্ত সীমাবদ্ধ লুকানো পাঠ্য যা দেখায় ঠিক কীভাবে পরীক্ষার প্রশ্নটি আসবে।",
    decryptExactProbabilities: "সঠিক সম্ভাবনাগুলি ডিক্রিপ্ট করুন",
    unlockProDesc: "সঠিক শতাংশ এবং গোপন ফরম্যাটগুলো প্রকাশ করতে প্রো আনলক করুন, এবং আজ রাতে আপনার বিজয় নিশ্চিত করুন।",
    unlockOraclePro: "ওরাকল প্রো আনলক করুন",
    config: "কনফিগ",
    vault: "ভল্ট",
    clickOrTap: "আপলোড করতে ক্লিক বা ট্যাপ করুন",
    done: "সম্পন্ন"
  },
  Hindi: {
    premiumFeature: "प्रीमियम फ़ीचर",
    examOracleEngine: "एग्जाम ओरेकल इंजन",
    oracleDescription: "पिछले वर्षों के प्रश्न पत्र अपलोड करें और हमारे वेक्टर सिमिलैरिटी इंजन को कल की परीक्षा के विषयों की सटीक भविष्यवाणी करने दें।",
    matrixConfig: "मैट्रिक्स कॉन्फ़िगरेशन",
    targetSyllabus: "1. टारगेट सिलेबस (कोर्स)",
    selectActiveCourse: "एक सक्रिय कोर्स चुनें...",
    specificChapter: "2. विशिष्ट अध्याय (वैकल्पिक)",
    fullCourse: "पूरा कोर्स (सभी अध्याय)",
    feedPastPapers: "3. स्रोत से चुनें",
    aiIsCooking: "एआई प्रोसेस कर रहा है... 🍳",
    papersSelected: "स्रोत चुने गए",
    clickOrDrag: "एक या अधिक स्रोत फ़ाइलें चुनें",
    initiatingScan: "मैट्रिक्स स्कैन शुरू हो रहा है...",
    predictExamTopics: "परीक्षा के विषयों की भविष्यवाणी करें",
    initiatingMobileScan: "स्कैन शुरू हो रहा है...",
    predictTopics: "विषयों की भविष्यवाणी करें",
    disclaimer: "अस्वीकरण: ओरेकल वेक्टर सिमिलैरिटी पर आधारित एक सांख्यिकीय संभावना उपकरण है, लीक पेपर नहीं।",
    examOracle: "एग्जाम ओरेकल",
    vectorPredictionEngine: "वेक्टर प्रेडिक्शन इंजन",
    currentScan: "वर्तमान स्कैन",
    historyVault: "हिस्ट्री वॉल्ट",
    noPastScans: "कोई पिछला स्कैन नहीं मिला",
    topicsPredicted: "विषयों की भविष्यवाणी की गई",
    awaitingConfig: "मैट्रिक्स कॉन्फ़िगरेशन की प्रतीक्षा में",
    orLoadPrevious: "या हिस्ट्री वॉल्ट से पिछला स्कैन लोड करें",
    analyzingDistances: "वेक्टर दूरी का विश्लेषण किया जा रहा है...",
    savingSecurely: "हिस्ट्री वॉल्ट में सुरक्षित रूप से सहेजा जा रहा है",
    highAlert: "हाई अलर्ट ⚠️",
    locked: "लॉक्ड",
    chance: "संभावना",
    mostRepeatedFormat: "सबसे अधिक दोहराया जाने वाला प्रारूप:",
    highlyRestricted: "यह एक अत्यधिक प्रतिबंधित छिपा हुआ टेक्स्ट है जो दिखाता है कि परीक्षा में प्रश्न कैसा दिखेगा।",
    decryptExactProbabilities: "सटीक संभावनाओं को डिक्रिप्ट करें",
    unlockProDesc: "सटीक प्रतिशत, छिपे हुए प्रारूपों को प्रकट करने के लिए प्रो को अनलॉक करें और आज रात अपनी जीत सुनिश्चित करें।",
    unlockOraclePro: "ओरेकल प्रो अनलॉक करें",
    config: "कॉन्फ़िगरेशन",
    vault: "वॉल्ट",
    clickOrTap: "अपलोड करने के लिए क्लिक या टैप करें",
    done: "संपन्न"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function ExamOraclePage() {
  const { user } = useAuth();
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();
  const router = useRouter();

  const [language, setLanguage] = useState<LanguageType>('English');

  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const [userFiles, setUserFiles] = useState<DBFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [predictions, setPredictions] = useState<any[] | null>(null);
  const isProUser = tier === 'PRO'; // Verify with backend tier
  
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

  useEffect(() => {
    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as LanguageType);
  }, []);

  // 🟢 Fetch User Files for Selection
  const loadFiles = async () => {
    if (user?.id) {
      try {
        const files = await fetchUserFiles(user.id);
        // Only allow selecting files that are completely chunked and ready
        setUserFiles(files.filter(f => f.status === 'chunking_complete' || f.status === 'indexed'));
      } catch (err) {
        console.error("Failed to load user files for Oracle", err);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchSyllabuses();
      loadFiles();
    }
  }, [user]);

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
    if (!selectedSyllabusId || selectedFileIds.length === 0 || !user) return;

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
          fileIds: selectedFileIds,
          language: language
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

  const t = translations[language];

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
                <Sparkles size={12} /> {t.premiumFeature}
              </div>
              <h1 className="text-2xl font-black mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-fuchsia-200 to-violet-300">
                {t.examOracleEngine}
              </h1>
              <p className="text-slate-400 font-medium text-xs leading-relaxed">
                {t.oracleDescription}
              </p>
            </div>
          </div>
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <Target className="text-fuchsia-500" size={20} /> {t.matrixConfig}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t.targetSyllabus}</label>
                  <select 
                    value={selectedSyllabusId} 
                    onChange={(e) => { setSelectedSyllabusId(e.target.value); setSelectedChapterId(''); }}
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer mb-4"
                  >
                    <option value="">{t.selectActiveCourse}</option>
                    {syllabuses.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
                  </select>

                  {selectedSyllabusId && (
                    <>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 mt-4">{t.specificChapter}</label>
                      <select 
                        value={selectedChapterId} 
                        onChange={(e) => setSelectedChapterId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer"
                      >
                        <option value="">{t.fullCourse}</option>
                        {syllabuses.find(s => s.id === selectedSyllabusId)?.chapters?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t.feedPastPapers}</label>
                  <div className="w-full max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50 custom-scrollbar space-y-1">
                    {userFiles.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-slate-400">
                        {t.clickOrDrag} (No sources found in Dashboard)
                      </div>
                    ) : (
                      userFiles.map(file => {
                        const isSelected = selectedFileIds.includes(file.id);
                        return (
                          <div 
                            key={file.id} 
                            onClick={() => {
                              setSelectedFileIds(prev => 
                                isSelected ? prev.filter(id => id !== file.id) : [...prev, file.id]
                              );
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-fuchsia-50 border-fuchsia-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-100'}`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <CheckCircle2 size={12} />}
                            </div>
                            <span className={`text-sm font-bold truncate flex-1 ${isSelected ? 'text-fuchsia-700' : 'text-slate-600'}`}>
                              {file.name || 'Untitled Source'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleRunOracle} 
                  disabled={!selectedSyllabusId || selectedFileIds.length === 0 || isScanning}
                  className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-black tracking-widest uppercase text-xs rounded-2xl shadow-[0_10px_30px_rgba(217,70,239,0.3)] flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isScanning ? t.initiatingScan : t.predictExamTopics}
                </button>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex gap-3">
              <ShieldAlert size={20} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wide">
                {t.disclaimer}
              </p>
            </div>
          </div>

          {/* 🟢 RIGHT SIDE: RESULTS & HISTORY BOARD */}
        <div ref={scrollRef} onScroll={handleScroll} className="w-full lg:w-[65%] flex flex-col min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-full relative lg:overflow-y-auto custom-scrollbar bg-slate-950 lg:bg-slate-950/50">
          
          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-20 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-fuchsia-400"><Radar size={16}/> {t.examOracle}</h2>
              <p className="text-[9px] font-bold text-fuchsia-500/70 flex items-center gap-1.5 uppercase tracking-widest">{t.vectorPredictionEngine}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col relative pb-40 lg:pb-8 animate-in fade-in zoom-in duration-300 custom-scrollbar">
              
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-50"></div>

              {/* 🟢 TAB NAVIGATION (Scanner vs History) */}
              <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                 <div className="flex gap-4">
                    <button onClick={() => setActiveTab('scanner')} className={`flex items-center gap-2 font-black tracking-widest uppercase text-xs transition-colors ${activeTab === 'scanner' ? 'text-fuchsia-400' : 'text-slate-500 hover:text-slate-300'}`}>
                      <BrainCircuit size={18} /> {t.currentScan}
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 font-black tracking-widest uppercase text-xs transition-colors ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                      <History size={18} /> {t.historyVault}
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
                        <p className="font-bold tracking-widest uppercase text-xs">{t.noPastScans}</p>
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
                             <p className="text-xs text-slate-500 font-medium">{item.predictions?.length || 0} {t.topicsPredicted}</p>
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
                      <p className="font-bold tracking-widest uppercase text-xs text-center leading-relaxed">{t.awaitingConfig}<br/><span className="text-[10px] text-slate-600">{t.orLoadPrevious}</span></p>
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
                        {t.analyzingDistances}<br/>
                        <span className="text-[10px] text-slate-500">{t.savingSecurely}</span>
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
                                {t.highAlert}
                              </div>
                            )}
                            
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                              <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-white/10 shrink-0 relative overflow-hidden bg-black">
                                {!isProUser ? (
                                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                                     <Lock size={16} className="text-fuchsia-500 mb-1" />
                                     <span className="text-[8px] font-bold text-fuchsia-400 uppercase tracking-widest">{t.locked}</span>
                                   </div>
                                ) : (
                                   <>
                                     <span className={`text-xl font-black ${isHighChance ? 'text-rose-400' : 'text-amber-400'}`}>{pred.confidence}%</span>
                                     <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{t.chance}</span>
                                   </>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-black text-sm md:text-base mb-1 truncate">{pred.topic}</h4>
                                <div className="mt-2">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{t.mostRepeatedFormat}</p>
                                  {!isProUser ? (
                                    <div className="text-transparent bg-slate-800/80 rounded-md select-none blur-sm text-xs leading-relaxed px-2 py-1">
                                      {t.highlyRestricted}
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
                          <h3 className="text-xl font-black text-white mb-2">{t.decryptExactProbabilities}</h3>
                          <p className="text-sm font-medium text-slate-300 max-w-md mx-auto mb-6">{t.unlockProDesc}</p>
                          <button onClick={() => router.push('/pricing')} className="w-full sm:w-auto px-8 py-3.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.5)] active:scale-95 transition-all">
                            <Sparkles size={16} className="inline mr-2" /> {t.unlockOraclePro}
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
              <button onClick={() => setIsMobileDrawerOpen('config')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${(selectedSyllabusId || selectedFileIds.length > 0) ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                <Target size={12}/> {t.config}
              </button>
              <button onClick={() => { setActiveTab('history'); window.scrollTo({top:0, behavior:'smooth'}); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 ${activeTab === 'history' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
                <History size={12}/> {t.vault}
              </button>
            </div>

            <div className="relative group pointer-events-auto mx-1">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia-500/50 to-violet-500/50 rounded-[2rem] blur-md opacity-70 transition duration-500"></div>
              <div className="relative flex shadow-xl rounded-[2rem] border transition-all backdrop-blur-xl overflow-hidden p-1 bg-slate-900/90 border-slate-700/50">
                <button 
                  onClick={handleRunOracle} 
                  disabled={!selectedSyllabusId || selectedFileIds.length === 0 || isScanning}
                  className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-black tracking-widest uppercase text-xs rounded-2xl shadow-sm flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isScanning ? t.initiatingMobileScan : t.predictTopics}
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
              {isMobileDrawerOpen === 'config' && <><Target size={18} className="text-fuchsia-500"/> {t.matrixConfig}</>}
            </h3>
          </div>

          {/* CONFIG DRAWER */}
          {isMobileDrawerOpen === 'config' && (
            <div className="space-y-6 pb-20">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t.targetSyllabus}</label>
                  <select 
                    value={selectedSyllabusId} 
                    onChange={(e) => { setSelectedSyllabusId(e.target.value); setSelectedChapterId(''); }}
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm font-bold text-slate-300 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer mb-4"
                  >
                    <option value="">{t.selectActiveCourse}</option>
                    {syllabuses.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
                  </select>

                  {selectedSyllabusId && (
                    <>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 mt-4">{t.specificChapter}</label>
                      <select 
                        value={selectedChapterId} 
                        onChange={(e) => setSelectedChapterId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-sm font-bold text-slate-300 focus:border-fuchsia-500 outline-none appearance-none cursor-pointer"
                      >
                        <option value="">{t.fullCourse}</option>
                        {syllabuses.find(s => s.id === selectedSyllabusId)?.chapters?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t.feedPastPapers}</label>
                  <div className="w-full max-h-48 overflow-y-auto border border-slate-800 rounded-2xl p-2 bg-slate-950 custom-scrollbar space-y-1">
                    {userFiles.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-slate-500">
                        No sources found in Dashboard
                      </div>
                    ) : (
                      userFiles.map(file => {
                        const isSelected = selectedFileIds.includes(file.id);
                        return (
                          <div 
                            key={file.id} 
                            onClick={() => {
                              setSelectedFileIds(prev => 
                                isSelected ? prev.filter(id => id !== file.id) : [...prev, file.id]
                              );
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-fuchsia-500/10 border-fuchsia-500/30 shadow-sm' : 'bg-slate-900 border-transparent hover:border-slate-800'}`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-slate-700 bg-slate-800'}`}>
                              {isSelected && <Check size={12} />}
                            </div>
                            <span className={`text-sm font-bold truncate flex-1 ${isSelected ? 'text-fuchsia-400' : 'text-slate-300'}`}>
                              {file.name || 'Untitled Source'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
            </div>
          )}

          {/* Sticky Done Button */}
          <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
            <button onClick={() => setIsMobileDrawerOpen('none')} className="w-full py-3 rounded-xl font-black tracking-wide shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
              <CheckCircle2 size={16}/> {t.done}
            </button>
          </div>
        </div>
      </div>
    </SecureLayout>
  );
}
