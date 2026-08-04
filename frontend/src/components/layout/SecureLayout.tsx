'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReferralWelcomeModal from '@/components/modals/ReferralWelcomeModal';
import ProUpgradeModal from '@/components/modals/ProUpgradeModal';
import FeedbackWidget from '@/components/ui/FeedbackWidget';
import { 
  Home, FileText, Search, User, LogOut, X, Plus, BookOpen, Clock, Lightbulb, Link as LinkIcon, AlertCircle, BookMarked,
  MessageSquare, BrainCircuit, BarChart3, Settings, Calculator, Zap, FileSignature, 
  MapPin, ShieldAlert, Sparkles, Layers, Book, Radar, Headphones, Mic, Beaker, CalendarDays, Projector, Network, Cpu, Smartphone, Orbit, Hourglass, Eye, CalendarCheck, Swords, LineChart as ChartIcon, MonitorPlay, Map, Briefcase, GraduationCap, Pickaxe, Flame, ChevronRight, Castle, Medal, Gift } from 'lucide-react';
import Omnibar from '@/components/layout/Omnibar';
import RewardClaimer from '@/components/RewardClaimer';


export default function SecureLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileViewerOpen, setIsProfileViewerOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const profileViewerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const supabase = createClient();
  const [tokens, setTokens] = useState<number | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null }>({ full_name: null, avatar_url: null });
  const [userEmail, setUserEmail] = useState('');
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean>(false);

  // 🟢 Handle Pro Upgrade Popup & Token Fetch
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('showProUpgradePopup') === 'true') {
      setIsProModalOpen(true);
      localStorage.removeItem('showProUpgradePopup');
    }
    
    const checkAuthAndFetchTokens = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setUserEmail(session?.user?.email || '');
      
      const publicPaths = ['/pricing', '/privacy-policy', '/terms-of-service', '/refund-policy', '/docs'];
      const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));

      if (!session && !isPublicPath) {
        router.replace('/login');
        return;
      }

      if (session?.user?.id) {
         const { data } = await supabase.from('profiles').select('tokens, tier, full_name, avatar_url').eq('id', session.user.id).single();
         if (data) {
           setTokens(data.tokens);
           setUserTier(data.tier || 'free');
           setProfile({ full_name: data.full_name || null, avatar_url: data.avatar_url || null });
         }
      }
      setIsCheckingAuth(false);
    };
    checkAuthAndFetchTokens();

    const handleTokenUpdate = (e: any) => {
      if (e.detail?.tokens) {
        setTokens(prev => (prev || 0) + e.detail.tokens);
      }
    };
    window.addEventListener('tokenUpdate', handleTokenUpdate);
    return () => window.removeEventListener('tokenUpdate', handleTokenUpdate);
  }, [pathname, router]);



  // 🟢 Handle Outside Click to Close Sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  // Close the compact profile viewer without affecting the global sidebar.
  useEffect(() => {
    const handleProfileOutsideClick = (event: MouseEvent) => {
      if (profileViewerRef.current && !profileViewerRef.current.contains(event.target as Node)) {
        setIsProfileViewerOpen(false);
      }
    };
    if (isProfileViewerOpen) document.addEventListener('mousedown', handleProfileOutsideClick);
    return () => document.removeEventListener('mousedown', handleProfileOutsideClick);
  }, [isProfileViewerOpen]);

  // 🟢 Close sidebar automatically when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // 🟢 Scroll Active Link into View when Sidebar Opens
  useEffect(() => {
    if (isSidebarOpen) {
      setTimeout(() => {
        const activeLink = document.getElementById('active-sidebar-link');
        if (activeLink) {
          activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50); // slight delay to ensure it renders before scrolling
    }
  }, [isSidebarOpen, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // 🟢 All Features List
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={20} />, color: 'text-slate-500' },
    { name: 'AI Notes Workspace', path: '/notes', icon: <FileText size={20} />, color: 'text-indigo-500' },
    { name: 'AI Tutor Chat', path: '/chat', icon: <MessageSquare size={20} />, color: 'text-blue-500' },
    { name: 'StoryMode', path: '/story', icon: <BookOpen size={20} />, color: 'text-amber-500' }, // 🟢 Story Page Added
    { name: 'Pro Solver', path: '/solver', icon: <Calculator size={20} />, color: 'text-indigo-600' }, // 🟢 Solver Page Added
    { name: 'Quiz Mode', path: '/quiz', icon: <BrainCircuit size={20} />, color: 'text-purple-500' },
    { name: 'Night Before Exam', path: '/night-before', icon: <Zap size={20} />, color: 'text-red-500' },
    { name: 'Exam Oracle', path: '/dashboard/oracle', icon: <Radar size={20} />, color: 'text-fuchsia-500' },

    { name: 'Mind Maps', path: '/mind-map', icon: <Network size={20} />, color: 'text-emerald-500' },
    { name: 'Flashcards', path: '/flashcards', icon: <Layers size={20} />, color: 'text-amber-500' },
    // { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} />, color: 'text-indigo-500' },
    // { name: 'Settings', path: '/settings', icon: <Settings size={20} />, color: 'text-slate-700' },
    { name: 'Audio Summary', path: '/podcast', icon: <Headphones size={20}/>, color: 'text-rose-500' },
    { name: 'Live Podcast', path: '/live', icon: <Mic size={20}/>, color: 'text-amber-500' },
    { name: '3D Chemistry Lab', path: '/molecule', icon: <Beaker size={20}/>, color: 'text-teal-500' },
    { name: 'Magic Study Planner', path: '/planner', icon: <CalendarDays size={20}/>, color: 'text-indigo-600' }, 
    {name: 'AI Presentation Creator', path: '/presentation', icon: <Projector size={20}/>, color: 'text-indigo-600'},
    { name: 'Flowchart Generator', path: '/flowchart', icon: <Network size={20}/>, color: 'text-indigo-600'},
    {name: 'Logic Workspace', path: '/logicflow', icon: <Cpu size={20}/>, color: 'text-indigo-600'},
    { name: 'AI Wallpaper Generator', path: '/wallpaper', icon: <Smartphone size={20}/>, color: 'text-indigo-600'},
    { name: 'Knowledge Universe', path: '/universe', icon: <Orbit size={20}/>, color: 'text-indigo-600'},
    { name: 'Timeline Mapper', path: '/timeline', icon: <Hourglass size={20}/>, color: 'text-indigo-600'},
    { name: 'Bionic Reader', path: '/bionic-reader', icon: <Eye size={20} />, color: 'text-amber-500' },
    { name: 'Notes Purifier', path: '/notes-purifier', icon: <FileSignature size={20} />, color: 'text-emerald-600' },
    { name: 'Calendar Sync', path: '/calendar-sync', icon: <CalendarCheck size={20} />, color: 'text-emerald-500' },
    { name: 'Concept Battle', path: '/concept-battle', icon: <Swords size={20}/>, color: 'text-rose-500' },
    { name: 'Lab Auto-Grapher', path: '/lab-graph', icon: <ChartIcon size={20}/>, color: 'text-blue-600'},
    { name: 'YouTube Decoder', path: '/youtube-decoder', icon: <MonitorPlay size={20}/>, color: 'text-red-500' },
    { name: 'Focus Island', path: '/focus-island', icon: <Hourglass size={20}/>, color: 'text-indigo-500' },

    // { name: 'Rewards', path: '/rewards', icon: <Gift size={20}/>, color: 'text-emerald-500' },
    { name: 'Syllabus Quest', path: '/syllabus-tracker', icon: <Map size={20}/>, color: 'text-amber-500' },
    { name: 'Geo Mapper', path: '/geo-mapper', icon: <Map size={20}/>, color: 'text-blue-500' },
    { name: 'Career Pathway', path: '/career-hacker', icon: <Briefcase size={20}/>, color: 'text-green-500' },
    { name: 'Book Jumper', path: '/book-jumper', icon: <FileText size={20}/>, color: 'text-indigo-500' },
    // { name: 'Citation Machine', path: '/citation-machine', icon: <FileSignature size={20}/>, color: 'text-indigo-500' },
    // 🟢 navItems অ্যারেতে নিচের লাইনটি অ্যাড করুন:
{ name: 'Alumni Bounty Board', path: '/dashboard/bounty-board', icon: <Medal size={20}/>, color: 'text-amber-500' },
  ];

  const publicPaths = ['/pricing', '/privacy-policy', '/terms-of-service', '/refund-policy', '/docs'];
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
  const shouldBlockContent = !isCheckingAuth && !hasSession && !isPublicPath;
  const profileLabel = profile.full_name?.trim() || userEmail.split('@')[0] || 'My Profile';
  const profileInitial = profileLabel.charAt(0).toUpperCase();

  if (isCheckingAuth || shouldBlockContent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-slate-950 flex flex-col relative selection:bg-emerald-500/30">
      
      {/* 🟢 Top Navigation Bar */}
        <header className="h-[60px] min-w-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 flex items-center px-2 sm:px-6 justify-between sticky top-0 z-30 shadow-sm transition-all duration-300">
          
          {/* Interactive Logo Area */}
          <div 
            className="flex min-w-0 shrink items-center gap-2 sm:gap-3 cursor-pointer group px-1.5 sm:px-3 py-2 rounded-xl hover:bg-slate-900 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
            onMouseEnter={() => setIsSidebarOpen(true)}
            onMouseDown={() => setIsSidebarOpen(false)}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
               <span className="text-white font-black text-lg leading-none">AI</span>
            </div>
            <div className="flex min-w-0 items-center gap-1">
               <span className="text-lg sm:text-xl font-black text-white tracking-tight">Prepia</span>
               <ChevronRight size={18} className="hidden sm:block text-slate-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Omnibar />
            
            {/* 💎 TOKEN BALANCE (NEW) */}
            {tokens !== null && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {userTier.toUpperCase() === 'PRO' && (
                  <div className="flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-[0_0_10px_rgba(168,85,247,0.4)] hover:shadow-[0_0_15px_rgba(168,85,247,0.7)] transition-all cursor-default">
                    <span className="text-[9px] sm:text-[10px] font-black text-white tracking-widest uppercase">PRO</span>
                  </div>
                )}
                <div className="flex items-center gap-1 sm:gap-2 bg-slate-900 border border-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-inner">
                   <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                     <Zap size={8} className="text-white fill-white sm:w-[10px] sm:h-[10px]" />
                   </div>
                   <span className="text-xs sm:text-sm font-black text-slate-300 tracking-tight">{tokens.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* 🔴 THE PANIC BUTTON (FEAR HOOK) 🔴 */}
            <Link 
              href="/dashboard/panic"
              aria-label="Open Panic Mode"
              className="relative overflow-hidden group flex items-center gap-2 bg-rose-100 hover:bg-rose-600 border border-rose-500/50 text-rose-600 hover:text-white px-2 sm:px-4 py-2 rounded-xl font-black tracking-widest uppercase text-xs transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] animate-pulse"
            >
              <Zap size={16} className="group-hover:animate-bounce" />
              <span className="hidden sm:inline">Panic Mode</span>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
            </Link>

            {/* Compact iPhone-style profile section; separate from navigation. */}
            <div ref={profileViewerRef} className="relative">
              <button
                type="button"
                aria-label="Open profile section"
                aria-expanded={isProfileViewerOpen}
                className="w-10 h-10 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center cursor-pointer hover:border-emerald-500/60 hover:bg-slate-800 transition overflow-hidden shadow-sm"
                onClick={() => setIsProfileViewerOpen((open) => !open)}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Your profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-emerald-300">{profileInitial}</span>
                )}
              </button>

              {isProfileViewerOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-[1.6rem] border border-slate-700/80 bg-slate-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                  <Link href="/settings" onClick={() => setIsProfileViewerOpen(false)} className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-800/80 p-3 transition hover:bg-slate-800">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-600/20 border border-emerald-500/40 overflow-hidden flex items-center justify-center">
                      {profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile" className="w-full h-full object-cover" /> : <span className="font-black text-emerald-300">{profileInitial}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">{profileLabel}</p>
                      <p className="truncate text-xs text-slate-400">{userEmail || 'View profile'}</p>
                      <span className="mt-1 inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">{userTier}</span>
                    </div>
                  </Link>
                  <div className="space-y-1">
                    <Link href="/settings" onClick={() => setIsProfileViewerOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"><Settings size={18} className="text-slate-400" /> Settings</Link>
                    <Link href="/rewards" onClick={() => setIsProfileViewerOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"><Gift size={18} className="text-emerald-400" /> Rewards</Link>
                    <Link href="/analytics" onClick={() => setIsProfileViewerOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"><BarChart3 size={18} className="text-indigo-400" /> Analytics</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

      {/* 🟢 Dark Overlay when Sidebar is Open (FIX: Added onClick to close smoothly) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity cursor-pointer" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🟢 Sliding Sidebar Navigation */}
      <div 
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-72 bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col border-r border-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Profile viewer, followed by the existing full feature navigation */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-start justify-between gap-3">
            <Link href="/settings" className="flex min-w-0 items-center gap-3 group" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-11 h-11 shrink-0 rounded-full bg-emerald-600/20 border border-emerald-500/40 overflow-hidden flex items-center justify-center">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile" className="w-full h-full object-cover" /> : <span className="font-black text-emerald-300">{profileInitial}</span>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white group-hover:text-emerald-300 transition-colors">{profileLabel}</p>
                <p className="truncate text-xs text-slate-400">{userEmail || 'View your profile'}</p>
                <span className="mt-1 inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-emerald-300 uppercase">{userTier}</span>
              </div>
            </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Main Menu</p>
          
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Link 
                id={isActive ? 'active-sidebar-link' : undefined}
                href={item.path} 
                key={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className={`${isActive ? 'text-emerald-400' : item.color} transition-colors`}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      {/* 🟢 Main Content Area */}
      <main className="flex-1 relative z-0">
        {children}
      </main>
      <ReferralWelcomeModal />
      <ProUpgradeModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
      <FeedbackWidget />
      <RewardClaimer />
    </div>
  );
}
