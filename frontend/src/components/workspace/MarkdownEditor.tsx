'use client';
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import { Eye, Edit3, Save, Check, Loader2, Tag as TagIcon, X, Heading1, Heading2, List, ListOrdered, CheckSquare, Image as ImageIcon, Video, Table, Code, History, Download, Share2, FileText } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content_md: string;
  tags: string[];
}

interface MarkdownEditorProps {
  initialNote: Note;
  onSave: (note: Note) => Promise<void>;
  isMobile: boolean;
  onBack?: () => void;
}

const COMMANDS = [
  { id: 'h1', label: 'Heading 1', icon: <Heading1 size={16}/>, text: '# ' },
  { id: 'h2', label: 'Heading 2', icon: <Heading2 size={16}/>, text: '## ' },
  { id: 'h3', label: 'Heading 3', icon: <Heading2 size={16}/>, text: '### ' },
  { id: 'bullet', label: 'Bullet List', icon: <List size={16}/>, text: '- ' },
  { id: 'number', label: 'Numbered List', icon: <ListOrdered size={16}/>, text: '1. ' },
  { id: 'todo', label: 'To-do List', icon: <CheckSquare size={16}/>, text: '- [ ] ' },
  { id: 'quote', label: 'Quote', icon: <Edit3 size={16}/>, text: '> ' },
  { id: 'code', label: 'Code Block', icon: <Code size={16}/>, text: '```\n\n```' },
  { id: 'table', label: 'Table', icon: <Table size={16}/>, text: '\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n' },
  { id: 'youtube', label: 'YouTube Video', icon: <Video size={16}/>, text: '[youtube 100%](https://www.youtube.com/watch?v=)' },
  { id: 'link', label: 'Embed Link', icon: <ImageIcon size={16}/>, text: '[embed 100%](https://)' },
];

export default function MarkdownEditor({ initialNote, onSave, isMobile, onBack }: MarkdownEditorProps) {
  const [note, setNote] = useState<Note>(initialNote);
  const [view, setView] = useState<'edit' | 'preview' | 'split'>(isMobile ? 'edit' : 'split');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uiTheme, setUiTheme] = useState<'dark' | 'light'>('dark');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Slash Command State
  const [showMenu, setShowMenu] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<'editor' | 'preview' | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePrintPDF = () => {
    setShowExportMenu(false);
    const previousView = view;
    if (view === 'edit') setView('preview');
    
    setTimeout(() => {
      window.print();
      if (view === 'edit') setTimeout(() => setView(previousView), 500);
    }, 200);
  };

  const handleShareLink = () => {
    setShowExportMenu(false);
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: note.title || 'Prepia Note',
        text: 'Check out this note on Prepia',
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    const loadSettings = () => {
      const savedTheme = localStorage.getItem('Prepia_theme'); 
      if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
    };
    loadSettings();
    window.addEventListener('settingsChanged', loadSettings);
    return () => window.removeEventListener('settingsChanged', loadSettings);
  }, []);

  useEffect(() => {
    // Check local storage first
    const local = localStorage.getItem(`prepianote_${initialNote.id}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setNote(parsed);
        setSaveStatus('idle'); // indicates unsaved local changes
      } catch (e) {
        setNote(initialNote);
        setSaveStatus('idle');
      }
    } else {
      setNote(initialNote);
      setSaveStatus('idle');
    }
    
    // Instant jump near bottom, then smooth scroll the rest to save time
    setTimeout(() => {
      if (editorContainerRef.current) {
        const container = editorContainerRef.current;
        const targetScroll = Math.max(0, container.scrollHeight - container.clientHeight - 250);
        
        // Instant jump to a bit above the target so we don't scroll from the very top
        const jumpStart = Math.max(0, targetScroll - 600);
        container.scrollTo({ top: jumpStart, behavior: 'auto' });
        
        // Then smoothly scroll the remaining distance to give a nice entry effect
        setTimeout(() => {
          container.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }, 50);
      }
    }, 300);
  }, [initialNote.id]);

  // Flush local storage on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      const local = localStorage.getItem(`prepianote_${initialNote.id}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          onSave(parsed).catch(() => {});
        } catch(e){}
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const local = localStorage.getItem(`prepianote_${initialNote.id}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          onSave(parsed).then(() => {
            localStorage.removeItem(`prepianote_${initialNote.id}`);
          }).catch(console.error);
        } catch(e) {}
      }
    };
  }, [initialNote.id, onSave]);

  useEffect(() => {
    if (isMobile && view === 'split') {
      setView('edit');
    }
  }, [isMobile]);

  useEffect(() => {
    if (textareaRef.current && editorContainerRef.current) {
      // Save scroll position to prevent freezing/jumping while typing
      const parentScroll = editorContainerRef.current.scrollTop;
      textareaRef.current.style.height = '500px'; // Reset to min to accurately measure shrink
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(500, scrollHeight + 50) + 'px';
      editorContainerRef.current.scrollTop = parentScroll; // Restore scroll exactly
    }
    
    // Auto-scroll logic when typing near the bottom
    if (editorContainerRef.current) {
      const container = editorContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [note.content_md, view]);

  const handleEditorScroll = () => {
    if (view !== 'split' || !editorContainerRef.current || !previewRef.current) return;
    if (isScrollingRef.current === 'preview') return;
    isScrollingRef.current = 'editor';
    
    const editor = editorContainerRef.current;
    const preview = previewRef.current;
    
    const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    if (!isNaN(percentage)) {
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
    }
    
    setTimeout(() => { isScrollingRef.current = null; }, 50);
  };

  const handlePreviewScroll = () => {
    if (view !== 'split' || !editorContainerRef.current || !previewRef.current) return;
    if (isScrollingRef.current === 'editor') return;
    isScrollingRef.current = 'preview';
    
    const editor = editorContainerRef.current;
    const preview = previewRef.current;
    
    const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
    if (!isNaN(percentage)) {
      editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
    }
    
    setTimeout(() => { isScrollingRef.current = null; }, 50);
  };

  const triggerSave = async (updatedNote: Note) => {
    setSaveStatus('saving');
    setIsSaving(true);
    try {
      await onSave(updatedNote);
      setSaveStatus('saved');
      localStorage.removeItem(`prepianote_${updatedNote.id}`);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Note, value: string | string[]) => {
    const updatedNote = { ...note, [field]: value };
    setNote(updatedNote);
    
    // Auto-save to LocalStorage immediately
    localStorage.setItem(`prepianote_${updatedNote.id}`, JSON.stringify(updatedNote));
    setSaveStatus('idle');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(updatedNote);
    }, 10000); // 10 seconds debounce to avoid DB spam

    // Intelligent scroll sync: match preview to cursor position when typing
    if (field === 'content_md' && typeof value === 'string' && textareaRef.current && previewRef.current && view === 'split') {
      const cursorPos = textareaRef.current.selectionStart || 0;
      const textPercentage = cursorPos / (value.length || 1);
      
      const targetPreviewScroll = textPercentage * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
      
      // Momentarily prevent reverse-sync
      isScrollingRef.current = 'editor';
      
      previewRef.current.scrollTo({
        top: targetPreviewScroll,
        behavior: 'auto'
      });
      
      setTimeout(() => { isScrollingRef.current = null; }, 50);
    }

    // Check for Slash Command trigger
    if (field === 'content_md' && typeof value === 'string') {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const lastLine = lines[lines.length - 1];
      
      if (lastLine === '/') {
        setShowMenu(true);
        setMenuIndex(0);
      } else if (!lastLine.startsWith('/')) {
        setShowMenu(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuIndex(prev => (prev + 1) % COMMANDS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMenuIndex(prev => (prev - 1 + COMMANDS.length) % COMMANDS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCommand(COMMANDS[menuIndex]);
      } else if (e.key === 'Escape') {
        setShowMenu(false);
      }
      return;
    }

    if (e.key === 'Enter') {
      const target = e.currentTarget;
      const cursorPos = target.selectionStart;
      const textBefore = note.content_md.substring(0, cursorPos);
      const textAfter = note.content_md.substring(cursorPos);
      
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1];

      const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)/);
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)/);
      const todoMatch = currentLine.match(/^(\s*-\s*\[)[ x](\]\s+)(.*)/);
      const quoteMatch = currentLine.match(/^(\s*)(>)\s+(.*)/);

      let insertText = '';
      let shouldPrevent = false;
      let shouldDeleteLine = false;

      if (todoMatch) {
        if (!todoMatch[3].trim()) shouldDeleteLine = true;
        else insertText = `\n${todoMatch[1]} ${todoMatch[2]}`;
        shouldPrevent = true;
      } else if (numberMatch) {
        if (!numberMatch[3].trim()) shouldDeleteLine = true;
        else insertText = `\n${numberMatch[1]}${parseInt(numberMatch[2]) + 1}. `;
        shouldPrevent = true;
      } else if (quoteMatch) {
        if (!quoteMatch[3].trim()) shouldDeleteLine = true;
        else insertText = `\n${quoteMatch[1]}> `;
        shouldPrevent = true;
      } else if (bulletMatch) {
        if (!bulletMatch[3].trim()) shouldDeleteLine = true;
        else insertText = `\n${bulletMatch[1]}${bulletMatch[2]} `;
        shouldPrevent = true;
      }

      if (shouldPrevent) {
        e.preventDefault();
        
        if (shouldDeleteLine) {
          const newTextBefore = textBefore.substring(0, textBefore.length - currentLine.length);
          handleChange('content_md', newTextBefore + '\n' + textAfter);
          setTimeout(() => {
            target.selectionStart = newTextBefore.length + 1;
            target.selectionEnd = newTextBefore.length + 1;
          }, 0);
        } else {
          handleChange('content_md', textBefore + insertText + textAfter);
          setTimeout(() => {
            target.selectionStart = textBefore.length + insertText.length;
            target.selectionEnd = textBefore.length + insertText.length;
          }, 0);
        }
      }
    }
  };

  const executeCommand = (cmd: typeof COMMANDS[0]) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = note.content_md.substring(0, cursorPos);
    const textAfter = note.content_md.substring(cursorPos);
    
    const lastSlashIndex = textBefore.lastIndexOf('/');
    const newTextBefore = lastSlashIndex !== -1 ? textBefore.substring(0, lastSlashIndex) : textBefore;
    const newContent = newTextBefore + cmd.text + textAfter;
    
    handleChange('content_md', newContent);
    setShowMenu(false);
    
    // Focus back on text area
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = newTextBefore.length + cmd.text.length;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
      const newTag = e.currentTarget.value.trim().toLowerCase();
      if (!note.tags.includes(newTag)) {
        handleChange('tags', [...note.tags, newTag]);
      }
      e.currentTarget.value = '';
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleChange('tags', note.tags.filter(t => t !== tagToRemove));
  };

  const themeClasses = {
    bg: uiTheme === 'dark' ? 'bg-slate-900' : 'bg-white',
    text: uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800',
    border: uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200',
    muted: uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    inputBg: uiTheme === 'dark' ? 'bg-slate-900' : 'bg-white',
    paneBg: uiTheme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/50',
    tagBg: uiTheme === 'dark' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  return (
    <div className={`flex flex-col h-full ${themeClasses.bg} rounded-2xl md:rounded-l-none border-l-0 md:border-l shadow-xl md:shadow-none ${themeClasses.border} overflow-hidden`}>
      
      {/* Top Action Bar */}
      <div className={`flex items-center justify-between p-4 border-b ${themeClasses.border} shrink-0`}>
        
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {isMobile && onBack && (
            <button onClick={onBack} className={`p-2 rounded-lg flex shrink-0 items-center gap-1 ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
              <History size={18} />
            </button>
          )}
          
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 shrink-0">
            <button onClick={() => setView('edit')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'edit' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : themeClasses.muted}`}>
              <Edit3 size={16} className="inline mr-1 mb-0.5" /> Edit
            </button>
            {!isMobile && (
              <button onClick={() => setView('split')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'split' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : themeClasses.muted}`}>
                Split
              </button>
            )}
            <button onClick={() => setView('preview')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'preview' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : themeClasses.muted}`}>
              <Eye size={16} className="inline mr-1 mb-0.5" /> Preview
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative">
          <div className="hidden md:flex items-center gap-2">
            {saveStatus === 'saving' && <span className="flex items-center gap-1 text-xs font-bold text-amber-500"><Loader2 size={12} className="animate-spin" /> Saving</span>}
            {saveStatus === 'saved' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-500"><Check size={12} /> Saved</span>}
          </div>
          
          {/* Export Button */}
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm rounded-md transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          >
            <Download size={16} /> <span className="hidden sm:inline">Export</span>
          </button>
          
          {/* Export Dropdown Menu */}
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={handlePrintPDF} 
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <FileText size={16} /> Download PDF
              </button>
              <button 
                onClick={handleShareLink} 
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border-t border-slate-100 dark:border-slate-700"
              >
                <Share2 size={16} /> Share Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #preview-print-area, #preview-print-area * {
              visibility: visible;
            }
            #preview-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            ::-webkit-scrollbar { display: none; }
          }
        `}</style>
        
        {/* EDITOR PANE */}
        {(view === 'edit' || view === 'split') && (
          <div 
            ref={editorContainerRef}
            onScroll={handleEditorScroll}
            className={`flex-1 flex flex-col p-6 overflow-y-auto ${view === 'split' ? 'border-r ' + themeClasses.border : ''} relative`}
          >
            <input 
              type="text" 
              value={note.title} 
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Untitled Note"
              className={`text-3xl md:text-4xl font-black mb-4 bg-transparent outline-none ${themeClasses.text} placeholder:text-slate-300 dark:placeholder:text-slate-700 w-full`}
            />
            
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <TagIcon size={16} className={themeClasses.muted} />
              {note.tags.map(tag => (
                <span key={tag} className={`px-2.5 py-0.5 rounded-md text-xs font-bold border flex items-center gap-1 ${themeClasses.tagBg}`}>
                  #{tag} <X size={12} className="cursor-pointer hover:opacity-70" onClick={() => removeTag(tag)} />
                </span>
              ))}
              <input 
                type="text" 
                placeholder="Add tag..." 
                onKeyDown={handleTagAdd}
                className={`text-sm bg-transparent outline-none ${themeClasses.text} placeholder:text-slate-400 min-w-[100px]`}
              />
            </div>

            <div className="relative w-full pb-32">
              <textarea 
                ref={textareaRef}
                value={note.content_md}
                onChange={(e) => handleChange('content_md', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type '/' for commands, or start writing Markdown/LaTeX..."
                className={`w-full min-h-[500px] resize-none outline-none bg-transparent ${themeClasses.text} font-mono text-sm leading-relaxed overflow-hidden`}
              />
              
              {/* SLASH COMMAND MENU */}
              {showMenu && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] md:w-[450px] rounded-2xl shadow-2xl border-2 backdrop-blur-2xl z-[100] overflow-hidden transition-all animate-in slide-in-from-bottom-10 fade-in duration-300 ${uiTheme === 'dark' ? 'bg-slate-900/95 border-indigo-500/50' : 'bg-white/95 border-indigo-500/50'}`}>
                  <div className="px-4 py-3 text-xs font-black text-indigo-500 uppercase tracking-widest border-b border-indigo-500/20 bg-indigo-500/5">
                    Action Menu
                  </div>
                  <div className="max-h-[350px] overflow-y-auto p-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-1">
                    {COMMANDS.map((cmd, idx) => (
                      <button
                        key={cmd.id}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setMenuIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-semibold transition-all ${menuIndex === idx ? 'bg-indigo-600 text-white' : (uiTheme === 'dark' ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100')}`}
                      >
                        <div className={`p-1.5 rounded-md ${menuIndex === idx ? 'bg-white/20' : (uiTheme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>
                          {cmd.icon}
                        </div>
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PREVIEW PANE */}
        {(view === 'preview' || view === 'split') && (
          <div 
            id="preview-print-area"
            ref={previewRef}
            onScroll={handlePreviewScroll}
            className={`flex-1 p-6 overflow-y-auto prose prose-slate dark:prose-invert max-w-none ${themeClasses.paneBg} ${themeClasses.text}`}
          >
            {note.title && <h1 className="text-3xl md:text-4xl font-black mb-6">{note.title}</h1>}
            
            {note.content_md ? (
              <ReactMarkdown 
                remarkPlugins={[remarkMath, remarkGfm]} 
                rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]} // Enables HTML parsing properly & secures against XSS
                components={{
                  a: ({ node, ...props }) => {
                    // Parse optional width parameter, e.g. [youtube 50%] or [embed 300px]
                    let width = '100%';
                    let label = '';
                    let text = '';
                    if (typeof props.children === 'string') text = props.children;
                    else if (Array.isArray(props.children) && typeof props.children[0] === 'string') text = props.children[0];
                    
                    if (text) {
                      const parts = text.split(' ');
                      label = parts[0].toLowerCase();
                      if (parts[1]) width = parts[1];
                    }

                    // YOUTUBE EMBED HANDLER
                    const isYoutube = props.href && (props.href.includes('youtube.com/watch') || props.href.includes('youtu.be/'));
                    if (isYoutube) {
                      const videoId = props.href?.split('v=')[1]?.split('&')[0] || props.href?.split('youtu.be/')[1]?.split('?')[0];
                      return (
                        <span className="inline-block aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-black m-2 align-top" style={{ width: width === '100%' ? 'calc(100% - 16px)' : width, maxWidth: '100%' }}>
                          <iframe 
                            width="100%" 
                            height="100%" 
                            src={`https://www.youtube.com/embed/${videoId}`} 
                            title="YouTube video player" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                            className="border-none block"
                          ></iframe>
                        </span>
                      );
                    }
                    
                    // STANDARD LINK EMBED HANDLER (Colorful bookmark view)
                    if (label === 'embed' && props.href) {
                      let displayTitle = text.replace(/embed/i, '').trim();
                      const sizeParamMatch = displayTitle.match(/(\d+(?:%|px))/);
                      if (sizeParamMatch) {
                        displayTitle = displayTitle.replace(sizeParamMatch[0], '').trim();
                      }
                      if (!displayTitle) {
                        try { displayTitle = new URL(props.href).hostname; } 
                        catch { displayTitle = props.href; }
                      }
                      
                      return (
                        <a href={props.href} target="_blank" rel="noopener noreferrer" className="inline-block no-underline m-2 align-top group" style={{ width: width === '100%' ? 'calc(100% - 16px)' : width, maxWidth: '100%' }}>
                          <span className={`p-4 rounded-xl border flex items-center justify-between transition-all group-hover:shadow-lg ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}>
                            <span className="flex flex-col pr-4 overflow-hidden">
                              <span className="font-bold text-sm truncate text-indigo-600 dark:text-indigo-400">
                                {displayTitle}
                              </span>
                              <span className={`text-xs mt-1 truncate ${themeClasses.muted}`}>{props.href.replace(/^https?:\/\//, '')}</span>
                            </span>
                            <span className="shrink-0 p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                              <ImageIcon size={20} />
                            </span>
                          </span>
                        </a>
                      );
                    }

                    return <a target="_blank" rel="noopener noreferrer" {...props} />;
                  }
                }}
              >
                {note.content_md}
              </ReactMarkdown>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className={`italic ${themeClasses.muted}`}>Nothing to preview. Start writing!</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
