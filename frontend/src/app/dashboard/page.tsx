'use client';

import React, { useEffect, useState } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import FileUploadDragDrop from '@/components/dashboard/FileUploadDragDrop';
import FileList from '@/components/dashboard/FileList';
import { useAuth } from '@/components/providers/AuthContext';
import { uploadFile, fetchUserFiles, fetchUserContextPacks, deleteFile, getFileStats, File as DBFile, ContextPack } from '@/services/dashboard.service';
import RewardClaimer from '@/components/RewardClaimer';
import { BookOpen, Map, Swords, Plus, Loader2, ListTree, Trash2, CheckCircle2, Edit2, Zap, Play, Heart, Bookmark, Share2, BrainCircuit, Lock, Sparkles, ChevronUp, X, Radar, AlertTriangle, ArrowRight, Layers, MessageSquare, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DreamVarsityWidget from '@/components/dashboard/DreamVarsityWidget';

const translations = {
  English: { welcome: "Welcome back!", signedInAs: "Signed in as", welcomeSubtitle: "Manage your documents and start learning.", totalDocs: "Total Documents", indexed: "Indexed", storage: "Storage Used", available: "Available on Free Tier", materials: "Study Materials", learning: "Learning contexts created", uploadTitle: "Knowledge Builder", uploadDesc: "Upload PDFs or Forge your Syllabus manually.", recentFiles: "Knowledge Base (Sources)", syllabusFiles: "Syllabus Vault", packsTitle: "Context Packs", packsDesc: "Your generated study materials and notes.", uploadType: "Select Input Type", typeSource: "Upload Source (PDF)", typeSyllabus: "Forge Syllabus (Text)", courseName: "Course/Subject Name", chapters: "Chapters (One per line)", createSyllabus: "Forge Syllabus", noSyllabus: "No syllabuses forged yet." },
  Bangla: { welcome: "স্বাগতম!", signedInAs: "লগ ইন আছেন:", welcomeSubtitle: "আপনার ডকুমেন্টস ম্যানেজ করুন এবং শেখা শুরু করুন।", totalDocs: "মোট ডকুমেন্টস", indexed: "ইনডেক্সড", storage: "স্টোরেজ ব্যবহৃত", available: "ফ্রি টিয়ারে উপলব্ধ", materials: "স্টাডি ম্যাটেরিয়ালস", learning: "লার্নিং কনটেক্সট তৈরি হয়েছে", uploadTitle: "নলেজ বিল্ডার", uploadDesc: "সোর্স পিডিএফ আপলোড করুন বা সিলেবাস টাইপ করুন।", recentFiles: "নলেজ বেজ (সোর্স)", syllabusFiles: "সিলেবাস ভল্ট", packsTitle: "কনটেক্সট প্যাকস", packsDesc: "আপনার তৈরি করা স্টাডি ম্যাটেরিয়ালস এবং নোটস।", uploadType: "ইনपुट টাইপ সিলেক্ট করুন", typeSource: "সোর্স আপলোড (PDF)", typeSyllabus: "সিলেবাস তৈরি (Text)", courseName: "কোর্সের নাম", chapters: "চ্যাপ্টার (প্রতি লাইনে একটি)", createSyllabus: "সিলেবাস তৈরি করুন", noSyllabus: "কোনো সিলেবাস তৈরি করা হয়নি।" },
  Hindi: { welcome: "वापसी पर स्वागत है!", signedInAs: "लॉग इन हैं:", welcomeSubtitle: "अपने दस्तावेज़ प्रबंधित करें और सीखना शुरू करें।", totalDocs: "कुल दस्तावेज़", indexed: "अनुक्रमित", storage: "संग्रहण उपयोग", available: "फ्री टियर पर उपलब्ध", materials: "अध्ययन सामग्री", learning: "सीखने के संदर्भ बनाए गए", uploadTitle: "नॉलेज बिल्डर", uploadDesc: "पीडीएफ अपलोड करें या अपना सिलेबस टाइप करें।", recentFiles: "ज्ञान का आधार (स्रोत)", syllabusFiles: "सिलेबस तिजोरी", packsTitle: "संदर्भ पैक", packsDesc: "आपकी उत्पन्न अध्ययन सामग्री और नोट्स।", uploadType: "इनपुट प्रकार चुनें", typeSource: "स्रोत अपलोड (PDF)", typeSyllabus: "सिलेबस बनाएं (Text)", courseName: "कोर्स का नाम", chapters: "अध्याय (प्रति पंक्ति एक)", createSyllabus: "सिलेबस बनाएं", noSyllabus: "कोई सिलेबस नहीं बनाया गया।" }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';
type WorkspaceTab = 'upload' | 'vault' | 'files';

export default function DashboardPage() {
  const { user, session } = useAuth();
  const supabase = createClient();

  const [files, setFiles] = useState<DBFile[]>([]);
  const [contextPacks, setContextPacks] = useState<ContextPack[]>([]);
  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);
  const [stats, setStats] = useState({ totalFiles: 0, indexedFiles: 0, totalSize: 0 });
  const [optimisticFiles, setOptimisticFiles] = useState<Set<string>>(new Set());
  const [uploadCategory, setUploadCategory] = useState<'source' | 'syllabus'>('source');
  
  const [courseName, setCourseName] = useState('');
  const [chapterList, setChapterList] = useState<{id: string, chapterName: string, topics: string[]}[]>([]);
  const [tempChapterName, setTempChapterName] = useState('');
  const [tempTopicsText, setTempTopicsText] = useState('');
  const [isSubmittingSyllabus, setIsSubmittingSyllabus] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingSyllabusId, setEditingSyllabusId] = useState<string | null>(null);

  const [language, setLanguage] = useState<LanguageType>('English');
  const [uiTheme, setUiTheme] = useState<'dark'|'light'>('dark');
  const t = translations[language] || translations['English'];

  const [isNeuralFeedOpen, setIsNeuralFeedOpen] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('upload');

  useEffect(() => {
    const loadSettings = () => { 
      const savedLang = localStorage.getItem('Prepia_language'); if (savedLang) setLanguage(savedLang as LanguageType); 
      const savedTheme = localStorage.getItem('Prepia_theme'); if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
    };
    loadSettings(); 
    window.addEventListener('languageChanged', loadSettings);
    window.addEventListener('settingsChanged', loadSettings);
    return () => { window.removeEventListener('languageChanged', loadSettings); window.removeEventListener('settingsChanged', loadSettings); };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const loadData = async () => {
      try {
        setIsLoadingFiles(true);
        const userFiles = await fetchUserFiles(user.id); setFiles(userFiles);
        const fileStats = await getFileStats(user.id); setStats(fileStats);
        fetchSyllabuses();
      } catch (err) {} finally { setIsLoadingFiles(false); }
    };
    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const loadPacks = async () => {
      try { setIsLoadingPacks(true); const packs = await fetchUserContextPacks(user.id); setContextPacks(packs); } 
      catch (err) {} finally { setIsLoadingPacks(false); }
    };
    loadPacks();
  }, [user?.id]);

  const fetchSyllabuses = async () => {
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/list` : `${apiUrlBase}/api/syllabus/list`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (data.success) setSyllabuses(data.syllabuses);
    } catch (e) {}
  };

  const handleAddOrUpdateChapter = () => {
    if (!tempChapterName.trim()) return;
    const topicsArray = tempTopicsText.split('\n').map(t => t.trim()).filter(t => t !== '');
    if (editingChapterId) {
      setChapterList(chapterList.map(c => c.id === editingChapterId ? { ...c, chapterName: tempChapterName.trim(), topics: topicsArray } : c));
      setEditingChapterId(null);
    } else {
      setChapterList([...chapterList, { id: Date.now().toString(), chapterName: tempChapterName.trim(), topics: topicsArray }]);
    }
    setTempChapterName(''); setTempTopicsText('');
  };

  const handleEditChapter = (id: string) => {
    const chapToEdit = chapterList.find(c => c.id === id);
    if (chapToEdit) {
      setTempChapterName(chapToEdit.chapterName);
      setTempTopicsText(chapToEdit.topics.join('\n'));
      setEditingChapterId(id);
    }
  };

  const handleRemoveChapter = (id: string) => {
    setChapterList(chapterList.filter(c => c.id !== id));
    if (editingChapterId === id) { setEditingChapterId(null); setTempChapterName(''); setTempTopicsText(''); }
  };

  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || chapterList.length === 0) return;
    setIsSubmittingSyllabus(true);
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/create` : `${apiUrlBase}/api/syllabus/create`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ courseName, chapters: chapterList })
      });
      const data = await res.json();
      if (data.success) {
        setCourseName(''); setChapterList([]); setTempChapterName(''); setTempTopicsText(''); setEditingChapterId(null); fetchSyllabuses();
        setActiveWorkspaceTab('vault'); // Auto-switch to vault to show new syllabus
      }
    } catch (e) {}
    setIsSubmittingSyllabus(false);
  };

  const handleDeleteSyllabus = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Syllabus? All forged chapters and progress will be lost forever.")) return;
    setSyllabuses(prev => prev.filter(s => s.id !== id));
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/${id}` : `${apiUrlBase}/api/syllabus/${id}`;
      const res = await fetch(apiUrl, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (!data.success) { fetchSyllabuses(); alert("Failed to delete the syllabus."); }
    } catch (e) { fetchSyllabuses(); }
  };

  const startEditingSyllabus = (syllabus: any) => {
    setEditingSyllabusId(syllabus.id);
    setCourseName(syllabus.course_name);
    setChapterList(syllabus.chapters?.map((c: any) => ({
      id: c.id || Date.now().toString() + Math.random().toString(),
      chapterName: c.title,
      topics: c.topics || []
    })) || []);
    setActiveWorkspaceTab('upload');
    setUploadCategory('syllabus');
  };

  const handleUpdateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || chapterList.length === 0 || !editingSyllabusId) return;
    setIsSubmittingSyllabus(true);
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/${editingSyllabusId}` : `${apiUrlBase}/api/syllabus/${editingSyllabusId}`;
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ courseName, chapters: chapterList })
      });
      const data = await res.json();
      if (data.success) {
        setCourseName(''); setChapterList([]); setTempChapterName(''); setTempTopicsText(''); setEditingChapterId(null); setEditingSyllabusId(null); fetchSyllabuses();
        setActiveWorkspaceTab('vault');
      }
    } catch (e) {}
    setIsSubmittingSyllabus(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const optimisticFileId = `optimistic-${Date.now()}`;
    setOptimisticFiles((prev) => new Set([...prev, optimisticFileId]));

    const optimisticFile: DBFile = { id: optimisticFileId, name: file.name, status: 'uploading', created_at: new Date().toISOString(), file_type: file.type, file_size: file.size, user_id: user?.id || '' } as any; 
    setFiles((prev) => [optimisticFile, ...prev]);

    try {
      const fileId = await uploadFile(file, session.access_token);
      setFiles((prev) => prev.map((f) => f.id === optimisticFileId ? { ...f, id: fileId, status: 'chunking_complete' } : f));
      setOptimisticFiles((prev) => { const next = new Set(prev); next.delete(optimisticFileId); return next; });
    } catch (error: any) {
      setOptimisticFiles((prev) => { const next = new Set(prev); next.delete(optimisticFileId); return next; });
      setFiles((prev) => prev.filter((f) => f.id !== optimisticFileId));
      alert(error.message || "Failed to upload file");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try { await deleteFile(fileId); setFiles((prev) => prev.filter((f) => f.id !== fileId)); if (user?.id) { const fileStats = await getFileStats(user.id); setStats(fileStats); } } catch (err) {}
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Determine latest syllabus for "Continue Learning"
  const latestSyllabus = syllabuses.length > 0 ? syllabuses[0] : null;

  return (
    <>
      <SecureLayout>
        <div className={`min-h-[calc(100vh-80px)] pb-24 transition-colors duration-500 ${uiTheme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-slate-50'}`}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-7xl mx-auto font-sans flex flex-col gap-8">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-4">
              <div>
                <h1 className={`text-3xl font-black tracking-tight ${uiTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.welcome}</h1>
                <p className={`font-medium mt-1 ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email ? `${t.signedInAs} ${user.email}` : t.welcomeSubtitle}</p>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setIsNeuralFeedOpen(true)} className={`group relative overflow-hidden px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-slate-800 text-white border border-slate-700 hover:border-slate-500' : 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300'}`}>
                  <Play size={16} className="text-emerald-500" />
                  Neural Feed
                </button>
                  <Link href="/notes" className="hidden md:flex group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-2.5 rounded-full font-bold text-sm items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                    <FileText size={16} className="group-hover:scale-110 transition-transform" />
                    AI Notes
                  </Link>
                  <Link href="/dashboard/oracle" className="group relative overflow-hidden bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-fuchsia-500/20 transition-all active:scale-95">
                    <Radar size={16} className="group-hover:animate-spin" />
                    Predict Exam
                  </Link>
                </div>
            </div>

            <DreamVarsityWidget />

            {/* 🟢 CONTEXT-AWARE: Continue Learning */}
            <section>
              <h2 className={`text-lg font-black mb-4 flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                Continue Learning
              </h2>
              {latestSyllabus ? (
                <div className={`relative overflow-hidden rounded-[2rem] p-8 border shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 ${uiTheme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-indigo-950 border-indigo-900/50' : 'bg-gradient-to-br from-white to-indigo-50 border-indigo-100'}`}>
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex-1 relative z-10">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-400 mb-4">
                      Active Quest
                    </span>
                    <h3 className={`text-3xl font-black mb-2 tracking-tight ${uiTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{latestSyllabus.course_name}</h3>
                    <p className={`font-medium mb-6 ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {latestSyllabus.chapters?.length || 0} nodes indexed and ready for deep learning. Jump back into the concept battle.
                    </p>
                    <div className="flex gap-4">
                      <Link href="/concept-battle" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95">
                        Resume Battle
                      </Link>
                      <button onClick={() => setActiveWorkspaceTab('vault')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border text-slate-700 hover:bg-slate-50'}`}>
                        View Nodes
                      </button>
                    </div>
                  </div>

                  <div className={`w-32 h-32 md:w-48 md:h-48 rounded-[2rem] flex items-center justify-center border-4 relative z-10 ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800/50 shadow-inner' : 'bg-slate-50 border-white shadow-xl'}`}>
                    <Swords size={64} className="text-indigo-500 opacity-80" />
                  </div>
                </div>
              ) : (
                <div className={`rounded-[2rem] p-8 border flex flex-col items-center justify-center text-center ${uiTheme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                    <BookOpen size={24}/>
                  </div>
                  <h3 className={`font-black text-lg mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Ready to start your journey?</h3>
                  <p className={`text-sm mb-6 max-w-md ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>You don't have any active syllabuses yet. Create one in your workspace below to unlock AI features.</p>
                  <button onClick={() => setActiveWorkspaceTab('upload')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                    Create Syllabus
                  </button>
                </div>
              )}
            </section>

            {/* 🟢 CONTEXT-AWARE: Suggested for You */}
            <section>
              <h2 className={`text-lg font-black mb-4 flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                Suggested For You
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SuggestedCard title="Night Before Exam" desc="Panic mode. 5-minute cheat sheet." icon={<Zap/>} color="text-rose-500" bg="bg-rose-500/10" link="/night-before" uiTheme={uiTheme}/>
                <SuggestedCard title="AI Tutor Chat" desc="Ask questions directly to your notes." icon={<MessageSquare/>} color="text-blue-500" bg="bg-blue-500/10" link="/chat" uiTheme={uiTheme}/>
                <SuggestedCard title="Flashcards" desc="Spaced repetition for memorization." icon={<Layers/>} color="text-amber-500" bg="bg-amber-500/10" link="/flashcards" uiTheme={uiTheme}/>
              </div>
            </section>

            {/* 🟢 WORKSPACE TABS (Knowledge Builder, Vault, Files) - Replaces the huge layout */}
            <section className="mt-8">
              <div className={`flex items-center gap-2 p-1.5 rounded-2xl w-max mb-6 ${uiTheme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-200/50'}`}>
                <WorkspaceTabButton active={activeWorkspaceTab === 'upload'} onClick={() => setActiveWorkspaceTab('upload')} icon={<Plus size={16}/>} label="Create" uiTheme={uiTheme} />
                <WorkspaceTabButton active={activeWorkspaceTab === 'vault'} onClick={() => setActiveWorkspaceTab('vault')} icon={<ListTree size={16}/>} label="Vault" uiTheme={uiTheme} />
                <WorkspaceTabButton active={activeWorkspaceTab === 'files'} onClick={() => setActiveWorkspaceTab('files')} icon={<BookOpen size={16}/>} label="Sources" uiTheme={uiTheme} />
              </div>

              <AnimatePresence mode="wait">
                {/* TAB: UPLOAD / CREATE */}
                {activeWorkspaceTab === 'upload' && (
                  <motion.div key="upload" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`rounded-[2rem] border p-6 md:p-8 ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className={`text-xl font-black mb-1 ${uiTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.uploadTitle}</h3>
                        <p className={`text-sm font-medium ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.uploadDesc}</p>
                      </div>
                      
                      <div className={`flex p-1 rounded-xl ${uiTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <button onClick={() => setUploadCategory('source')} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${uploadCategory === 'source' ? (uiTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-400'}`}>PDF</button>
                        <button onClick={() => setUploadCategory('syllabus')} className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${uploadCategory === 'syllabus' ? (uiTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-400'}`}>Text</button>
                      </div>
                    </div>

                    {uploadCategory === 'source' ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <FileUploadDragDrop onUpload={handleFileUpload} disabled={optimisticFiles.size > 0} uiTheme={uiTheme} />
                        {(user as any)?.tier !== 'pro' && (
                          <div className={`mt-4 p-3 rounded-xl border flex gap-3 text-left shadow-sm ${uiTheme === 'dark' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">Free Tier Caution</h4>
                              <p className="text-xs font-medium leading-relaxed">Max 3 files per week. Files auto-delete after 7 days.</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-6 rounded-3xl border ${uiTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                         <div className="space-y-6 max-w-3xl">
                            <div>
                              <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Step 1: Course Name</label>
                              <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g., Advanced Quantum Mechanics" className={`w-full border p-4 rounded-2xl text-lg font-black focus:ring-4 outline-none transition-all shadow-sm ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-500 focus:ring-amber-500/10'}`}/>
                            </div>

                            <AnimatePresence>
                              {courseName.length >= 2 && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`pt-6 border-t ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200/60'}`}>
                                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Step 2: Build Syllabus Nodes</label>
                                  
                                  <div className={`p-5 md:p-6 rounded-2xl border shadow-sm space-y-4 mb-8 ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <input value={tempChapterName} onChange={e => setTempChapterName(e.target.value)} placeholder="Chapter Title (e.g., Wave Functions)" className={`w-full border p-3.5 rounded-xl text-sm font-bold focus:ring-4 outline-none transition-all ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`} />
                                    <textarea value={tempTopicsText} onChange={e => setTempTopicsText(e.target.value)} placeholder="Topics (One per line)" rows={3} className={`w-full border p-3.5 rounded-xl text-sm font-medium focus:ring-4 outline-none resize-none transition-all custom-scrollbar ${uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500'}`} />
                                    <button type="button" onClick={handleAddOrUpdateChapter} disabled={!tempChapterName.trim()} className={`w-full py-4 font-black tracking-widest uppercase text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 ${editingChapterId ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}>
                                      {editingChapterId ? <Edit2 size={16}/> : <Plus size={16}/>} {editingChapterId ? "Update Node" : "Add to Syllabus"}
                                    </button>
                                  </div>

                                  {chapterList.length > 0 && (
                                    <div className="space-y-3 mb-8">
                                      {chapterList.map((chap, idx) => (
                                        <div key={chap.id} className={`p-4 border rounded-xl flex items-center justify-between gap-4 ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                          <div>
                                            <h4 className={`font-black text-sm flex items-center gap-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}><span className={`px-2 py-0.5 rounded text-[10px] ${uiTheme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>CH {idx + 1}</span> {chap.chapterName}</h4>
                                          </div>
                                          <div className="flex gap-2">
                                            <button onClick={() => handleEditChapter(chap.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit2 size={16}/></button>
                                            <button onClick={() => handleRemoveChapter(chap.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <button onClick={editingSyllabusId ? handleUpdateSyllabus : handleCreateSyllabus} disabled={isSubmittingSyllabus || chapterList.length === 0} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black tracking-widest uppercase text-xs rounded-2xl flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
                                    {isSubmittingSyllabus ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} {editingSyllabusId ? "Update Syllabus in Vault" : "Commit Syllabus to Vault"}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                         </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* TAB: VAULT */}
                {activeWorkspaceTab === 'vault' && (
                  <motion.div key="vault" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`rounded-[2rem] border p-6 md:p-8 min-h-[400px] ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-xl font-black mb-6 flex items-center gap-2 ${uiTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}><ListTree size={20}/> Syllabus Vault</h3>
                    
                    {syllabuses.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center">
                        <ListTree size={40} className="text-slate-400 mb-4" />
                        <p className="text-slate-500 font-bold">{t.noSyllabus}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {syllabuses.map(syl => (
                          <div key={syl.id} className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 ${uiTheme === 'dark' ? 'bg-slate-950 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}>
                            <div className="flex justify-between items-start mb-4">
                              <h3 className={`font-black text-lg ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{syl.course_name}</h3>
                              <div className="flex gap-2">
                                <button onClick={() => startEditingSyllabus(syl)} className="text-slate-400 hover:text-indigo-500"><Edit2 size={18}/></button>
                                <button onClick={() => handleDeleteSyllabus(syl.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={18}/></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-white border text-slate-600'}`}>{syl.chapters?.length || 0} Nodes</span>
                              <span className={`text-[10px] uppercase font-black px-3 py-1.5 rounded-full flex items-center gap-1 ${uiTheme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'}`}><Swords size={12}/> Quest Ready</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB: FILES */}
                {activeWorkspaceTab === 'files' && (
                  <motion.div key="files" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`rounded-[2rem] border p-6 md:p-8 min-h-[400px] ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-xl font-black flex items-center gap-2 ${uiTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}><BookOpen size={20}/> Source Documents</h3>
                      <div className={`text-xs font-bold px-3 py-1 rounded-full ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {stats.totalFiles} Docs ({formatBytes(stats.totalSize)})
                      </div>
                    </div>
                    <FileList files={files} isLoading={isLoadingFiles} onDelete={handleDeleteFile} uiTheme={uiTheme} />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

          </motion.div>
          
          <RewardClaimer />
        </div>
      </SecureLayout>

      {/* 🟢 TIKTOK STYLE NEURAL FEED (FULL SCREEN OVERLAY) */}
      <AnimatePresence>
        {isNeuralFeedOpen && (
          <NeuralFeedModal onClose={() => setIsNeuralFeedOpen(false)} supabase={supabase} />
        )}
      </AnimatePresence>
      
      {/* 🟢 Conversational / Assistant FAB (Mobile friendly) */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <Link href="/chat" className="w-14 h-14 bg-indigo-600 rounded-full shadow-[0_10px_30px_rgba(79,70,229,0.5)] flex items-center justify-center text-white active:scale-90 transition-transform">
          <MessageSquare size={24} />
        </Link>
      </div>
    </>
  );
}

// ---------------------------------------------------------
// REUSABLE COMPONENTS
// ---------------------------------------------------------
const SuggestedCard = ({ title, desc, icon, color, bg, link, uiTheme }: any) => (
  <Link href={link} className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 group flex items-center gap-4 ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:shadow-md'}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
      {icon}
    </div>
    <div>
      <h4 className={`font-black text-sm mb-0.5 group-hover:text-indigo-500 transition-colors ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h4>
      <p className={`text-xs font-medium ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>
    </div>
  </Link>
);

const WorkspaceTabButton = ({ active, onClick, icon, label, uiTheme }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${active ? (uiTheme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-indigo-600 shadow-sm') : (uiTheme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
  >
    {icon} {label}
  </button>
);


// ---------------------------------------------------------
// 🚀 THE TIKTOK-STYLE NEURAL FEED MODAL (Original Logic Intact)
// ---------------------------------------------------------
const FALLBACK_CHUNKS = [
  { id: '1', content: "Quantum Entanglement is a physical phenomenon that occurs when a group of particles are generated, interact, or share spatial proximity in a way such that the quantum state of each particle of the group cannot be described independently of the state of the others.", topic: "Quantum Physics" },
  { id: '2', content: "In Machine Learning, Gradient Descent is a first-order iterative optimization algorithm for finding a local minimum of a differentiable function. The idea is to take repeated steps in the opposite direction of the gradient.", topic: "Artificial Intelligence" },
  { id: '3', content: "The Mitochondria is the powerhouse of the cell, responsible for generating most of the chemical energy needed to power the cell's biochemical reactions.", topic: "Cell Biology" },
  { id: '4', content: "A Dipole Antenna is the simplest and most widely used class of antenna. It consists of two identical conductive elements such as metal wires or rods.", topic: "Telecommunications" },
  { id: '5', content: "In React, a Hook is a special function that lets you 'hook into' React features. For example, useState is a Hook that lets you add React state to function components.", topic: "Web Development" }
];

function NeuralFeedModal({ onClose, supabase }: { onClose: () => void, supabase: any }) {
  const { user, session } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [likedCards, setLikedCards] = useState<Set<string>>(new Set());
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  const [referralData, setReferralData] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);

  const PREMIUM_TRIGGER_INTERVAL = 5; 
  
  // Check if neural feed is unlocked via referral
  const isUnlocked = isPro || (referralData?.neuralUnlockedUntil && new Date(referralData.neuralUnlockedUntil) > new Date());

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    fetchConceptChunks();
    fetchReferralData();
    checkProStatus();
    return () => { document.body.style.overflow = 'auto'; };
  }, [user]);

  const checkProStatus = async () => {
    if (!user) return;
    // Check local metadata first
    if ((user as any).tier?.toUpperCase() === 'PRO' || user.user_metadata?.tier?.toUpperCase() === 'PRO') {
      setIsPro(true);
      return;
    }
    // Fallback: check profiles table
    try {
      const { data } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
      if (data?.tier?.toUpperCase() === 'PRO') {
        setIsPro(true);
      }
    } catch (e) {
      console.error("Failed to check PRO status", e);
    }
  };

  const fetchReferralData = async () => {
    if (!session?.access_token) return;
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/referral` : `${apiUrlBase}/api/rewards/referral`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      const data = await res.json();
      if (data.success) {
        setReferralData(data);
      }
    } catch (e) {}
  };

  const fetchConceptChunks = async (offset = 0) => {
    if (offset === 0) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const { data, error } = await supabase.from('document_chunks').select('id, content, metadata').range(offset, offset + 19);
      if (data && data.length > 0) {
        const formattedData = data.map((d: any) => ({ id: d.id, content: d.content, topic: d.metadata?.topic || 'General Concept' }));
        if (offset === 0) {
          setCards(shuffleArray(formattedData));
        } else {
          setCards(prev => [...prev, ...shuffleArray(formattedData)]);
        }
      } else if (offset === 0) {
        setCards(shuffleArray([...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS])); 
      }
    } catch (error) {
      if (offset === 0) setCards(shuffleArray([...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS, ...FALLBACK_CHUNKS]));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const shuffleArray = (array: any[]) => array.sort(() => Math.random() - 0.5);

  const handleDragEnd = (e: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.y < -swipeThreshold && currentIndex < cards.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // Infinite scroll trigger: load more when 5 cards away from the end
      if (nextIndex >= cards.length - 5 && !isLoadingMore) {
        fetchConceptChunks(cards.length);
      }
    }
    else if (info.offset.y > swipeThreshold && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleAction = (type: 'like' | 'save', id: string) => {
    if (type === 'like') { const newSet = new Set(likedCards); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setLikedCards(newSet); }
    else { const newSet = new Set(savedCards); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSavedCards(newSet); }
  };

  const isPremiumCard = !isUnlocked && (currentIndex + 1) % PREMIUM_TRIGGER_INTERVAL === 0 && currentIndex !== 0;
  const activeCard = cards[currentIndex];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[100] bg-black flex items-center justify-center font-sans">
      <button onClick={onClose} className="absolute top-6 left-6 z-50 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
        <X size={24} />
      </button>

      {isLoading ? (
        <div className="animate-pulse flex flex-col items-center">
          <BrainCircuit size={48} className="text-emerald-500 mb-4 animate-bounce" />
          <p className="text-emerald-500/80 font-black tracking-widest uppercase text-xs">Curating Your Neural Feed...</p>
        </div>
      ) : (
        <div className="w-full max-w-md h-[100dvh] md:h-[90vh] relative overflow-hidden bg-slate-950 md:rounded-[2.5rem] md:border-4 border-slate-800 shadow-[0_0_100px_rgba(16,185,129,0.1)]">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none flex justify-center pt-8">
            <span className="text-white/90 font-black tracking-widest uppercase text-xs flex items-center gap-2 drop-shadow-md">
               <Zap size={14} className="text-emerald-400 fill-emerald-400" /> For You <span className="w-1 h-1 bg-white rounded-full mx-1"></span> Following
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            <motion.div key={currentIndex} initial={{ opacity: 0, y: 100, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -100, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }} onDragEnd={handleDragEnd} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing">
              {isPremiumCard ? <PremiumPaywallCard currentIndex={currentIndex} referralData={referralData} /> : <ConceptCard data={activeCard} isQuiz={currentIndex % 2 !== 0} />}
            </motion.div>
          </AnimatePresence>

          <div className="absolute right-4 bottom-24 flex flex-col gap-6 z-30">
             <SidebarButton icon={<Heart size={26} className={likedCards.has(activeCard?.id) ? "fill-rose-500 text-rose-500" : "text-white"} />} label={likedCards.has(activeCard?.id) ? "1.2k" : "Like"} onClick={() => handleAction('like', activeCard?.id)} />
             <SidebarButton icon={<Bookmark size={26} className={savedCards.has(activeCard?.id) ? "fill-amber-400 text-amber-400" : "text-white"} />} label={savedCards.has(activeCard?.id) ? "Saved" : "Save"} onClick={() => handleAction('save', activeCard?.id)} />
             <SidebarButton icon={<Share2 size={26} className="text-white" />} label="Share" onClick={() => {}} />
          </div>

          <div className="absolute bottom-6 left-0 w-full flex flex-col items-center justify-center opacity-50 z-20 pointer-events-none animate-bounce">
             <ChevronUp size={24} className="text-white mb-[-10px]" />
             <span className="text-[9px] text-white font-bold uppercase tracking-widest">Swipe to learn</span>
          </div>
          
          {isLoadingMore && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 flex items-center gap-2 shadow-xl">
               <Loader2 size={14} className="text-emerald-400 animate-spin" />
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Loading...</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const ConceptCard = ({ data, isQuiz }: { data: any, isQuiz: boolean }) => {
  const [revealed, setRevealed] = useState(false);
  let displayContent = data?.content || ""; let hiddenWord = ""; let maskedContent = displayContent;

  if (isQuiz) {
    const words = displayContent.split(' ');
    const potentialTargets = words.filter((w: string) => w.length > 5 && /^[A-Z]/.test(w));
    hiddenWord = potentialTargets.length > 0 ? potentialTargets[0] : words[Math.floor(words.length / 2)];
    maskedContent = displayContent.replace(hiddenWord, revealed ? hiddenWord : '____?____');
  }

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col justify-center px-8">
       <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
       <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-indigo-500/20 via-transparent to-emerald-500/20 animate-pulse pointer-events-none blur-3xl"></div>

       <div className="relative z-10 w-full pr-14">
         <span className={`inline-block px-3 py-1.5 backdrop-blur-md border rounded-full text-[9px] font-black uppercase tracking-widest mb-6 shadow-xl ${isQuiz ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/10 border-white/20 text-emerald-400'}`}>
           {isQuiz ? '🎯 Pop Quiz' : '🧠 Core Concept'} • {data?.topic}
         </span>
         <h2 className="text-2xl md:text-3xl font-black text-white leading-relaxed tracking-tight mb-8">
           {isQuiz ? (
             <span>
               {maskedContent.split('____?____').map((part: string, i: number, arr: any[]) => (
                 <React.Fragment key={i}>
                   {part}
                   {i < arr.length - 1 && (
                     <span className={`inline-block border-b-[3px] mx-1 px-2 pb-1 transition-all duration-300 ${revealed ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10 rounded' : 'text-slate-500 border-slate-600 animate-pulse'}`}>
                       {revealed ? hiddenWord : '?????'}
                     </span>
                   )}
                 </React.Fragment>
               ))}
             </span>
           ) : displayContent}
         </h2>

         {isQuiz && !revealed && (
           <button onClick={() => setRevealed(true)} className="w-max px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-slate-950 font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-transform flex items-center gap-2">
             <BrainCircuit size={16}/> Reveal Answer
           </button>
         )}
         {isQuiz && revealed && (
           <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 w-max px-4 py-2 rounded-xl border border-emerald-500/20 animate-in fade-in zoom-in">
             <CheckCircle2 size={18} /> Awesome! Swipe up.
           </div>
         )}
       </div>
    </div>
  );
};

const PremiumPaywallCard = ({ currentIndex, referralData }: { currentIndex: number, referralData: any }) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const totalReferred = referralData?.neuralReferralCount || 0;

  const handleInvite = () => {
    if (referralData?.referralCode) {
      const inviteLink = `${window.location.origin}/signup?ref=${referralData.referralCode}`;
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      alert(`Referral link copied! Send it to your friends.\nLink: ${inviteLink}`);
    } else {
      alert("Loading referral code...");
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col justify-center items-center px-6 text-center">
       <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-rose-600/10"></div>
       <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex flex-col items-center">
         <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(245,158,11,0.4)] rotate-12 border-4 border-white/10">
            <Lock size={40} className="text-white" />
         </div>
         <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Deep Dive Locked</h2>
         <p className="text-slate-400 text-sm mb-10 max-w-[260px] leading-relaxed font-medium">You've crushed {currentIndex} concepts today! The next card contains a highly restricted examination hack.</p>
         <button onClick={() => router.push('/pricing')} className="w-full max-w-[260px] py-4 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-[0_10px_30px_rgba(255,255,255,0.2)] active:scale-95">
           <Sparkles size={18} /> Unlock Pro Access
         </button>
         <button onClick={handleInvite} className="mt-6 text-[10px] font-black text-amber-500 uppercase tracking-widest hover:text-amber-400 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 transition-colors flex items-center justify-center gap-1.5">
           {copied ? <CheckCircle2 size={12} /> : null}
           {copied ? "Copied Link!" : `Or invite 3 friends to unlock (${totalReferred}/3)`}
         </button>
       </motion.div>
    </div>
  );
};

const SidebarButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <div className="flex flex-col items-center gap-1.5">
    <button onClick={onClick} className="w-12 h-12 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center active:scale-90 transition-transform border border-white/10 shadow-xl">
      {icon}
    </button>
    <span className="text-[10px] font-bold text-white/90 drop-shadow-md">{label}</span>
  </div>
);
