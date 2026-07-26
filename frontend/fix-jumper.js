const fs = require('fs');

const originalLines = fs.readFileSync('src/app/book-jumper/page.tsx', 'utf8').split('\n');
const startIdx = originalLines.findIndex(l => l.includes('const handleGenerateHeatmap = async'));
const safeHead = originalLines.slice(0, startIdx).join('\n');

const restOfTheFile = `
  const handleExplainPage = async () => {
    if (!snippets[pageNumber]) return;
    setIsExplaining(true);
    setShowExplainModal(true);
    setExplanation('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? \`\${apiUrlBase}/bookjumper/explain\` : \`\${apiUrlBase}/api/bookjumper/explain\`;
      const response = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${session?.access_token}\` },
        body: JSON.stringify({ query, snippet: snippets[pageNumber] })
      });
      const data = await response.json();
      if (data.success) {
        setExplanation(data.explanation);
      } else {
        setExplanation(data.error || "Failed to generate explanation.");
      }
    } catch (e) {
      setExplanation("Network error while generating explanation.");
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
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? \`\${apiUrlBase}/bookjumper/heatmap\` : \`\${apiUrlBase}/api/bookjumper/heatmap\`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session?.access_token}\`
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
          setSearchFeedback({ message: \`Found matches on \${data.hitPages.length} pages!\`, type: 'success' });
          if (window.innerWidth < 768) setIsSidebarOpen(false); 
        } else {
          setHitPages([]);
          setSearchFeedback({ message: \`No matches found for "\${query}".\`, type: 'error' });
        }
        fetchHistory();
      } else { 
        setSearchFeedback({ message: data.error || "Failed to scan book.", type: 'error' }); 
      }
    } catch (error) { 
      setSearchFeedback({ message: "Server connection error.", type: 'error' }); 
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
      if (window.innerWidth < 768) setIsSidebarOpen(false);
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
        const link = \`\${window.location.origin}/time-bomb/\${data.id}\`;
        setShareLink(link);
      } else {
        throw new Error(error?.message || "Failed to save to database");
      }
    } catch (err: any) {
      console.error("Share failed:", err);
      setSearchFeedback({ message: \`Share Failed: \${err.message}\`, type: 'error' });
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={\`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border \${searchFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}\`}>
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
                    className={\`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all \${pageNumber === page ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-red-500/50'}\`}
                  >
                    Pg {page}
                  </button>
                  {snippets[page] && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                      <p className="text-[10px] text-slate-300 leading-relaxed italic line-clamp-4">"\${snippets[page]}"</p>
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
        <div className={\`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border \${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] shrink-0\`}>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><BookOpen size={16} className="text-red-500"/> Jumper</h2>
            <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">Smart Indexer</p>
          </div>
          <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-red-600 text-white shadow-md hover:bg-red-500">Chat</button>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-full lg:w-80 bg-slate-900 border-r border-slate-800 p-6 flex-col z-10 shrink-0 h-full overflow-y-auto custom-scrollbar">
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
                          key={\`\${selectedFileUrl}-\${pageNumber}-\${query}\`} 
                          src={\`\${selectedFileUrl}#search=\${encodeURIComponent(query.trim())}&page=\${pageNumber}\`} 
                          className="absolute inset-0 w-full h-full border-none bg-slate-100"
                          title="PDF Document"
                        />
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
                     key={\`\${page}-\${index}\`}
                     onClick={() => setPageNumber(page)}
                     style={{ top: \`\${Math.min(topPercent, 95)}%\` }} 
                     className={\`absolute left-0 w-full cursor-pointer transition-all duration-300 origin-left 
                       \${isActive ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] z-20 h-2' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] hover:bg-red-400 hover:h-2 z-10 h-1.5'}
                     \`}
                     title={\`Topic found on Page \${page}\`}
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

        {/* Mobile Floating Input Dock */}
        <div className="lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-transparent flex flex-col items-center pb-6">
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
        <div className={\`fixed inset-0 z-[100] lg:hidden transition-all duration-300 \${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}\`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
          
          {/* Search Drawer */}
          <div className={\`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 \${isMobileDrawerOpen === 'search' ? 'translate-y-0' : 'translate-y-full'}\`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderSearchSection()}
          </div>

          {/* History Drawer */}
          <div className={\`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 \${isMobileDrawerOpen === 'history' ? 'translate-y-0' : 'translate-y-full'}\`}>
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
\`;

const fullCode = safeHead + '\\n' + restOfTheFile;
fs.writeFileSync('src/app/book-jumper/page.tsx', fullCode);
console.log('Successfully rebuilt page.tsx from safe head!');
