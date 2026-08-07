'use client';
import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import MarkdownEditor from '@/components/workspace/MarkdownEditor';
import { createClient } from '@/lib/supabase/client';
import { FileText, Plus, Search, Trash2, Menu, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  title: string;
  content_md: string;
  tags: string[];
  updated_at: string;
}
const translations = {
  English: { workspace: "Workspace", newNote: "New Note", searchNotes: "Search notes...", noNotesFound: "No notes found", untitledNote: "Untitled Note", aiWorkspaceTitle: "Your AI Workspace", aiWorkspaceDesc: "Create smart notes using Markdown and LaTeX. Your notes are automatically embedded for RAG, meaning you can ask AI questions about them later!", createFirstNote: "Create First Note" },
  Bangla: { workspace: "ওয়ার্কস্পেস", newNote: "নতুন নোট", searchNotes: "নোট খুঁজুন...", noNotesFound: "কোনো নোট পাওয়া যায়নি", untitledNote: "নামবিহীন নোট", aiWorkspaceTitle: "আপনার এআই ওয়ার্কস্পেস", aiWorkspaceDesc: "মার্কডাউন এবং ল্যাটেক ব্যবহার করে স্মার্ট নোট তৈরি করুন। আপনার নোটগুলো স্বয়ংক্রিয়ভাবে RAG এর জন্য এমবেড করা হয়, যার মানে আপনি পরে এআইকে এগুলোর ওপর প্রশ্ন করতে পারবেন!", createFirstNote: "প্রথম নোট তৈরি করুন" },
  Hindi: { workspace: "कार्यक्षेत्र", newNote: "नया नोट", searchNotes: "नोट खोजें...", noNotesFound: "कोई नोट नहीं मिला", untitledNote: "अनाम नोट", aiWorkspaceTitle: "आपका एआई कार्यक्षेत्र", aiWorkspaceDesc: "मार्कडाउन और लेटेक्स का उपयोग करके स्मार्ट नोट्स बनाएं। आपके नोट्स स्वचालित रूप से RAG के लिए एम्बेड किए जाते हैं, जिसका अर्थ है कि आप बाद में एआई से उनके बारे में प्रश्न पूछ सकते हैं!", createFirstNote: "पहला नोट बनाएं" }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [uiTheme, setUiTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<LanguageType>('English');
  
  const supabase = createClient();

  const getApiUrl = (path: string) => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    url = url.replace(/\/+$/, '');
    return url.endsWith('/api') ? `${url}${path}` : `${url}/api${path}`;
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Theme logic
    const loadSettings = () => {
      const savedTheme = localStorage.getItem('Prepia_theme'); 
      if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
    };
    loadSettings();
    window.addEventListener('settingsChanged', loadSettings);
    
    fetchNotes();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('settingsChanged', loadSettings);
    };
  }, []);

  useEffect(() => {
    if (activeNoteId) fetchSingleNote(activeNoteId);
  }, [activeNoteId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(getApiUrl('/notes'), {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        setNotes(json.notes);
        if (json.notes.length > 0 && !activeNoteId && !isMobile) {
          setActiveNoteId(json.notes[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleNote = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(getApiUrl(`/notes/${id}`), {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActiveNote(json.note);
        if (isMobile) setSidebarOpen(false); // Auto close sidebar on mobile when note is selected
      }
    } catch (e) { console.error(e); }
  };

  const createNote = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(getApiUrl('/notes'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: translations[language].untitledNote, content_md: '', tags: [] })
      });
      const json = await res.json();
      if (json.success) {
        setNotes([json.note, ...notes]);
        setActiveNoteId(json.note.id);
        if (isMobile) setSidebarOpen(false);
      }
    } catch (e) { console.error(e); toast.error('Failed to create note'); }
  };

  const saveNote = async (updatedNote: Note) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(getApiUrl(`/notes/${updatedNote.id}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNote)
      });
      
      // Update local list title and content without re-fetching everything
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? { ...n, ...updatedNote, updated_at: new Date().toISOString() } : n));
    } catch (e) { console.error(e); throw e; }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(getApiUrl(`/notes/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (activeNoteId === id) {
          setActiveNote(null);
          setActiveNoteId(null);
          if (isMobile) setSidebarOpen(true);
        }
        toast.success('Note deleted');
      }
    } catch (e) { console.error(e); toast.error('Failed to delete note'); }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const themeClasses = {
    bg: uiTheme === 'dark' ? 'bg-slate-900' : 'bg-white',
    text: uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800',
    sidebarBg: uiTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-50',
    border: uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200',
    hover: uiTheme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-200',
    activeNode: uiTheme === 'dark' ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-indigo-50 border-indigo-200',
    muted: uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500',
    inputBg: uiTheme === 'dark' ? 'bg-slate-800/50' : 'bg-white',
  };

  const t = translations[language];

  return (
    <SecureLayout>
      <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto md:p-4">
        
        {/* Mobile Header Toggle */}
        <div className={`md:hidden flex items-center justify-between p-4 border-b ${themeClasses.border} ${themeClasses.bg}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg ${themeClasses.hover}`}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className={`font-black text-lg ${themeClasses.text}`}>{t.workspace}</h1>
          </div>
          <button onClick={createNote} className="p-2 bg-indigo-600 text-white rounded-lg shadow-md active:scale-95">
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          
          {/* SIDEBAR (List of notes) */}
          <div className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 shrink-0 border-r ${themeClasses.border} ${themeClasses.sidebarBg} rounded-l-2xl absolute md:relative z-10 h-full`}>
            
            <div className="p-4 flex flex-col gap-4">
              <button onClick={createNote} className="hidden md:flex w-full items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all active:scale-95">
                <Plus size={18} /> {t.newNote}
              </button>

              <div className="relative">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.muted}`} />
                <input 
                  type="text" 
                  placeholder={t.searchNotes} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all ${themeClasses.inputBg} ${themeClasses.border} focus:border-indigo-500 ${themeClasses.text}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className={`animate-spin ${themeClasses.muted}`} /></div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center p-8">
                  <FileText className={`mx-auto mb-2 opacity-20 ${themeClasses.text}`} size={32} />
                  <p className={`text-sm font-bold ${themeClasses.muted}`}>{t.noNotesFound}</p>
                </div>
              ) : (
                filteredNotes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => setActiveNoteId(note.id)}
                    className={`group p-3 rounded-xl cursor-pointer border transition-all flex flex-col gap-1 ${activeNoteId === note.id ? themeClasses.activeNode : `border-transparent ${themeClasses.hover}`}`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className={`font-bold text-sm truncate ${themeClasses.text}`}>{note.title || t.untitledNote}</h3>
                      <button onClick={(e) => deleteNote(note.id, e)} className={`opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/20 text-rose-500 transition-opacity`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500">#{t}</span>
                        ))}
                      </div>
                    )}
                    <span className={`text-xs ${themeClasses.muted}`}>
                      {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MAIN EDITOR AREA */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-100 dark:bg-slate-900/50 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
            {activeNote ? (
              <MarkdownEditor 
              initialNote={activeNote} 
              onSave={saveNote}
              isMobile={isMobile}
              onBack={() => setSidebarOpen(true)}
            />) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl ${uiTheme === 'dark' ? 'bg-slate-800 text-indigo-400' : 'bg-white text-indigo-600'}`}>
                  <FileText size={40} />
                </div>
                <h2 className={`text-2xl font-black mb-2 ${themeClasses.text}`}>{t.aiWorkspaceTitle}</h2>
                <p className={`max-w-md mx-auto font-medium ${themeClasses.muted}`}>
                  {t.aiWorkspaceDesc}
                </p>
                <button onClick={createNote} className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                  <Plus size={18} /> {t.createFirstNote}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </SecureLayout>
  );
}
