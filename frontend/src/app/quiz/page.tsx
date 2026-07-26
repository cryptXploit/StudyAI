'use client';

import React, { Suspense, useState, useEffect } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Play, Code, Loader2, FileText, CheckCircle2, Clock, Trophy, Copy, History, PlusCircle, ListTree, Circle, Target, BookOpen, Menu, X, Trash2, PlayCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

// 🟢 Local i18n Dictionary
const translations = {
  English: {
    newQuiz: "New Quiz", pastResults: "Past Results", studyMaterials: "RAG Sources",
    syllabusVault: "Syllabus Vault", noIndexedFiles: "No indexed files available.",
    performanceHistory: "Your Performance History", noExamsTaken: "No exams taken yet!",
    generateFirstQuiz: "Generate your first interactive quiz to see your scores here.",
    correctOut: "correct out of", questions: "questions", time: "Time",
    quizGenerator: "Quiz Generator", quizDesc: "Test your knowledge or generate printable LaTeX exams directly from your documents.",
    whatTopic: "What topic should the quiz cover?", topicPlaceholder: "e.g. Software Quality Models, Biology Ch 3...",
    selectMode: "Select Generation Mode", interactiveExam: "Interactive Exam", interactiveDesc: "Take the quiz in real-time here.",
    exportLatex: "Export LaTeX", latexDesc: "Generate raw pdflatex code for Overleaf.",
    numQuestions: "Number of Questions", timeLimit: "Time Limit (Minutes)", noTimer: "No Timer",
    minutes: "Minutes", includedTypes: "Included Question Types", generateExam: "Generate Exam",
    generateLatex: "Generate LaTeX Code", generating: "Generating Intelligence...", craftingQuiz: "Crafting your personalized quiz based on documents.",
    question: "Question", of: "of", typeAnswerHere: "Type your answer here...",
    previous: "Previous", next: "Next", submitExam: "Submit Exam", examCompleted: "Exam Completed!",
    youScored: "You scored", outOf: "out of", yourAnswer: "Your Answer:", skipped: "Skipped",
    correctAnswer: "Correct Answer:", explanation: "Explanation:", takeAnother: "Take Another Quiz",
    generatedLatexCode: "Generated LaTeX Code", copyCode: "Copy Code", close: "Close"
  },
  Bangla: {
    newQuiz: "নতুন কুইজ", pastResults: "পূর্বের ফলাফল", studyMaterials: "RAG সোর্স",
    syllabusVault: "সিলেবাস ভল্ট", noIndexedFiles: "কোনো ইনডেক্স করা ফাইল নেই।",
    performanceHistory: "আপনার পারফরম্যান্স হিস্ট্রি", noExamsTaken: "এখনও কোনো পরীক্ষা দেওয়া হয়নি!",
    generateFirstQuiz: "আপনার স্কোর দেখতে প্রথম ইন্টারঅ্যাকটিভ কুইজটি তৈরি করুন।",
    correctOut: "টি সঠিক হয়েছে, মোট", questions: "প্রশ্নের মধ্যে", time: "সময়",
    quizGenerator: "কুইজ জেনারেটর", quizDesc: "আপনার জ্ঞান যাচাই করুন অথবা ডকুমেন্টস থেকে সরাসরি প্রিন্টযোগ্য ল্যাটেক্স (LaTeX) প্রশ্নপত্র তৈরি করুন।",
    whatTopic: "কুইজটি কোন বিষয়ের ওপর হবে?", topicPlaceholder: "যেমন: সফটওয়্যার টেস্টিং, বা বায়োলজি চ্যাপ্টার ৩...",
    selectMode: "জেনারেশন মোড নির্বাচন করুন", interactiveExam: "ইন্টারঅ্যাকটিভ পরীক্ষা", interactiveDesc: "এখানে রিয়েল-টাইমে কুইজ দিন।",
    exportLatex: "ল্যাটেক্স এক্সপোর্ট", latexDesc: "Overleaf-এর জন্য র-ল্যাটেক্স কোড তৈরি করুন।",
    numQuestions: "প্রশ্নের সংখ্যা", timeLimit: "সময়সীমা (মিনিট)", noTimer: "কোনো টাইমার নেই",
    minutes: "মিনিট", includedTypes: "প্রশ্ন ধরনসমূহ", generateExam: "পরীক্ষা তৈরি করুন",
    generateLatex: "ল্যাটেক্স কোড তৈরি করুন", generating: "ইন্টেলিজেন্স তৈরি করা হচ্ছে...", craftingQuiz: "ডকুমেন্টের ওপর ভিত্তি করে আপনার কুইজ তৈরি হচ্ছে।",
    question: "প্রশ্ন", of: "/", typeAnswerHere: "এখানে আপনার উত্তর লিখুন...",
    previous: "পূর্ববর্তী", next: "পরবর্তী", submitExam: "পরীক্ষা জমা দিন", examCompleted: "পরীক্ষা শেষ হয়েছে!",
    youScored: "আপনার স্কোর", outOf: ", মোট নাম্বার", yourAnswer: "আপনার উত্তর:", skipped: "উত্তর দেননি",
    correctAnswer: "সঠিক উত্তর:", explanation: "ব্যাখ্যা:", takeAnother: "আরেকটি কুইজ দিন",
    generatedLatexCode: "তৈরিকৃত ল্যাটেক্স কোড", copyCode: "কোড কপি করুন", close: "বন্ধ করুন"
  },
  Hindi: {
    newQuiz: "नई क्विज़", pastResults: "पिछले परिणाम", studyMaterials: "RAG स्रोत",
    syllabusVault: "सिलेबस तिजोरी", noIndexedFiles: "कोई अनुक्रमित फ़ाइलें उपलब्ध नहीं हैं।",
    performanceHistory: "आपका प्रदर्शन इतिहास", noExamsTaken: "अभी तक कोई परीक्षा नहीं दी गई है!",
    generateFirstQuiz: "अपने स्कोर देखने के लिए अपनी पहली इंटरैक्टिव क्विज़ बनाएं।",
    correctOut: "सही हैं", questions: "प्रश्नों में से", time: "समय",
    quizGenerator: "क्विज़ जेनरेटर", quizDesc: "अपने ज्ञान का परीक्षण करें या अपने दस्तावेज़ों से प्रिंट करने योग्य लेटेक्स (LaTeX) परीक्षा उत्पन्न करें।",
    whatTopic: "क्विज़ किस विषय पर होनी चाहिए?", topicPlaceholder: "उदा. जीव विज्ञान अध्याय 3...",
    selectMode: "जनरेशन मोड चुनें", interactiveExam: "इंटरएक्टिव परीक्षा", interactiveDesc: "यहां वास्तविक समय में क्विज़ लें।",
    exportLatex: "लेटेक्स निर्यात करें", latexDesc: "Overleaf के लिए रॉ लेटेक्स कोड जेनरेट करें।",
    numQuestions: "प्रश्नों की संख्या", timeLimit: "समय सीमा (मिनट)", noTimer: "कोई टाइमर नहीं",
    minutes: "मिनट", includedTypes: "शामिल प्रश्न प्रकार", generateExam: "परीक्षा बनाएं",
    generateLatex: "लेटेक्स कोड बनाएं", generating: "इंटेलिजेंस जेनरेट हो रही है...", craftingQuiz: "दस्तावेज़ों के आधार पर आपकी क्विज़ तैयार की जा रही है।",
    question: "प्रश्न", of: "/", typeAnswerHere: "अपना उत्तर यहां टाइप करें...",
    previous: "पिछला", next: "अगला", submitExam: "परीक्षा जमा करें", examCompleted: "परीक्षा पूरी हुई!",
    youScored: "आपका स्कोर", outOf: ", कुल अंक", yourAnswer: "आपका उत्तर:", skipped: "छोड़ दिया",
    correctAnswer: "सही उत्तर:", explanation: "व्याख्या:", takeAnother: "एक और क्विज़ लें",
    generatedLatexCode: "जेनरेट किया गया लेटेक्स कोड", copyCode: "कोड कॉपी करें", close: "बंद करें"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

function QuizGeneratorPageContent() {
  const supabase = createClient();
  const { tokens, tier, refreshTokens } = useTokens();
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const contextParam = searchParams.get('context');
  const fileParamsString = searchParams.getAll('file').join(',');

  useEffect(() => {
    if (contextParam) setTopic(contextParam);
    if (fileParamsString) setSelectedFileIds(fileParamsString.split(','));
  }, [contextParam, fileParamsString]);

  // 🟢 SYLLABUS VAULT STATES (Course=Single, Chapter=Multi, Topic=Multi)
  const [syllabuses, setSyllabuses] = useState<any[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'join-arena'>('create');
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [mode, setMode] = useState<'interactive' | 'latex'>('interactive');
  const [types, setTypes] = useState<string[]>(['MCQ']);
  const [timeLimit, setTimeLimit] = useState<number>(0); 

  const [appState, setAppState] = useState<'config' | 'generating' | 'active' | 'results' | 'latex_view'>('config');
  const [generatedData, setGeneratedData] = useState<any>('');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); 
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const [language, setLanguage] = useState<LanguageType>('English');
  const [uiTheme, setUiTheme] = useState<'dark'|'light'>('dark');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const t = translations[language] || translations['English'];

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(5);

  useEffect(() => {
    fetchFilesAndSyllabuses();
    fetchQuizHistory(); 

    const loadSettings = () => {
      const savedLang = localStorage.getItem('Prepia_language');
      if (savedLang) setLanguage(savedLang as LanguageType);
      const savedTheme = localStorage.getItem('Prepia_theme'); 
      if (savedTheme) setUiTheme(savedTheme as 'dark'|'light');
    };
    loadSettings();
    window.addEventListener('languageChanged', loadSettings);
    window.addEventListener('settingsChanged', loadSettings);
    return () => { window.removeEventListener('languageChanged', loadSettings); window.removeEventListener('settingsChanged', loadSettings); };
  }, []);

  // 🟢 FIXED: Safe Fetching to avoid Network Error Crashes
  const fetchFilesAndSyllabuses = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (!user || authErr) return;
      
      const { data: fData } = await supabase.from('files').select('*').eq('user_id', user.id).eq('status', 'indexed');
      if (fData) setFiles(fData);

      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/syllabus/list` : `${apiUrlBase}/api/syllabus/list`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const sData = await res.json();
      if (sData.success) setSyllabuses(sData.syllabuses);
    } catch(e) { console.error("Error fetching data:", e); }
  };

  const fetchQuizHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setQuizHistory(data);
    } catch(e) { console.error("Error fetching history:", e); }
  };

  const deleteQuizHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this result?')) return;
    try {
      const { error } = await supabase.from('quiz_results').delete().eq('id', id);
      if (!error) {
        setQuizHistory(prev => prev.filter(h => h.id !== id));
      } else {
        alert('Failed to delete history.');
      }
    } catch(err) { console.error(err); }
  };

  const handleRetakeTopic = (topic: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTopic(topic);
    setActiveTab('create');
    setAppState('config');
  };

  useEffect(() => {
    let timer: any;
    if (appState === 'active' && timeLimit > 0 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (appState === 'active' && timeLimit > 0 && timeLeft === 0) {
      submitQuiz(); 
    }
    return () => clearInterval(timer);
  }, [appState, timeLeft, timeLimit]);

  const toggleFile = (id: string) => setSelectedFileIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  const toggleType = (type: string) => setTypes(prev => prev.includes(type) && prev.length > 1 ? prev.filter(t => t !== type) : [...new Set([...prev, type])]);

  // 🟢 SYLLABUS TOGGLES
  const handleSyllabusSelect = (id: string) => {
    setSelectedSyllabusId(prev => prev === id ? '' : id);
    setSelectedChapterIds([]); setSelectedTopics([]); 
  };
  const toggleChapterSelection = (chapterId: string) => {
    setSelectedChapterIds(prev => prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]);
  };
  const toggleTopicSelection = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const generateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && selectedFileIds.length === 0 && !selectedSyllabusId) 
      return alert('Please enter a topic, select a source file, or choose a syllabus!');

    if (tier !== 'PRO' && tokens < 5) {
      setRequiredTokensForModal(5);
      setShowTokenModal(true);
      return;
    }
    
    setAppState('generating');
    setGeneratedData('');

    const activeCourse = syllabuses.find(s => s.id === selectedSyllabusId);
    const availableChaptersForRequest = activeCourse?.chapters || [];
    
    const syllabusCourseName = activeCourse ? activeCourse.course_name : '';
    const syllabusChapters = availableChaptersForRequest.filter((ch: any) => selectedChapterIds.includes(ch.id)).map((ch: any) => ch.title);

    // 🟢 CONNECTION KEEPALIVE PROTECTOR: Long-polling support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 Minutes Timeout Limit

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const fetchUrl = apiUrl.endsWith('/api') ? `${apiUrl}/quiz` : `${apiUrl}/api/quiz`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          topic, numQuestions, types, mode, fileIds: selectedFileIds, language,
          syllabusCourseName, syllabusChapters, syllabusTopics: selectedTopics 
        }),
        signal: controller.signal // 🟢 Added Safety Signal
      });

      clearTimeout(timeoutId);

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8');
      
      let fullResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                if (data.error === 'INSUFFICIENT_TOKENS') {
                  setRequiredTokensForModal(data.required || 5);
                  setShowTokenModal(true);
                  setAppState('config');
                  return;
                }
                throw new Error(data.error);
              }
              if (data.content) fullResponse += data.content;
            } catch (e: any) { }
          }
        }
      }

      if (mode === 'latex') {
        setGeneratedData(fullResponse);
        setAppState('latex_view');
      } else {
        let parsedQuestions: any[] = [];
        let cleanedText = fullResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
           parsedQuestions = JSON.parse(cleanedText);
        } catch (initialError) {
           try {
              const objectBlocks = cleanedText.match(/\{[\s\S]*?\}/g);
              if (objectBlocks) {
                 parsedQuestions = objectBlocks.map((block) => {
                    const typeMatch = block.match(/"type"\s*:?\s*"?([^",\n]+)"?/i);
                    const type = typeMatch ? typeMatch[1].trim() : "MCQ";
                    
                    const qMatch = block.match(/"question"\s*:?\s*"([^"]+)"/i);
                    const question = qMatch ? qMatch[1].trim() : "Question text missing";
                    
                    const optMatch = block.match(/"options"\s*:?\s*\[(.*?)\]/i);
                    let options: string[] = [];
                    if (optMatch) {
                       const optStr = optMatch[1].replace(/(^"|"$)/g, ''); 
                       options = optStr.split(/","|",\s*"|"\s*,\s*"/).map(s => s.replace(/"/g, '').trim()).filter(s => s !== '');
                    } else { options = ["Option A", "Option B", "Option C", "Option D"]; }

                    const ansMatch = block.match(/"correctAnswer"\s*:?\s*"?([^",\n]+)"?/i);
                    const correctAnswer = ansMatch ? ansMatch[1].trim() : options[0];

                    const expMatch = block.match(/"(?:ex)?planation"\s*:?\s*"([^"]+)"/i);
                    const explanation = expMatch ? expMatch[1].trim() : "No explanation provided.";

                    return { type, question, options, correctAnswer, explanation };
                 });
              } else { throw new Error("No object blocks found in AI response."); }
           } catch (bruteForceError) { throw new Error("AI generated an invalid question format. Please try again."); }
        }

        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) throw new Error("AI did not return any questions.");

        setQuestions(parsedQuestions); setTimeLeft(timeLimit * 60); setCurrentQIndex(0); setUserAnswers({}); setAppState('active');
        refreshTokens();
      }

      // 🟢 Reset states and clear URL for clean UI after generation
      setTopic('');
      setSelectedFileIds([]);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (error: any) { 
      if (error.name === 'AbortError') {
        alert('🚨 Timeout: Server took too long. Please try requesting fewer questions or files.');
      } else {
        alert('Failed to generate quiz. Please try a clearer topic or try again.'); 
      }
      setAppState('config'); 
    }
  };

  const handleAnswerSelect = (answer: string) => { setUserAnswers(prev => ({ ...prev, [currentQIndex]: answer })); };

  const submitQuiz = async () => {
    let correct = 0;
    questions.forEach((q, i) => { if (userAnswers[i] === q.correctAnswer) correct++; });
    setScore({ correct, total: questions.length });
    setAppState('results');

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const percentage = (correct / questions.length) * 100;
      await supabase.from('quiz_results').insert([{
        user_id: user.id, topic: topic || (selectedSyllabusId ? "Syllabus Quiz" : "Document Quiz"),
        total_questions: questions.length, correct_answers: correct, score_percentage: percentage,
        time_taken_seconds: timeLimit > 0 ? (timeLimit * 60) - timeLeft : null
      }]);
      fetchQuizHistory();
    }
  };

  const startMultiplayerBattle = async () => {
    if (tier !== 'PRO' && tokens < 10) {
      setRequiredTokensForModal(10);
      setShowTokenModal(true);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/battle2/create` : `${apiUrlBase}/api/battle2/create`;

      const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ quizData: questions,hostScore: score.correct }) });
      const data = await res.json();
      
      if (res.status === 402 && data.error === 'INSUFFICIENT_TOKENS') {
         setRequiredTokensForModal(data.required || 10);
         setShowTokenModal(true);
         return;
      }

      if (data.success) {
         refreshTokens();
         router.push(`/battle-arena?room=${data.roomCode}`);
      }
    } catch (error) { alert("Failed to create battle room."); }
  };

  const copyToClipboard = () => { navigator.clipboard.writeText(generatedData); alert('LaTeX Code Copied!'); };

  const activeCourse = syllabuses.find(s => s.id === selectedSyllabusId);
  const availableChapters = activeCourse?.chapters || [];
  const availableTopics = availableChapters.filter((c:any) => selectedChapterIds.length === 0 || selectedChapterIds.includes(c.id)).flatMap((c:any) => c.topics || []);

  return (
    <SecureLayout>
      <OutOfTokensModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)} 
        requiredTokens={requiredTokensForModal} 
      />
      <div className={`min-h-[calc(100vh-80px)] p-2 md:p-4 transition-colors duration-500 ${uiTheme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`flex h-[calc(100vh-100px)] md:h-[calc(100vh-120px)] max-w-7xl mx-auto overflow-hidden border rounded-3xl shadow-sm ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          
          {/* Sidebar */}
          <div className={`${isMobileSidebarOpen ? 'flex absolute z-50 h-full shadow-2xl' : 'hidden'} md:flex md:relative w-80 border-r p-5 flex-col overflow-y-auto custom-scrollbar transition-colors ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            
            {/* Mobile Sidebar Close Button */}
            {isMobileSidebarOpen && (
              <div className="flex justify-between items-center mb-4 md:hidden">
                <span className={`font-black text-lg ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Menu</span>
                <button onClick={() => setIsMobileSidebarOpen(false)} className={`p-2 rounded-full ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                  <X size={18} />
                </button>
              </div>
            )}

            <button onClick={() => { setActiveTab('create'); setAppState('config'); setIsMobileSidebarOpen(false); }} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl shadow-lg font-black tracking-wide transition-all active:scale-95 mb-4 border ${activeTab === 'create' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-indigo-500 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400')}`}>
              <PlusCircle size={18} /> {t.newQuiz}
            </button>
            <button onClick={() => { setActiveTab('history'); setIsMobileSidebarOpen(false); }} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl shadow-lg font-black tracking-wide transition-all active:scale-95 mb-4 border ${activeTab === 'history' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]' : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-indigo-500 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400')}`}>
              <History size={18} /> {t.pastResults}
            </button>
            <button onClick={() => { setActiveTab('join-arena'); setIsMobileSidebarOpen(false); }} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl shadow-lg font-black tracking-wide transition-all active:scale-95 mb-8 border ${activeTab === 'join-arena' ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]' : (uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:border-amber-500 hover:bg-slate-800' : 'bg-white border-amber-300 text-amber-600 hover:border-amber-400')}`}>
              <Target size={18} /> Join Battle Arena
            </button>

          {/* RAG Materials */}
          <h3 className={`text-[11px] font-black tracking-widest uppercase mb-3 flex items-center gap-1.5 ${uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`}><BookOpen size={14}/> {t.studyMaterials}</h3>
          <div className="space-y-2 mb-6">
            {files.length === 0 ? (
              <p className={`text-sm italic text-center py-2 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.noIndexedFiles}</p>
            ) : (
              files.map(file => (
                <div key={file.id} onClick={() => toggleFile(file.id)} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedFileIds.includes(file.id) ? (uiTheme === 'dark' ? 'bg-indigo-500/20 border-indigo-500' : 'bg-indigo-50 border-indigo-500') : (uiTheme === 'dark' ? 'bg-slate-800 border-transparent hover:border-slate-700' : 'bg-white border-transparent hover:border-slate-200')}`}>
                  <div className="mt-0.5">{selectedFileIds.includes(file.id) ? <CheckCircle2 className={uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} size={18} /> : <div className={`w-4 h-4 border-2 rounded ${uiTheme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} />}</div>
                  <div className="overflow-hidden"><p className={`text-sm font-bold truncate ${selectedFileIds.includes(file.id) ? (uiTheme === 'dark' ? 'text-indigo-300' : 'text-indigo-900') : (uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700')}`}>{file.name}</p></div>
                </div>
              ))
            )}
          </div>

          {/* 🟢 Syllabus Vault */}
          {syllabuses.length > 0 && (
            <div className={`pt-2 border-t ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-[11px] font-black tracking-widest uppercase mb-3 flex items-center gap-1.5 ${uiTheme === 'dark' ? 'text-amber-500' : 'text-amber-600'}`}><ListTree size={14}/> {t.syllabusVault}</h3>
              
              <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Courses (Max 1)</p>
              <div className="space-y-1.5">
                {syllabuses.map(syl => (
                  <div key={syl.id} onClick={() => handleSyllabusSelect(syl.id)} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-xs font-bold transition-all border ${selectedSyllabusId === syl.id ? (uiTheme === 'dark' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-amber-50 border-amber-500 text-amber-700') : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}`}>
                    {selectedSyllabusId === syl.id ? <CheckCircle2 size={14} className={uiTheme === 'dark' ? 'text-amber-400 shrink-0' : 'text-amber-600 shrink-0'}/> : <Circle size={14} className={`shrink-0 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}/>}
                    <span className="truncate">{syl.course_name}</span>
                  </div>
                ))}
              </div>

              {selectedSyllabusId && availableChapters.length > 0 && (
                <div className={`mt-3 pl-2 border-l-2 space-y-1.5 ${uiTheme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Chapters (Multi Select)</p>
                  {availableChapters.map((chap: any) => (
                    <div key={chap.id} onClick={() => toggleChapterSelection(chap.id)} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-[11px] font-bold transition-all border ${selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0 ? (uiTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700') : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300')}`}>
                      {(selectedChapterIds.includes(chap.id) || selectedChapterIds.length === 0) ? <CheckCircle2 size={12} className={uiTheme === 'dark' ? 'text-amber-500 shrink-0' : 'text-amber-500 shrink-0'}/> : <Circle size={12} className={`shrink-0 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}/>}
                      <span className="truncate">{chap.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedSyllabusId && availableTopics.length > 0 && (
                <div className={`mt-3 pl-4 border-l-2 ${uiTheme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}><Target size={10}/> Topics (Multi Select)</p>
                  <div className="flex flex-wrap gap-1">
                    {availableTopics.map((topic: string, idx: number) => (
                      <button key={idx} onClick={() => toggleTopicSelection(topic)} className={`text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded border transition-all ${selectedTopics.includes(topic) ? (uiTheme === 'dark' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-500 text-emerald-700') : (uiTheme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300')}`}>
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 relative overflow-y-auto p-4 md:p-8 ${uiTheme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
          
          {/* Mobile Sidebar Toggle Button */}
          <div className="md:hidden flex gap-2 mb-6">
            <button 
               onClick={() => setIsMobileSidebarOpen(true)} 
               className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black uppercase tracking-widest shadow-xl border transition-all active:scale-95 ${uiTheme === 'dark' ? 'bg-slate-800/90 border-slate-600 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md' : 'bg-white border-slate-300 text-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.1)]'}`}>
               <Menu size={18} /> Menu
            </button>
            <button 
               onClick={() => { setActiveTab('join-arena'); setAppState('config'); }} 
               className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black uppercase tracking-widest shadow-xl border transition-all active:scale-95 ${activeTab === 'join-arena' ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-white' : (uiTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600')}`}>
               <Target size={18} /> Arena
            </button>
          </div>

          {/* HISTORY VIEW */}
          {activeTab === 'history' && appState === 'config' && (
            <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-300">
              <h1 className={`text-3xl font-black mb-8 ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.performanceHistory}</h1>
              {quizHistory.length === 0 ? (
                <div className={`text-center py-20 rounded-3xl border ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <Trophy className={`mx-auto mb-4 ${uiTheme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} size={48} />
                  <h3 className={`text-xl font-bold ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{t.noExamsTaken}</h3>
                  <p className={`mt-2 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.generateFirstQuiz}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizHistory.map(history => (
                    <div key={history.id} className={`p-6 border rounded-2xl shadow-sm flex flex-col justify-between transition-all group relative ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}>
                      
                      {/* Delete Button (Visible on hover on desktop, always on mobile) */}
                      <button 
                        onClick={(e) => deleteQuizHistory(history.id, e)}
                        className={`absolute top-4 right-4 p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 ${uiTheme === 'dark' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}
                        title="Delete Result"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div>
                        <div className="flex justify-between items-start mb-2 pr-10">
                          <h3 className={`font-black text-lg line-clamp-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`} title={history.topic}>{history.topic}</h3>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest ${history.score_percentage >= 80 ? (uiTheme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200') : history.score_percentage >= 50 ? (uiTheme === 'dark' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200') : (uiTheme === 'dark' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-200')}`}>
                            {history.score_percentage.toFixed(0)}% SCORE
                          </span>
                          <p className={`text-xs font-bold uppercase tracking-widest ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {language === 'English' ? `${history.correct_answers} ${t.correctOut} ${history.total_questions}` : `${history.correct_answers}/${history.total_questions} সঠিক`}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`pt-4 border-t flex justify-between items-center text-xs font-bold ${uiTheme === 'dark' ? 'border-slate-700/50 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                        <div className="flex flex-col gap-1">
                          <span>{new Date(history.created_at).toLocaleDateString()}</span>
                          {history.time_taken_seconds && <span>{Math.floor(history.time_taken_seconds/60)}m {history.time_taken_seconds%60}s</span>}
                        </div>
                        
                        <button 
                          onClick={(e) => handleRetakeTopic(history.topic, e)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] transition-all active:scale-95 border ${uiTheme === 'dark' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/50' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'}`}
                        >
                          <PlayCircle size={14} /> Retake
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONFIGURATION VIEW */}
          {activeTab === 'create' && appState === 'config' && (
            <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
              <h1 className={`text-3xl font-black mb-2 ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.quizGenerator}</h1>
              <p className={`mb-8 ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.quizDesc}</p>

              <form onSubmit={generateQuiz} className={`space-y-6 p-8 rounded-3xl border shadow-sm ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.whatTopic}</label>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder={t.topicPlaceholder} className={`w-full p-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.selectMode}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => setMode('interactive')} className={`p-4 rounded-xl border-2 cursor-pointer transition ${mode === 'interactive' ? (uiTheme === 'dark' ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-600 bg-indigo-50') : (uiTheme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white')}`}>
                      <Play className={mode === 'interactive' ? (uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600') : (uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-400')} size={24} />
                      <h3 className={`font-bold mt-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{t.interactiveExam}</h3>
                      <p className={`text-xs ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.interactiveDesc}</p>
                    </div>
                    <div onClick={() => setMode('latex')} className={`p-4 rounded-xl border-2 cursor-pointer transition ${mode === 'latex' ? (uiTheme === 'dark' ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-600 bg-emerald-50') : (uiTheme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white')}`}>
                      <Code className={mode === 'latex' ? (uiTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') : (uiTheme === 'dark' ? 'text-slate-500' : 'text-slate-400')} size={24} />
                      <h3 className={`font-bold mt-2 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{t.exportLatex}</h3>
                      <p className={`text-xs ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.latexDesc}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.numQuestions}</label>
                    <input type="number" min="1" max={20} value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className={`w-full p-3 rounded-xl border outline-none ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`} />
                  </div>
                  {mode === 'interactive' && (
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.timeLimit}</label>
                      <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className={`w-full p-3 rounded-xl border outline-none ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'}`}>
                        <option value={0}>{t.noTimer}</option>
                        <option value={2}>2 {t.minutes}</option>
                        <option value={5}>5 {t.minutes}</option>
                        <option value={10}>10 {t.minutes}</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t.includedTypes}</label>
                  <div className="flex gap-3 flex-wrap">
                    {['MCQ', 'True/False', 'Blank'].map(type => (
                      <div key={type} onClick={() => toggleType(type)} className={`px-4 py-2 rounded-full border cursor-pointer text-sm font-bold transition ${types.includes(type) ? (uiTheme === 'dark' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-800 text-white border-slate-800') : (uiTheme === 'dark' ? 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400')}`}>
                        {type}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className={`w-full py-4 font-black text-lg tracking-wide rounded-2xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 border ${uiTheme === 'dark' ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 border-indigo-500 text-white shadow-lg'}`}>
                  {mode === 'interactive' ? t.generateExam : t.generateLatex}
                </button>
              </form>
            </div>
          )}

          {/* JOIN BATTLE ARENA VIEW */}
          {activeTab === 'join-arena' && (
            <div className={`max-w-2xl mx-auto animate-in fade-in zoom-in duration-300 flex flex-col items-center justify-center py-12 p-8 rounded-3xl border shadow-sm ${uiTheme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <Target size={64} className={`mb-6 ${uiTheme === 'dark' ? 'text-amber-500' : 'text-amber-600'}`} />
              <h1 className={`text-3xl font-black mb-2 text-center ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Join a Battle</h1>
              <p className={`mb-8 text-center font-bold ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Enter a Room Code to compete live with others.</p>

              <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-md">
                <input 
                  type="text" 
                  placeholder="e.g. A7B9XX" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())} 
                  className={`w-full px-6 py-4 border font-black text-2xl rounded-2xl outline-none focus:border-indigo-500 text-center uppercase tracking-widest transition-all ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'}`} 
                  maxLength={6}
                />
                <button 
                  onClick={() => { if(roomCode.length > 2) router.push(`/battle-arena?room=${roomCode}`) }} 
                  className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                  disabled={roomCode.length < 3}
                >
                  Join
                </button>
              </div>
            </div>
          )}

          {/* GENERATING VIEW */}
          {appState === 'generating' && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 className={`animate-spin mb-4 ${uiTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} size={48} />
              <h2 className={`text-2xl font-bold ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{t.generating}</h2>
              <p className={`mt-2 ${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.craftingQuiz}</p>
            </div>
          )}

          {/* ACTIVE EXAM VIEW */}
          {appState === 'active' && questions.length > 0 && (
            <div className="max-w-3xl mx-auto h-full flex flex-col animate-in fade-in duration-300">
              <div className={`flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b gap-4 ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <button onClick={() => router.push('/chat')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs md:text-sm bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-all active:scale-95 shadow-lg uppercase tracking-wider">💬 <span className="hidden sm:inline">Back to AI Chat</span></button>
                  <h2 className={`text-xl md:text-2xl font-black ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{t.question} {currentQIndex + 1} {t.of} {questions.length}</h2>
                </div>
                {timeLimit > 0 && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${timeLeft < 60 ? (uiTheme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') : (uiTheme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')}`}>
                    <Clock size={18} /> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className={`text-2xl font-bold mb-8 ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{questions[currentQIndex].question}</h3>
                <div className="space-y-4">
                  {questions[currentQIndex].options && questions[currentQIndex].options.length > 0 ? (
                    questions[currentQIndex].options.map((opt: string, i: number) => (
                      <div key={i} onClick={() => handleAnswerSelect(opt)} className={`p-4 rounded-xl border-2 cursor-pointer font-medium text-lg transition ${userAnswers[currentQIndex] === opt ? (uiTheme === 'dark' ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-indigo-600 bg-indigo-50 text-indigo-900') : (uiTheme === 'dark' ? 'border-slate-700 bg-slate-900 hover:border-slate-500 text-slate-300' : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-700')}`}>
                        {opt}
                      </div>
                    ))
                  ) : (
                    <input
                      type="text"
                      value={userAnswers[currentQIndex] || ''}
                      onChange={(e) => handleAnswerSelect(e.target.value)}
                      placeholder={t.typeAnswerHere}
                      className={`w-full p-4 rounded-xl border-2 focus:border-indigo-600 outline-none text-lg font-medium transition ${uiTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-600 focus:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className={`flex flex-col-reverse md:flex-row justify-between gap-4 mt-8 pt-6 border-t ${uiTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <button disabled={currentQIndex === 0} onClick={() => setCurrentQIndex(prev => prev - 1)} className={`w-full md:w-auto px-8 py-4 md:py-3 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 border ${uiTheme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}>{t.previous}</button>
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                  {currentQIndex === questions.length - 1 ? (
                    <>
                      <button onClick={submitQuiz} className={`w-full md:w-auto px-8 py-4 md:py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 border ${uiTheme === 'dark' ? 'bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-600 shadow-lg'}`}>{t.submitExam}</button>
                      <button onClick={startMultiplayerBattle} className={`w-full md:w-auto px-8 py-4 md:py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 border ${uiTheme === 'dark' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-gradient-to-r from-purple-500 to-indigo-500 border-purple-600 shadow-lg'}`}>⚔️ Battle</button>
                    </>
                  ) : (
                    <button onClick={() => setCurrentQIndex(prev => prev + 1)} className={`w-full md:w-auto px-8 py-4 md:py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 border ${uiTheme === 'dark' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'bg-gradient-to-r from-indigo-500 to-blue-500 border-indigo-600 shadow-lg'}`}>{t.next}</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RESULTS VIEW */}
          {appState === 'results' && (
            <div className="max-w-3xl mx-auto text-center animate-in slide-in-from-bottom-4 duration-500">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${uiTheme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-yellow-100 text-yellow-600'}`}>
                <Trophy size={48} />
              </div>
              <h1 className={`text-4xl font-black mb-2 ${uiTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.examCompleted}</h1>
              <p className={`text-xl font-medium mb-8 ${uiTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {language === 'English' ? `${t.youScored} ${score.correct} ${t.outOf} ${score.total}` : `${score.total} ${t.outOf} ${score.correct} ${t.youScored}`}
              </p>

              <div className="space-y-6 text-left mb-12">
                {questions.map((q, i) => {
                  const isCorrect = userAnswers[i] === q.correctAnswer;
                  return (
                    <div key={i} className={`p-6 rounded-2xl border ${isCorrect ? (uiTheme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-emerald-50 border-emerald-200') : (uiTheme === 'dark' ? 'bg-rose-500/10 border-rose-500/50' : 'bg-red-50 border-red-200')}`}>
                      <h3 className={`font-bold text-lg mb-4 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{i+1}. {q.question}</h3>
                      <p className="text-sm font-medium mb-1"><span className={`${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.yourAnswer}</span> <span className={isCorrect ? (uiTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-700') : (uiTheme === 'dark' ? 'text-rose-400' : 'text-red-600')}>{userAnswers[i] || t.skipped}</span></p>
                      {!isCorrect && <p className="text-sm font-medium mb-3"><span className={`${uiTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.correctAnswer}</span> <span className={uiTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}>{q.correctAnswer}</span></p>}
                      <div className={`mt-4 p-4 rounded-xl text-sm ${uiTheme === 'dark' ? 'bg-slate-900/50 text-slate-300' : 'bg-white/60 text-slate-700'}`}><strong>{t.explanation}</strong> {q.explanation}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={() => router.push('/chat')} className={`px-8 py-4 font-black rounded-xl shadow-lg transition bg-indigo-600 text-white hover:bg-indigo-700 uppercase tracking-wider`}>💬 Back to AI Chat</button>
                <button onClick={() => { setAppState('config'); setActiveTab('create'); }} className={`px-8 py-4 font-bold rounded-xl shadow-lg transition ${uiTheme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}>{t.takeAnother}</button>
              </div>
            </div>
          )}

          {/* LATEX VIEW */}
          {appState === 'latex_view' && (
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-black ${uiTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{t.generatedLatexCode}</h2>
                <div className="flex gap-3">
                  <button onClick={() => router.push('/chat')} className={`flex items-center gap-2 px-4 py-2 font-black rounded-lg transition uppercase tracking-wider text-xs bg-indigo-600 text-white hover:bg-indigo-700`}>💬 Back to Chat</button>
                  <button onClick={copyToClipboard} className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition ${uiTheme === 'dark' ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-slate-800 text-white hover:bg-slate-900'}`}><Copy size={16} /> {t.copyCode}</button>
                  <button onClick={() => setAppState('config')} className={`px-4 py-2 font-bold rounded-lg transition ${uiTheme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{t.close}</button>
                </div>
              </div>
              <div className="flex-1 bg-slate-900 rounded-2xl p-6 overflow-y-auto custom-scrollbar border border-slate-700">
                <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">
                  {generatedData}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </SecureLayout>
  );
}

export default function QuizGeneratorPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><QuizGeneratorPageContent /></Suspense>;
}
