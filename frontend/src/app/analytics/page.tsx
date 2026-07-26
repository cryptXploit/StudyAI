'use client';

import React, { useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { 
  BarChart3, TrendingUp, Target, Award, BrainCircuit, History, Loader2, 
  Swords, Layers, BookOpen, Zap, Puzzle, ChevronRight, Activity, Flame
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

type LanguageType = 'English' | 'Bangla' | 'Hindi';

interface QuizResult {
  id: string; topic: string; correct_answers: number; total_questions: number; created_at: string;
}

export default function AnalyticsPage() {
  const supabase = createClient();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'flashcards' | 'arena' | 'knowledge'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // Lazy Loaded Data Caches
  const [overviewData, setOverviewData] = useState<any>(null);
  
  // Quiz Specific
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [topicStats, setTopicStats] = useState<any[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState(0);

  // Flashcards Specific
  const [flashcardDecks, setFlashcardDecks] = useState<any[]>([]);

  // Knowledge Base Specific
  const [filesCount, setFilesCount] = useState(0);

  useEffect(() => {
    if (activeTab === 'overview' && !overviewData) fetchOverviewData();
    if (activeTab === 'quizzes' && quizHistory.length === 0) fetchQuizData();
    if (activeTab === 'flashcards' && flashcardDecks.length === 0) fetchFlashcardData();
    if (activeTab === 'knowledge' && filesCount === 0) fetchKnowledgeData();
  }, [activeTab]);

  const fetchOverviewData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Parallel fetching for high-level overview
      const [quizRes, flashRes, fileRes] = await Promise.all([
        supabase.from('quiz_results').select('correct_answers, total_questions, topic').eq('user_id', user.id),
        supabase.from('flashcard_decks').select('id, topic').eq('user_id', user.id),
        supabase.from('files').select('id').eq('user_id', user.id)
      ]);

      const quizzes = quizRes.data || [];
      const flashcards = flashRes.data || [];
      const files = fileRes.data || [];

      // Crunch Overview Stats
      let totalCorrect = 0, totalAttempted = 0;
      let topicScores: Record<string, {s: number, t: number}> = {};
      
      quizzes.forEach(q => {
        const safeScore = Number(q.correct_answers) || 0;
        const safeTotal = Number(q.total_questions) || 1;
        const safeTopic = q.topic || 'Unknown';

        totalCorrect += safeScore;
        totalAttempted += safeTotal;
        if (!topicScores[safeTopic]) topicScores[safeTopic] = {s:0, t:0};
        topicScores[safeTopic].s += safeScore;
        topicScores[safeTopic].t += safeTotal;
      });

      const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
      
      // Calculate Brain Power Score (Gamified Metric)
      const brainPower = Math.round((accuracy * 0.5) + (quizzes.length * 10) + (flashcards.length * 15) + (files.length * 20));

      // Find Lacking Topic (lowest accuracy with at least 5 questions attempted)
      let lackingTopic = "None";
      let lackingAcc = 100;
      let strongestTopic = "None";
      let strongAcc = 0;

      Object.entries(topicScores).forEach(([topic, stats]) => {
         const acc = (stats.s / stats.t) * 100;
         if (stats.t >= 5 && acc < lackingAcc) { lackingAcc = acc; lackingTopic = topic; }
         if (acc > strongAcc) { strongAcc = acc; strongestTopic = topic; }
      });

      setOverviewData({
         brainPower,
         accuracy,
         totalActivities: quizzes.length + flashcards.length + files.length,
         strongestTopic: strongestTopic !== "None" ? strongestTopic : 'Keep Studying!',
         lackingTopic: lackingTopic !== "None" ? lackingTopic : 'No weaknesses found yet!',
         quizzesCount: quizzes.length,
         flashcardsCount: flashcards.length,
         filesCount: files.length
      });
      
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const fetchQuizData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setQuizHistory(data);
        let totalC = 0, totalA = 0;
        const grouped = data.reduce((acc: any, curr: QuizResult) => {
          const safeScore = Number(curr.correct_answers) || 0;
          const safeTotal = Number(curr.total_questions) || 1;
          const safeTopic = curr.topic || 'Unknown';
          
          if (!acc[safeTopic]) acc[safeTopic] = { topic: safeTopic, s: 0, t: 0, a: 0 };
          acc[safeTopic].s += safeScore; 
          acc[safeTopic].t += safeTotal; 
          acc[safeTopic].a += 1;
          totalC += safeScore; 
          totalA += safeTotal;
          return acc;
        }, {});
        setTopicStats(Object.values(grouped).map((s: any) => ({
          topic: s.topic.length > 15 ? s.topic.substring(0, 15) + '...' : s.topic, 
          fullTopic: s.topic, accuracy: s.t > 0 ? Math.round((s.s / s.t) * 100) : 0, attempts: s.a
        })));
        setOverallAccuracy(totalA > 0 ? Math.round((totalC / totalA) * 100) : 0);
      }
    } catch (e) { } finally { setIsLoading(false); }
  };

  const fetchFlashcardData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('flashcard_decks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setFlashcardDecks(data);
    } catch (e) { } finally { setIsLoading(false); }
  };

  const fetchKnowledgeData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setFilesCount(count || 0);
    } catch (e) { } finally { setIsLoading(false); }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-xl">
          <p className="font-bold text-slate-200 mb-1">{payload[0].payload.fullTopic}</p>
          <p className="text-indigo-400 font-medium">Accuracy: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <SecureLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] custom-scrollbar">
        
        {/* Layer A: Header & Tab Navigation */}
        <div className="mb-8 mt-4 lg:mt-0">
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight flex items-center gap-3">
             <Activity className="text-indigo-500" size={32}/> Command Center
          </h1>
          <p className="text-slate-400 font-medium mt-2 max-w-xl text-sm">Your unified performance analytics, insights, and actionable roadmap.</p>
          
          <div className="flex overflow-x-auto mt-6 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 custom-scrollbar-hide gap-1 w-full max-w-3xl">
             <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}><BarChart3 size={16}/> Overview</button>
             <button onClick={() => setActiveTab('quizzes')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'quizzes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}><Target size={16}/> Quizzes</button>
             <button onClick={() => setActiveTab('flashcards')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'flashcards' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}><Layers size={16}/> Flashcards</button>
             <button onClick={() => setActiveTab('arena')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'arena' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}><Swords size={16}/> Battle Arena</button>
             <button onClick={() => setActiveTab('knowledge')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'knowledge' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}><BookOpen size={16}/> Knowledge</button>
          </div>
        </div>

        {/* Dynamic Content Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 animate-pulse">
            <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
            <p className="text-slate-500 font-medium">Crunching your data...</p>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {!isLoading && activeTab === 'overview' && overviewData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                 
                 {/* Brain Power Metric */}
                 <div className="bg-gradient-to-br from-indigo-900/40 to-slate-950 p-6 rounded-[2rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
                   <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4"><Zap size={24}/></div>
                   <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-1">Brain Power Score</p>
                   <h2 className="text-5xl font-black text-white">{overviewData.brainPower}</h2>
                   <p className="text-slate-400 text-xs mt-2 font-medium">Aggregate points from all activities.</p>
                 </div>

                 {/* Highest Strength Metric */}
                 <div className="bg-gradient-to-br from-emerald-900/20 to-slate-950 p-6 rounded-[2rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
                   <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4"><Award size={24}/></div>
                   <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1">Strongest Topic</p>
                   <h2 className="text-2xl font-black text-white truncate">{overviewData.strongestTopic}</h2>
                   <p className="text-slate-400 text-xs mt-2 font-medium">Keep dominating this subject.</p>
                 </div>

               </div>

               {/* Layer B: Action Plan */}
               <div className="bg-slate-900 border border-rose-500/30 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-center">
                 <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-500"><Target size={150}/></div>
                 <div className="relative z-10">
                   <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest mb-4">
                     <BrainCircuit size={12}/> AI Action Plan
                   </div>
                   <h3 className="text-xl font-black text-white mb-2">Focus on <span className="text-rose-400 underline decoration-rose-500/50 decoration-2 underline-offset-4">{overviewData.lackingTopic}</span></h3>
                   <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">Our analysis shows this is your weakest area right now. Let's fix that.</p>
                   <button onClick={() => window.location.href=`/chat?context=Teach me about ${overviewData.lackingTopic}`} className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all active:scale-95 flex justify-center items-center gap-2 text-sm">
                     <Flame size={16}/> Master it with AI Chat
                   </button>
                 </div>
               </div>
             </div>

             {/* Activity Coverage */}
             <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl mt-6">
                <h3 className="font-black text-xl text-white mb-6">Module Engagement</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                     <Target className="text-indigo-400 mx-auto mb-2" size={24}/>
                     <h4 className="text-2xl font-black text-white">{overviewData.quizzesCount}</h4>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Quizzes</p>
                   </div>
                   <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                     <Layers className="text-purple-400 mx-auto mb-2" size={24}/>
                     <h4 className="text-2xl font-black text-white">{overviewData.flashcardsCount}</h4>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Flashcard Decks</p>
                   </div>
                   <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                     <Swords className="text-rose-400 mx-auto mb-2" size={24}/>
                     <h4 className="text-2xl font-black text-white">0</h4>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Battles Fought</p>
                   </div>
                   <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                     <BookOpen className="text-emerald-400 mx-auto mb-2" size={24}/>
                     <h4 className="text-2xl font-black text-white">{overviewData.filesCount}</h4>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Knowledge Files</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB 2: QUIZZES (Migrated from original analytics) */}
        {!isLoading && activeTab === 'quizzes' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {quizHistory.length === 0 ? (
              <div className="text-center py-20 bg-slate-950 border border-slate-800 rounded-3xl"><p className="text-slate-400 font-medium">Take a quiz first to see stats here.</p></div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl">
                    <h3 className="font-black text-xl text-white mb-6">Topic Performance</h3>
                    <div className="h-64 md:h-80 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={topicStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" /><XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} /><RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} /><Bar dataKey="accuracy" fill="#818cf8" radius={[6, 6, 0, 0]} maxBarSize={40} /></BarChart></ResponsiveContainer></div>
                  </div>
                  <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl">
                    <h3 className="font-black text-xl text-white mb-6">Skill Radar</h3>
                    <div className="h-64 md:h-80 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="65%" data={topicStats}><PolarGrid stroke="#334155" /><PolarAngleAxis dataKey="topic" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} /><RechartsTooltip content={<CustomTooltip />} /><Radar name="Accuracy" dataKey="accuracy" stroke="#a855f7" strokeWidth={2} fill="#d8b4fe" fillOpacity={0.3} /></RadarChart></ResponsiveContainer></div>
                  </div>
                </div>
                {/* Recent History Table */}
                <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl overflow-hidden relative">
                   <h3 className="font-black text-xl text-white mb-6">Recent Quizzes</h3>
                   <div className="overflow-x-auto relative z-10 custom-scrollbar">
                     <table className="w-full text-left border-collapse min-w-[500px]">
                       <thead><tr className="border-b border-slate-800"><th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Topic</th><th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</th><th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Accuracy</th><th className="py-4 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Date</th></tr></thead>
                       <tbody>
                         {quizHistory.slice(0, 10).map((quiz) => {
                           const safeScore = Number(quiz.correct_answers) || 0;
                           const safeTotal = Number(quiz.total_questions) || 1;
                           const acc = Math.round((safeScore / safeTotal) * 100);
                           return (
                             <tr key={quiz.id} className="border-b border-slate-800/50 hover:bg-slate-900/80 transition-colors group">
                               <td className="py-4 px-2 font-bold text-slate-300">{quiz.topic || 'Unknown'}</td><td className="py-4 px-2 font-medium text-slate-400">{safeScore} / {safeTotal}</td>
                               <td className="py-4 px-2"><div className="flex items-center gap-3"><div className="w-20 md:w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${acc >= 80 ? 'bg-emerald-400' : acc >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${acc}%` }}></div></div><span className="text-xs font-black text-slate-300">{acc}%</span></div></td>
                               <td className="py-4 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">{new Date(quiz.created_at).toLocaleDateString()}</td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: FLASHCARDS */}
        {!isLoading && activeTab === 'flashcards' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl text-center">
                <Layers className="mx-auto text-indigo-500 mb-4" size={40}/>
                <h3 className="font-black text-2xl text-white mb-2">You've generated {flashcardDecks.length} Decks!</h3>
                <p className="text-slate-400 font-medium">Keep grinding those flashcards using Active Recall.</p>
                <button onClick={() => window.location.href='/flashcards'} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold tracking-wide shadow-lg hover:bg-indigo-700">Generate New Deck</button>
             </div>
          </div>
        )}

        {/* TAB 4: ARENA */}
        {!isLoading && activeTab === 'arena' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5"><Swords size={200}/></div>
                <Swords className="mx-auto text-rose-500 mb-4 relative z-10" size={40}/>
                <h3 className="font-black text-2xl text-white mb-2 relative z-10">Arena Analytics Coming Soon</h3>
                <p className="text-slate-400 font-medium max-w-sm mx-auto relative z-10">Compete with others to unlock detailed ranking and combat statistics here.</p>
             </div>
          </div>
        )}

        {/* TAB 5: KNOWLEDGE BASE */}
        {!isLoading && activeTab === 'knowledge' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl text-center">
                <BookOpen className="mx-auto text-emerald-500 mb-4" size={40}/>
                <h3 className="font-black text-2xl text-white mb-2">{filesCount} Files Indexed</h3>
                <p className="text-slate-400 font-medium">Your personal RAG knowledge base is growing.</p>
                <button onClick={() => window.location.href='/dashboard'} className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold tracking-wide shadow-lg hover:bg-emerald-700">Upload More PDFs</button>
             </div>
          </div>
        )}

      </div>
    </SecureLayout>
  );
}
