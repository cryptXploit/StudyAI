const fs = require('fs');
let code = fs.readFileSync('src/app/book-jumper/page.tsx', 'utf8');

if (!code.includes('isMobileSidebarOpen')) {
  // Add state
  code = code.replace(
    'const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);',
    'const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);\n  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);'
  );

  // Replace desktop sidebar
  const oldSidebar = '<div className="hidden lg:flex w-full lg:w-80 bg-slate-900 border-r border-slate-800 p-6 flex-col z-10 shrink-0 h-full overflow-y-auto custom-scrollbar">';
  const newSidebar = `{/* Mobile Sidebar Overlay */}
        <div 
          className={\`fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[45] lg:hidden transition-opacity duration-300 \${isMobileSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}\`} 
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        
        {/* Mobile Sidebar Toggle Button */}
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className={\`lg:hidden fixed top-1/2 -translate-y-1/2 left-0 z-[60] bg-gradient-to-r from-red-600 to-orange-600 text-white p-3 rounded-r-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-l-0 border-white/20 transition-all duration-300 \${isMobileSidebarOpen ? 'translate-x-[85vw] opacity-0' : 'translate-x-0 opacity-100'}\`}
        >
          <BookOpen size={20} className="animate-pulse" />
        </button>

        {/* Sidebar (Desktop + Mobile Slide-over) */}
        <div className={\`fixed inset-y-0 left-0 z-[50] w-[85vw] max-w-sm bg-slate-900 border-r border-slate-800 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar transform transition-transform duration-500 ease-in-out lg:relative lg:w-80 lg:translate-x-0 lg:flex shrink-0 \${isMobileSidebarOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full lg:shadow-none'}\`}>`;
  
  code = code.replace(oldSidebar, newSidebar);

  // Ensure sidebar closes when file is selected or search is generated on mobile
  // Note: the original code uses setIsSidebarOpen(false) which was for the bottom drawer
  code = code.replace(/setIsSidebarOpen\(false\)/g, 'setIsMobileSidebarOpen(false)');

  fs.writeFileSync('src/app/book-jumper/page.tsx', code);
  console.log('Mobile sidebar toggle added!');
} else {
  console.log('Already patched!');
}
