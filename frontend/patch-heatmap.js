const fs = require('fs');

let code = fs.readFileSync('src/app/book-jumper/page.tsx', 'utf8');

// Wrap Center Area and Heatmap
code = code.replace(
  `{/* Center Area: PDF Viewer Pipeline */}`,
  `<div className="flex-1 flex flex-row w-full relative overflow-hidden">
        {/* Center Area: PDF Viewer Pipeline */}`
);

code = code.replace(
  `{/* Mobile Floating Input Dock */}`,
  `</div>
        {/* Mobile Floating Input Dock */}`
);

// Add the Highlight Match Floating Banner and fix iframe search
const iframeMatch = `                      <iframe 
                          key={\`\${selectedFileUrl}-\${pageNumber}-\${query}\`} 
                          src={\`\${selectedFileUrl}#search=\${encodeURIComponent(query.trim())}&page=\${pageNumber}\`} 
                          className="absolute inset-0 w-full h-full border-none bg-slate-100"
                          title="PDF Document"
                        />`;

const updatedIframe = `                      <iframe 
                          key={\`\${selectedFileUrl}-\${pageNumber}-\${query}\`} 
                          src={\`\${selectedFileUrl}#search=\${encodeURIComponent(snippets[pageNumber] ? snippets[pageNumber].substring(0, 40) : query.trim())}&page=\${pageNumber}\`} 
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
                        )}`;

code = code.replace(iframeMatch, updatedIframe);

fs.writeFileSync('src/app/book-jumper/page.tsx', code);
console.log('Successfully patched page.tsx for layout and highlighter!');
