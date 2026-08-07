'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, History, BookOpen, AlertCircle, CheckCircle2, Target, Loader2, Share2, Copy, ShieldAlert, ExternalLink, Sparkles, X } from 'lucide-react';
import SecureLayout from '@/components/layout/SecureLayout';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicErrorMessage, showPublicError } from '@/lib/errors/publicError';

const translations = {
  English: {
    title: 'Book Jumper',
    subtitle: 'Vector Semantic Search Engine',
    searchTopic: 'What topic are you looking for?',
    placeholder: 'e.g. quantum mechanics, linear algebra...',
    selectBook: 'Target Source Book',
    generateBtn: 'Scan Entire Book',
    scanning: 'Vector Search Active...',
    history: 'Search History',
    noHistory: 'No recent searches',
    clickToJump: 'Jump to Match',
    openNewTab: 'Open Secure View'
  },
  Bangla: {
    title: 'বুক জাম্পার',
    subtitle: 'ভেক্টর সিমেন্টিক ইঞ্জিন',
    searchTopic: 'আপনি কোন টপিকটি খুঁজছেন?',
    placeholder: 'যেমন: কোয়ান্টাম মেকানিক্স...',
    selectBook: 'বই সিলেক্ট করুন',
    generateBtn: 'পুরো বই স্ক্যান করুন',
    scanning: 'ভেক্টর স্ক্যানিং চলছে...',
    history: 'পূর্বের সার্চসমূহ',
    noHistory: 'কোনো সার্চ হিস্ট্রি নেই',
    clickToJump: 'ম্যাচে যান',
    openNewTab: 'সিকিউর ভিউতে খুলুন'
  },
  Hindi: {
    title: 'बुक जम्पर',
    subtitle: 'वेक्टर सर्च इंजन',
    searchTopic: 'आप कौन सा विषय खोज रहे हैं?',
    placeholder: 'उदा. क्वांटम यांत्रिकी...',
    selectBook: 'पुस्तक चुनें',
    generateBtn: 'पूरी पुस्तक स्कैन करें',
    scanning: 'स्कैन हो रहा है...',
    history: 'खोज इतिहास',
    noHistory: 'कोई इतिहास नहीं',
    clickToJump: 'मैच पर जाएं',
    openNewTab: 'सुरक्षित दृश्य खोलें'
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';
type FetchState = 'idle' | 'fetching_url' | 'downloading_blob' | 'creating_blob' | 'ready' | 'cors_error';

export default function BookJumperPage() {
  const supabase = createClient();
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [selectedFileUrl, setSelectedFileUrl] = useState<string>('');
  const [rawSignedUrl, setRawSignedUrl] = useState<string>('');
  const [snippets, setSnippets] = useState<{ [key: number]: string }>({});
  const [relatedTags, setRelatedTags] = useState<string[]>([]);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [showExplainModal, setShowExplainModal] = useState(false);
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [hitPages, setHitPages] = useState<number[]>([]);
  const [searchFeedback, setSearchFeedback] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'search'|'history'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const assumedTotalPages = 300; 

  const isPdfLoading = fetchState === 'fetching_url' || fetchState === 'downloading_blob' || fetchState === 'creating_blob';

  useEffect(() => {
    const loadLanguage = () => { const savedLang = localStorage.getItem('Prepia_language'); if (savedLang) setLanguage(savedLang as LanguageType); };
    loadLanguage(); window.addEventListener('languageChanged', loadLanguage);
    fetchFiles(); fetchHistory();
    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  const fetchFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed').ilike('file_type', '%pdf%').order('created_at', { ascending: false });
    if (data) setFiles(data);
  };

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/bookjumper/history` : `${apiUrlBase}/api/bookjumper/history`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (data.success) setHistoryList(data.history);
    } catch (e) {}
  };

  const handleOpenManually = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const ticketUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/files/download-ticket` : `${apiUrlBase}/api/files/download-ticket`;
      const res = await fetch(ticketUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, 
        body: JSON.stringify({ fileId: selectedFileId }) 
      });
      const data = await res.json();
      if (data.ticketId) {
        const proxyUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/files/proxy/${data.ticketId}` : `${apiUrlBase}/api/files/proxy/${data.ticketId}`;
        window.open(proxyUrl, '_blank');
      } else {
        alert('Failed to generate secure ticket.');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating secure ticket.');
    }
  };

  const handleFileSelect = async (fileId: string) => {
    setSelectedFileId(fileId);
    setHitPages([]); setPageNumber(1); setSearchFeedback(null); setSelectedFileUrl(''); setShareLink(null);
    
    if (!fileId) {
      setFetchState('idle');
      return;
    }

    setFetchState('fetching_url');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const downloadUrl = apiUrlBase.endsWith('/api') 
          ? `${apiUrlBase}/files/download/${fileId}` 
          : `${apiUrlBase}/api/files/download/${fileId}`;

      setFetchState('downloading_blob');
      
      const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${session.access_token}`
          }
      });

      if (!response.ok) {
          throw new Error(`Secure proxy validation failed with status: ${response.status}`);
      }
      
      setFetchState('creating_blob');
      
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!data.success || !data.signedUrl) throw new Error("Invalid secure response");
        setSelectedFileUrl(data.signedUrl);
        setRawSignedUrl(data.signedUrl);
      } else {
        const blob = await response.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' }); 
        const localUrl = URL.createObjectURL(pdfBlob);
        setSelectedFileUrl(localUrl);
        setRawSignedUrl(''); 
      }
      
      setFetchState('ready');
      if (window.innerWidth < 768) setIsMobileSidebarOpen(false); 

    } catch (err) {
      console.error("Secure PDF Proxy Pipeline Failed:", err);
      setSearchFeedback({ message: "Security Block: Could not verify document access.", type: 'error' });
      setFetchState('cors_error');
    }
  };

  const handleExplainPage = async () => {
    if (!snippets[pageNumber]) return;
    setIsExplaining(true);
    setShowExplainModal(true);
    setExplanation('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/bookjumper/explain` : `${apiUrlBase}/api/bookjumper/explain`;
      const response = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ query, snippet: snippets[pageNumber] })
      });
      const data = await response.json();
      if (data.success) {
        setExplanation(data.explanation);
      } else {
        const message = getPublicErrorMessage(data);
        setExplanation(message);
        showPublicError(data);
      }
    } catch (e) {
      const message = getPublicErrorMessage();
      setExplanation(message);
      showPublicError();
    } finally {
      setIsExplaining(false);
    }
  };

  const handleGenerateHeatmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !selectedFileId || isLoading || isPdfLoading) return;
    setIsLoading(true); setHitPages([]); setSnippets({}); setRelatedTags([]); setSearchFeedback(null); setShareLink(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/bookjumper/heatmap` : `${apiUrlBase}/api/bookjumper/heatmap`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ fileId: selectedFileId, query: query.trim() })
      });

      const data = await response.json();
      
      if (response.status === 402) {
        setIsTokenModalOpen(true);
        setSearchFeedback({ message: "Not enough tokens.", type: 'error' });
        setIsLoading(false);
        return;
      }

      if (data.success) {
        if (data.hitPages && data.hitPages.length > 0) {
          setHitPages(data.hitPages);
          setSnippets(data.snippets || {});
          setRelatedTags(data.relatedTags || []);
          setPageNumber(Math.max(1, Number(data.hitPages[0]) || 1)); 
          setSearchFeedback({ message: `Found matches on ${data.hitPages.length} pages!`, type: 'success' });
          if (window.innerWidth < 768) setIsMobileSidebarOpen(false); 
        } else {
          setHitPages([]);
          setSearchFeedback({ message: `No matches found for "${query}".`, type: 'error' });
        }
        fetchHistory();
      } else { 
        const message = getPublicErrorMessage(data);
        setSearchFeedback({ message, type: 'error' });
        showPublicError(data);
      }
    } catch (error) { 
      const message = getPublicErrorMessage();
      setSearchFeedback({ message, type: 'error' });
      showPublicError();
    } 
    finally { setIsLoading(false); }
  };

  const loadFromHistory = (item: any) => {
    setQuery(item.query);
    setShareLink(null);
    if (selectedFileId !== item.file_id) handleFileSelect(item.file_id);
    setHitPages(item.hit_pages || []);
    if (item.hit_pages?.length > 0) {
      setPageNumber(Math.max(1, Number(item.hit_pages[0]) || 1));
      if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
    }
  };

  const handleShareTimeBomb = async () => {
    if (!selectedFileId || !query || hitPages.length === 0) return;
    setIsSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const ownerName = profile?.full_name || 'Premium Scholar';

      const { data: fileData } = await supabase.from('files').select('storage_path').eq('id', selectedFileId).single();
      if (!fileData) throw new Error("File path not found in database");

      let cleanPath = fileData.storage_path;
      if (cleanPath.startsWith('documents/')) cleanPath = cleanPath.substring(10);
      if (cleanPath.startsWith('/documents/')) cleanPath = cleanPath.substring(11);
      if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1); 

      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(cleanPath, 7200);

      if (urlError || !urlData) {
        throw new Error(urlError?.message || "Storage policy blocked link generation");
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2);

      const { data, error } = await supabase.from('shared_timebombs').insert({
        owner_id: user.id,
        file_id: selectedFileId,
        query: query,
        hit_pages: hitPages,
        expires_at: expiresAt.toISOString(),
        signed_url: urlData.signedUrl,
        referrer_name: ownerName
      }).select().single();

      if (data && !error) {
        const link = `${window.location.origin}/time-bomb/${data.id}`;
        setShareLink(link);
      } else {
        throw new Error(error?.message || "Failed to save to database");
      }
    } catch (err: any) {
      console.error("Share failed:", err);
      const message = getPublicErrorMessage();
      setSearchFeedback({ message, type: 'error' });
      showPublicError();
    }
    setIsSharing(false);
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      alert('Time-Bomb Link Copied! Send it to your friends quickly ⏱️');
    }
  };

  const renderSearchSection = () => (
    <form onSubmit={(e) => { handleGenerateHeatmap(e); setIsMobileDrawerOpen('none'); }} className="space-y-4 mb-6 bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-inner shrink-0">
      <div>
        <label className="block text-xs font-black tracking-widest text-slate-400 uppercase mb-2">{t.selectBook}</label>
        <select value={selectedFileId} onChange={(e) => handleFileSelect(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs font-bold focus:border-red-500 outline-none text-slate-300 custom-scrollbar appearance-none">
          <option value="">-- Choose a PDF Book --</option>
          {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-black tracking-widest text-red-400 uppercase mb-2 flex items-center gap-1.5"><Search size={14}/> {t.searchTopic}</label>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.placeholder} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold focus:border-red-500 outline-none text-white placeholder:text-slate-600 transition-colors" required/>
      </div>

      <button type="submit" disabled={isLoading || isPdfLoading || !query.trim() || !selectedFileId} className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
        {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Target size={18}/>} {isLoading ? t.scanning : t.generateBtn}
      </button>

      <AnimatePresence>
        {searchFeedback && searchFeedback.type === 'success' && hitPages.length > 0 && !shareLink && (
          <motion.button
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            onClick={handleShareTimeBomb} type="button" disabled={isSharing}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-red-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2 mt-2"
          >
            {isSharing ? <Loader2 className="animate-spin" size={16}/> : <Share2 size={16}/>} Generate Time-Bomb Link ⏱️
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareLink && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl relative overflow-hidden">
            <p className="text-[10px] font-black uppercase text-red-400 mb-2">Link valid for 2 Hours only!</p>
            <div className="flex gap-2">
              <input type="text" readOnly value={shareLink} className="flex-1 bg-black/50 border border-slate-700 text-slate-300 text-xs p-2 rounded-lg outline-none" />
              <button type="button" onClick={copyToClipboard} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-colors"><Copy size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchFeedback && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${searchFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {searchFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {searchFeedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hitPages.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5">Jump to Match Points:</label>
            <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
              {hitPages.map((page) => (
                <div key={page} className="relative group shrink-0">
                  <button 
                    type="button"
                    onClick={() => setPageNumber(page)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${pageNumber === page ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-red-500/50'}`}
                  >
                    Pg {page}
                  </button>
                  {snippets[page] && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                      <p className="text-[10px] text-slate-300 leading-relaxed italic line-clamp-4">"{snippets[page]}"</p>
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-b border-r border-slate-700 rotate-45"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {relatedTags.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Related Topics:</label>
            <div className="flex flex-wrap gap-2">
              {relatedTags.map(tag => (
                <button 
                  key={tag} 
                  type="button" 
                  onClick={() => { setQuery(tag); handleGenerateHeatmap({ preventDefault: () => {} } as any); }}
                  className="px-3 py-1.5 bg-slate-800/50 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-bold rounded-lg border border-slate-700/50 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </form>
  );

  const renderHistorySection = () => (
    <div className="flex-1 flex flex-col min-h-0 pt-4 border-t border-slate-800/60 pb-6">
       <h3 className="text-[11px] font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2"><History size={14}/> {t.history}</h3>
       <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
         {historyList.length === 0 ? <p className="text-xs text-slate-600 text-center py-4 bg-slate-950 rounded-xl border border-slate-800 border-dashed">{t.noHistory}</p> : (
           historyList.map(h => (
             <div key={h.id} onClick={() => { loadFromHistory(h); setIsMobileDrawerOpen('none'); }} className="p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-red-500/30 hover:bg-slate-900 transition-all group">
               <p className="text-xs font-bold text-slate-300 line-clamp-1">"{h.query}"</p>
               <p className="text-[9px] text-slate-500 mt-1 truncate">In: {h.files?.name}</p>
             </div>
           ))
         )}
       </div>
    </div>
  );

  return (
    <SecureLayout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] max-w-7xl mx-auto overflow-hidden bg-slate-950 lg:border lg:border-slate-800 lg:rounded-3xl lg:shadow-2xl lg:mt-4 font-sans relative">
        
        {/* Mobile Smart Header */}
        <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] shrink-0`}>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><BookOpen size={16} className="text-red-500"/> Jumper</h2>
            <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">Smart Indexer</p>
          </div>
          <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-red-600 text-white shadow-md hover:bg-red-500">Chat</button>
        </div>

        {/* Desktop Sidebar */}
        {/* Mobile Sidebar Overlay */}
        <div 
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[45] lg:hidden transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} 
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        
        {/* Mobile Sidebar Toggle Button */}
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className={`lg:hidden fixed top-1/2 -translate-y-1/2 left-0 z-[60] bg-gradient-to-r from-red-600 to-orange-600 text-white p-3 rounded-r-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-l-0 border-white/20 transition-all duration-300 ${isMobileSidebarOpen ? 'translate-x-[85vw] opacity-0' : 'translate-x-0 opacity-100'}`}
        >
          <BookOpen size={20} className="animate-pulse" />
        </button>

        {/* Sidebar (Desktop + Mobile Slide-over) */}
        <div className={`fixed inset-y-0 left-0 z-[50] w-[85vw] max-w-sm bg-slate-900 border-r border-slate-800 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar transform transition-transform duration-500 ease-in-out lg:relative lg:w-80 lg:translate-x-0 lg:flex shrink-0 ${isMobileSidebarOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full lg:shadow-none'}`}>
          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{t.title}</h2>
              <p className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          {renderSearchSection()}
          {renderHistorySection()}
        </div>

        <div className="flex-1 flex flex-row w-full relative overflow-hidden">
        {/* Center Area: PDF Viewer Pipeline */}
        <div className="flex-1 bg-slate-950 relative flex flex-col w-full h-full">
           
           {fetchState === 'idle' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0f172a] h-full relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-3xl"></div>
               <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>

               <div className="w-28 h-28 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(239,68,68,0.3)] relative z-10">
                 <BookOpen size={56} className="drop-shadow-lg"/>
                 <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg animate-bounce"><Sparkles size={20}/></div>
               </div>

               <h3 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-500 to-indigo-400 mb-6 tracking-tight relative z-10 drop-shadow-sm">
                 Premium Vector Jumper
               </h3>
               
               <p className="text-slate-300 max-w-lg leading-relaxed font-bold text-sm relative z-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl">
                 The ultimate zero-latency document search. Open the search dock below, select a book, and search a topic. <br/><br/>
                 <span className="text-emerald-400">✨ Watch the UI transform dynamically with AI Topic Clouds, Heatmaps, and On-Demand Explanations!</span>
               </p>
             </div>
           ) : fetchState === 'cors_error' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0f172a] h-full">
               <ShieldAlert size={60} className="mx-auto text-amber-500 mb-4 opacity-80"/>
               <h3 className="text-xl font-bold text-white mb-2">Supabase CORS Blocked PDF</h3>
               <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
                 Your browser blocked the PDF from rendering securely due to Supabase CORS policies. Please enable GET requests in your storage bucket or open the raw file directly below.
               </p>
               {rawSignedUrl && (
                 <button onClick={handleOpenManually} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-black tracking-wide shadow-lg active:scale-95 transition-all">
                   <ExternalLink size={18}/> Open PDF Manually
                 </button>
               )}
             </div>
           ) : fetchState !== 'ready' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0f172a] h-full animate-pulse">
               <Loader2 size={50} className="animate-spin text-red-500 mb-4"/>
               <h3 className="text-lg font-black text-white tracking-widest uppercase">
                 {fetchState === 'fetching_url' && "Generating Secure Link..."}
                 {fetchState === 'downloading_blob' && "Downloading Binary Data..."}
                 {fetchState === 'creating_blob' && "Decoding PDF Engine..."}
               </h3>
               <p className="text-slate-500 text-xs mt-2 font-mono">Bypassing browser MIME type restrictions...</p>
             </div>
           ) : (
             <div className="w-full h-full flex flex-col bg-slate-900 relative">
               
               <div className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 shadow-md">
                 <span className="text-xs font-black tracking-widest text-emerald-400 uppercase flex items-center gap-2"><CheckCircle2 size={14}/> Secure Render Active</span>
                 {rawSignedUrl && (
                   <button onClick={handleOpenManually} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95">
                     <ExternalLink size={14}/> {t.openNewTab}
                   </button>
                 )}
               </div>

               {isLoading && (
                 <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
                    <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_30px_rgba(239,68,68,1)] z-50" />
                    <div className="bg-slate-900 border border-red-500/50 p-6 rounded-3xl flex flex-col items-center shadow-2xl">
                      <Loader2 size={40} className="animate-spin text-red-500 mb-3" />
                      <h3 className="text-sm font-black text-white tracking-widest uppercase animate-pulse">Vector Scanning</h3>
                    </div>
                 </div>
               )}

                 <div className="flex-1 w-full relative group">
                   {selectedFileUrl && (
                      <>
                        <iframe 
                          key={`${selectedFileUrl}-${pageNumber}-${query}`} 
                          src={
                            typeof window !== 'undefined' && window.innerWidth < 768 && rawSignedUrl 
                              ? `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(rawSignedUrl)}#page=${pageNumber}&search=${encodeURIComponent(snippets[pageNumber] ? snippets[pageNumber].substring(0, 40) : query.trim())}`
                              : `${selectedFileUrl}#search=${encodeURIComponent(snippets[pageNumber] ? snippets[pageNumber].substring(0, 40) : query.trim())}&page=${pageNumber}`
                          }
                          className="absolute inset-0 w-full h-full border-none bg-slate-100"
                          title="PDF Document"
                        />
                        
                        {snippets[pageNumber] && (
                          <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-indigo-900/90 backdrop-blur-md border border-indigo-500/50 rounded-2xl p-4 shadow-[0_10px_30px_rgba(79,70,229,0.4)] z-40 pointer-events-none"
                          >
                            <div className="flex items-center gap-2 mb-2 text-indigo-300">
                              <Target size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Vector Match Found</span>
                            </div>
                            <p className="text-xs text-white font-medium leading-relaxed italic border-l-2 border-indigo-400 pl-3">
                              "{snippets[pageNumber]}"
                            </p>
                          </motion.div>
                        )}
                        {snippets[pageNumber] && (
                          <button 
                            onClick={handleExplainPage}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 md:bottom-8 z-30 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black tracking-widest uppercase rounded-full shadow-[0_10px_30px_rgba(79,70,229,0.5)] hover:shadow-[0_10px_40px_rgba(79,70,229,0.8)] hover:-translate-y-1 transition-all flex items-center gap-2 border border-white/20 backdrop-blur-md"
                          >
                            <Sparkles size={16}/> Explain Page
                          </button>
                        )}
                      </>
                   )}
                 </div>

             </div>
           )}
        </div>

        {/* RIGHT EDGE: THE HEATMAP SCROLLBAR */}
        <div className="w-12 md:w-16 bg-slate-950 border-l border-slate-800 relative shadow-inner group shrink-0 z-20">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 pointer-events-none"></div>
          
          <div className="h-full w-full relative">
             <div className="absolute top-0 left-0 w-full h-full bg-slate-900/50"></div>
             
             <AnimatePresence>
               {hitPages.length > 0 && hitPages.map((page, index) => {
                 const topPercent = (page / assumedTotalPages) * 100;
                 const isActive = page === pageNumber;
                 
                 return (
                   <motion.div
                     initial={{ opacity: 0, scaleX: 0 }}
                     animate={{ opacity: 1, scaleX: 1 }}
                     key={`${page}-${index}`}
                     onClick={() => setPageNumber(page)}
                     style={{ top: `${Math.min(topPercent, 95)}%` }} 
                     className={`absolute left-0 w-full cursor-pointer transition-all duration-300 origin-left 
                       ${isActive ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] z-20 h-2' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] hover:bg-red-400 hover:h-2 z-10 h-1.5'}
                     `}
                     title={`Topic found on Page ${page}`}
                   />
                 );
               })}
             </AnimatePresence>
          </div>
          
          <div className="absolute bottom-4 right-14 md:right-20 w-max text-right opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <span className="bg-slate-900 text-red-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-red-500/30 shadow-xl whitespace-nowrap">
              {t.clickToJump}
            </span>
          </div>
        </div>

        </div>
        {/* Mobile Floating Input Dock */}
        <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
          <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
            <button 
              onClick={() => setIsMobileDrawerOpen('history')} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 border border-slate-700"
            >
              <History size={18} /> {t.history}
            </button>
            <button 
              onClick={() => setIsMobileDrawerOpen('search')} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all active:scale-95 border border-red-500/50"
            >
              <Search size={18} /> Search
            </button>
          </div>
        </div>

        {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
        <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
          
          {/* Search Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'search' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderSearchSection()}
          </div>

          {/* History Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'history' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderHistorySection()}
          </div>
        </div>

      </div>
      
      <OutOfTokensModal 
        isOpen={isTokenModalOpen} 
        onClose={() => setIsTokenModalOpen(false)} 
      />
    
      <AnimatePresence>
        {showExplainModal && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/30 shadow-[0_20px_50px_rgba(79,70,229,0.3)] p-6 rounded-3xl z-[150]">
            <button onClick={() => setShowExplainModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            <h3 className="text-sm font-black text-indigo-400 mb-3 flex items-center gap-2"><Sparkles size={16}/> AI Page Summary</h3>
            {isExplaining ? (
              <div className="flex items-center gap-3 text-slate-300 text-xs font-bold animate-pulse">
                <Loader2 size={16} className="animate-spin text-indigo-500"/> Reading page contents...
              </div>
            ) : (
              <p className="text-sm text-slate-200 leading-relaxed font-medium">{explanation}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </SecureLayout>
  );
}
