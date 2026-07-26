const fs = require('fs');

let code = fs.readFileSync('src/app/book-jumper/page.tsx', 'utf8');

// 1. Imports
if (!code.includes('Sparkles, X')) {
  code = code.replace(
    `import { Search, History, BookOpen, AlertCircle, CheckCircle2, Target, Loader2, Share2, Copy, ShieldAlert, ExternalLink } from 'lucide-react';`, 
    `import { Search, History, BookOpen, AlertCircle, CheckCircle2, Target, Loader2, Share2, Copy, ShieldAlert, ExternalLink, Sparkles, X } from 'lucide-react';`
  );
}

// 2. States
if (!code.includes('const [snippets')) {
  code = code.replace(
    `const [rawSignedUrl, setRawSignedUrl] = useState<string>('');`, 
    `const [rawSignedUrl, setRawSignedUrl] = useState<string>('');\n  const [snippets, setSnippets] = useState<{ [key: number]: string }>({});\n  const [relatedTags, setRelatedTags] = useState<string[]>([]);\n  const [isExplaining, setIsExplaining] = useState(false);\n  const [explanation, setExplanation] = useState('');\n  const [showExplainModal, setShowExplainModal] = useState(false);`
  );
}

// 3. Reset states on search
code = code.replace(
  `setIsLoading(true); setHitPages([]); setSearchFeedback(null); setShareLink(null);`, 
  `setIsLoading(true); setHitPages([]); setSnippets({}); setRelatedTags([]); setSearchFeedback(null); setShareLink(null);`
);

// 4. Update on search success
if (!code.includes('setSnippets(data.snippets')) {
  code = code.replace(
    `setHitPages(data.hitPages);`, 
    `setHitPages(data.hitPages);\n          setSnippets(data.snippets || {});\n          setRelatedTags(data.relatedTags || []);`
  );
}

// 5. Add Explain handler
const explainHandler = `
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
`;

if (!code.includes('handleExplainPage')) {
  code = code.replace('  const handleGenerateHeatmap = async', explainHandler + '\n  const handleGenerateHeatmap = async');
}

// 6. Update the hitPages dropdown to tooltip buttons
const oldDropdown = `<AnimatePresence>
        {hitPages.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5">Jump to Match Points:</label>
            <select 
              value={pageNumber} 
              onChange={(e) => setPageNumber(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs font-bold focus:border-red-500 outline-none text-slate-300 appearance-none cursor-pointer custom-scrollbar"
            >
              {hitPages.map((page, idx) => (
                <option key={page} value={page}>
                  Match {idx + 1} (Page {page})
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>`;

const newJumpers = `<AnimatePresence>
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
                  {/* Hover Tooltip */}
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
      </AnimatePresence>`;

code = code.replace(oldDropdown, newJumpers);

// 7. Add Topic Cloud
const topicCloud = `
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
`;

if (!code.includes('Related Topics:')) {
  code = code.replace('</form>', topicCloud + '\n    </form>');
}

// 8. Add Explain Button & Modal
const explainButton = `
                 <div className="flex-1 w-full relative group">
                   {selectedFileUrl && (
                      <>
                        <iframe 
                          key={\`\${selectedFileUrl}-\${pageNumber}-\${query}\`} 
                          src={\`\${selectedFileUrl}#search=\${encodeURIComponent(query.trim())}&page=\${pageNumber}\`} 
                          className="absolute inset-0 w-full h-full border-none bg-slate-100"
                          title="PDF Document"
                        />
                        {/* Explain Floating Button */}
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
`;

if (!code.includes('Explain Page')) {
  // Replace the old iframe block
  const oldIframeBlock = `<div className="flex-1 w-full relative">
                 {selectedFileUrl && (
                    <iframe 
                      key={\`\${selectedFileUrl}-\${pageNumber}-\${query}\`} 
                      src={\`\${selectedFileUrl}#search=\${encodeURIComponent(query.trim())}&page=\${pageNumber}\`} 
                      className="absolute inset-0 w-full h-full border-none bg-slate-100"
                      title="PDF Document"
                    />
                 )}
               </div>`;
  code = code.replace(oldIframeBlock, explainButton);
  // Alternative replacement if oldIframeBlock has whitespace issues
  if (code.includes('absolute inset-0 w-full h-full border-none bg-slate-100') && !code.includes('Explain Page')) {
     const regex = /<div className="flex-1 w-full relative">.*?<\/div>/s;
     code = code.replace(regex, explainButton);
  }
}

const explainModal = `
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
`;

if (!code.includes('AI Page Summary')) {
  code = code.replace('</SecureLayout>', explainModal + '\n    </SecureLayout>');
}

fs.writeFileSync('src/app/book-jumper/page.tsx', code);
console.log('Book Jumper patched successfully with Premium Upgrades!');
