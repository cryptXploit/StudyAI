'use client';
import { showPublicError } from '@/lib/errors/publicError';

import React, { useState, useEffect, useRef } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { LineChart as ChartIcon, Sparkles, Loader2, History, Trash2, ShieldCheck, Download, Table2, Activity, Settings2 } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';
import { ScatterChart, Scatter, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label } from 'recharts';

const translations = {
  English: {
    autoGrapher: "Auto-Grapher",
    labReportVisualizer: "Lab Report Visualizer",
    proTierFeature: "PRO TIER FEATURE",
    graphPrompt: "Graph Prompt (Optional)",
    graphPromptPlaceholder: "e.g., Plot a Scatter graph of Voltage vs Current",
    rawLabData: "Raw Lab Data",
    rawLabDataPlaceholder: "Copy & Paste Excel/Table data here...\n\nVoltage Current\n1.5 3.2\n2.0 4.1\n2.5 5.0",
    plottingGraph: "Plotting Graph...",
    generateGraph: "Generate Graph",
    savedGraphs: "Saved Graphs",
    noGraphsPlotted: "No graphs plotted yet.",
    chat: "Chat",
    canvasAwaits: "Canvas Awaits",
    pasteLabData: "Paste your messy lab data on the left to generate a precise, lab-report ready plot.",
    processingData: "Processing Data points...",
    plotRendered: "PLOT RENDERED",
    exportAsPNG: "Export as PNG",
    saved: "Saved",
    plotData: "Plot Data"
  },
  Bangla: {
    autoGrapher: "অটো-গ্রাফার",
    labReportVisualizer: "ল্যাব রিপোর্ট ভিজ্যুয়ালাইজার",
    proTierFeature: "প্রো টিয়ার ফিচার",
    graphPrompt: "গ্রাফ প্রম্পট (ঐচ্ছিক)",
    graphPromptPlaceholder: "যেমন, ভোল্টেজ বনাম কারেন্টের একটি স্ক্যাটার গ্রাফ আঁকুন",
    rawLabData: "র (Raw) ল্যাব ডেটা",
    rawLabDataPlaceholder: "এখানে এক্সেল/টেবিল ডেটা কপি এবং পেস্ট করুন...\n\nভোল্টেজ কারেন্ট\n১.৫ ৩.২\n২.০ ৪.১\n২.৫ ৫.০",
    plottingGraph: "গ্রাফ আঁকা হচ্ছে...",
    generateGraph: "গ্রাফ তৈরি করুন",
    savedGraphs: "সংরক্ষিত গ্রাফসমূহ",
    noGraphsPlotted: "এখনো কোনো গ্রাফ আঁকা হয়নি।",
    chat: "চ্যাট",
    canvasAwaits: "ক্যানভাস প্রস্তুত",
    pasteLabData: "একটি নির্ভুল এবং ল্যাব-রিপোর্ট উপযোগী প্লট তৈরি করতে বাম দিকে আপনার অগোছালো ল্যাব ডেটা পেস্ট করুন।",
    processingData: "ডেটা পয়েন্ট প্রসেস করা হচ্ছে...",
    plotRendered: "প্লট রেন্ডার করা হয়েছে",
    exportAsPNG: "PNG হিসেবে এক্সপোর্ট করুন",
    saved: "সংরক্ষিত",
    plotData: "প্লট ডেটা"
  },
  Hindi: {
    autoGrapher: "ऑटो-ग्राफर",
    labReportVisualizer: "लैब रिपोर्ट विज़ुअलाइज़र",
    proTierFeature: "प्रो टियर फीचर",
    graphPrompt: "ग्राफ प्रॉम्प्ट (वैकल्पिक)",
    graphPromptPlaceholder: "उदा., वोल्टेज बनाम करंट का एक स्कैटर ग्राफ प्लॉट करें",
    rawLabData: "कच्चा (Raw) लैब डेटा",
    rawLabDataPlaceholder: "यहाँ एक्सेल/टेबल डेटा कॉपी और पेस्ट करें...\n\nवोल्टेज करंट\n1.5 3.2\n2.0 4.1\n2.5 5.0",
    plottingGraph: "ग्राफ प्लॉट किया जा रहा है...",
    generateGraph: "ग्राफ उत्पन्न करें",
    savedGraphs: "सहेजे गए ग्राफ",
    noGraphsPlotted: "अभी तक कोई ग्राफ प्लॉट नहीं किया गया है।",
    chat: "चैट",
    canvasAwaits: "कैनवास तैयार है",
    pasteLabData: "एक सटीक और लैब-रिपोर्ट के लिए तैयार प्लॉट उत्पन्न करने के लिए बाईं ओर अपना अव्यवस्थित लैब डेटा पेस्ट करें।",
    processingData: "डेटा बिंदु प्रोसेस किए जा रहे हैं...",
    plotRendered: "प्लॉट रेंडर किया गया",
    exportAsPNG: "PNG के रूप में निर्यात करें",
    saved: "सहेजा गया",
    plotData: "प्लॉट डेटा"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function LabGraphPage() {
  const supabase = createClient();
  const [prompt, setPrompt] = useState('');
  const [rawData, setRawData] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  const { tokens, tier, refreshTokens } = useTokens();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [requiredTokensForModal, setRequiredTokensForModal] = useState(15);

  // 🟢 MOBILE UI STATES
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'history'|'config'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = React.useRef(0);
  const [language, setLanguage] = useState<LanguageType>('English');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false);
    } else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
      setIsHeaderVisible(true);
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    fetchHistory();
    const savedLang = localStorage.getItem('Prepia_language');
    if (savedLang) setLanguage(savedLang as LanguageType);
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('lab_graphs_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setHistoryList(data);
    } catch (e) {}
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawData.trim() || isLoading) return;

    if (tier !== 'PRO' && tokens < 15) {
      setRequiredTokensForModal(15);
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setChartConfig(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/labgraph/generate` : `${apiUrlBase}/api/labgraph/generate`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ prompt, rawData, language })
      });

      if (response.status === 402) {
        const errData = await response.json();
        if (errData.error === 'INSUFFICIENT_TOKENS') {
            setRequiredTokensForModal(errData.required || 15);
            setShowTokenModal(true);
            setIsLoading(false);
            return;
        }
      }

      const data = await response.json();
      if (!data.valid || !data.chartConfig) throw new Error(data.error || "Failed to plot data.");

      setChartConfig(data.chartConfig);
      if (data.savedId) setActiveGraphId(data.savedId);

      refreshTokens();
      fetchHistory();
    } catch (error: any) {
      showPublicError();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteGraph = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('lab_graphs_history').delete().eq('id', id);
    if (activeGraphId === id) {
      setActiveGraphId(null);
      setChartConfig(null);
    }
    fetchHistory();
  };

  // 🟢 ZERO-DEPENDENCY SVG to PNG EXPORT
  const downloadChartAsPNG = () => {
    if (!chartRef.current) return;
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 80;
      canvas.height = img.height + 80;
      if(ctx) {
        ctx.fillStyle = "white"; // White background for lab reports
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 40, 40);
        const a = document.createElement("a");
        a.download = `${chartConfig?.title?.replace(/\s+/g, '_') || 'lab_report_chart'}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const renderChart = () => {
    if (!chartConfig) return null;
    const { chartType, data, xAxisLabel, yAxisLabel } = chartConfig;

    const commonProps = {
      data,
      margin: { top: 40, right: 40, bottom: 40, left: 40 }
    };

    const renderAxes = () => (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="x" type="number" name={xAxisLabel} tick={{fill: '#64748b'}} domain={['auto', 'auto']}>
          <Label value={xAxisLabel} offset={-20} position="insideBottom" fill="#475569" fontWeight="bold" />
        </XAxis>
        <YAxis dataKey="y" name={yAxisLabel} tick={{fill: '#64748b'}} domain={['auto', 'auto']}>
          <Label value={yAxisLabel} angle={-90} position="insideLeft" fill="#475569" fontWeight="bold" style={{ textAnchor: 'middle' }} />
        </YAxis>
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Legend verticalAlign="top" height={36} />
      </>
    );

    if (chartType === 'scatter') {
      return (
        <ScatterChart {...commonProps}>
          {renderAxes()}
          <Scatter name={chartConfig.title} data={data} fill="#3b82f6" line={{stroke: '#93c5fd', strokeWidth: 1}} shape="circle" />
        </ScatterChart>
      );
    } else if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {renderAxes()}
          <Bar name={chartConfig.title} dataKey="y" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    } else {
      // Default to Line
      return (
        <LineChart {...commonProps}>
          {renderAxes()}
          <Line type="monotone" name={chartConfig.title} dataKey="y" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
        </LineChart>
      );
    }
  };

  const t = translations[language];

  return (
    <SecureLayout>
      <OutOfTokensModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        requiredTokens={requiredTokensForModal}
      />
      <div className="min-h-[calc(100vh-80px)] p-0 lg:p-4 bg-slate-950 lg:bg-slate-950 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] lg:h-[calc(100vh-120px)] w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-hidden lg:bg-slate-950 bg-slate-950 lg:border lg:border-slate-700 lg:rounded-3xl shadow-none lg:shadow-sm relative custom-scrollbar">

        {/* Left Panel: Inputs (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:w-1/3 bg-slate-950 border-r border-slate-800 p-6 flex-col shrink-0 h-full overflow-y-auto custom-scrollbar relative z-10">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-500 to-cyan-600 text-white text-[10px] font-black tracking-widest px-4 py-1.5 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
             <ShieldCheck size={12}/> {t.proTierFeature}
          </div>

          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <ChartIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{t.autoGrapher}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.labReportVisualizer}</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-2"><Settings2 size={14}/> {t.graphPrompt}</label>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.graphPromptPlaceholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-200 placeholder:text-slate-300 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-2"><Table2 size={14}/> {t.rawLabData}</label>
              <textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder={t.rawLabDataPlaceholder}
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-xs text-slate-300 placeholder:text-slate-300 shadow-inner custom-scrollbar"
                rows={7}
                required
              />
            </div>

            <button type="submit" disabled={isLoading || !rawData.trim()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isLoading ? t.plottingGraph : t.generateGraph}
            </button>
          </form>

          {/* History Library */}
          <div className="mt-8 pt-6 border-t border-slate-800/50 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2 shrink-0">
              <History size={14} className="text-blue-400" /> {t.savedGraphs}
            </h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-900 rounded-xl">{t.noGraphsPlotted}</p>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setActiveGraphId(item.id); setChartConfig(item.chart_config); }}
                    className={`group p-3 rounded-xl cursor-pointer transition-all border flex justify-between items-center ${activeGraphId === item.id ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Activity size={14} className="text-slate-500 group-hover:text-blue-400 shrink-0"/>
                      <p className={`text-sm font-bold truncate max-w-[180px] ${activeGraphId === item.id ? 'text-blue-300' : 'text-slate-300'}`}>{item.title}</p>
                    </div>
                    <button onClick={(e) => deleteGraph(item.id, e)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={14}/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Premium Graph Viewport */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">

          {/* Mobile Smart Header */}
          <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><ChartIcon size={16} className="text-blue-400"/> {t.autoGrapher}</h2>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">{t.labReportVisualizer}</p>
            </div>
            <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-indigo-600 text-white shadow-md">{t.chat}</button>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto custom-scrollbar flex flex-col p-0 relative bg-slate-900">

          {!chartConfig && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-10">
              <ChartIcon size={80} className="text-slate-300 mb-6" />
              <h3 className="text-3xl font-black text-slate-400">{t.canvasAwaits}</h3>
              <p className="text-slate-500 mt-2 max-w-sm">{t.pasteLabData}</p>
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t.processingData}</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-700">

               {/* Aesthetic Header */}
               <div className="p-6 md:p-8 border-b border-slate-700 bg-slate-950 flex flex-col md:flex-row gap-4 justify-between items-center z-10 shadow-sm">
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-200 mb-1">{chartConfig?.title}</h2>
                    <p className="text-blue-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                       <Activity size={14}/> {chartConfig?.chartType.toUpperCase()} {t.plotRendered}
                    </p>
                  </div>
                  <button onClick={downloadChartAsPNG} className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95">
                    <Download size={18} /> {t.exportAsPNG}
                  </button>
               </div>

               {/* Recharts Canvas Viewport */}
               <div className="flex-1 w-full relative p-4 md:p-8 flex items-center justify-center bg-slate-900" ref={chartRef}>
                  <div className="w-full h-[400px] md:h-full max-h-[600px] border border-slate-800 rounded-3xl shadow-2xl p-2 md:p-6 bg-slate-900 overflow-x-auto custom-scrollbar">
                     <div className="min-w-[500px] h-full">
                       <ResponsiveContainer width="100%" height="100%">
                          {renderChart() as any}
                       </ResponsiveContainer>
                     </div>
                  </div>
               </div>

               <div className="h-20 lg:h-0"></div>

            </div>
          )}
          </div>

          {/* Mobile Floating Input Dock */}
          <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
              <button
                onClick={() => setIsMobileDrawerOpen('history')}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[13px] font-black tracking-wide shadow-sm border backdrop-blur-md transition-all active:scale-95 bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white shrink-0"
              >
                <History size={16}/> {t.saved}
              </button>

              <button
                onClick={() => setIsMobileDrawerOpen('config')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 border border-blue-400/50"
              >
                <Sparkles size={18} /> {t.plotData}
              </button>
            </div>
          </div>

        </div>

        {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
        <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen !== 'none' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
                {isMobileDrawerOpen === 'history' ? <><History size={18} className="text-blue-400"/> {t.savedGraphs}</> : <><ChartIcon size={18} className="text-blue-400"/> {t.plotData}</>}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
              {isMobileDrawerOpen === 'history' ? (
                <div className="space-y-3">
                  {historyList.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950">{t.noGraphsPlotted}</p>
                  ) : (
                    historyList.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveGraphId(item.id);
                          setChartConfig(item.chart_config);
                          setIsMobileDrawerOpen('none');
                        }}
                        className="group p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:shadow-md transition-all flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Activity size={14} className="text-slate-500 group-hover:text-blue-400 shrink-0"/>
                          <p className={`text-sm font-bold truncate max-w-[180px] ${activeGraphId === item.id ? 'text-blue-300' : 'text-slate-300'}`}>{item.title}</p>
                        </div>
                        <button onClick={(e) => deleteGraph(item.id, e)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={14}/></button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <form onSubmit={(e) => { handleGenerate(e); if(rawData.trim()) setIsMobileDrawerOpen('none'); }} className="space-y-5">
                  <div>
                    <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-2"><Settings2 size={14}/> {t.graphPrompt}</label>
                    <input
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t.graphPromptPlaceholder}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-200 placeholder:text-slate-300 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-2"><Table2 size={14}/> {t.rawLabData}</label>
                    <textarea
                      value={rawData}
                      onChange={(e) => setRawData(e.target.value)}
                      placeholder={t.rawLabDataPlaceholder}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-xs text-slate-300 placeholder:text-slate-300 shadow-inner custom-scrollbar"
                      rows={5}
                      required
                    />
                  </div>

                  <button type="submit" disabled={isLoading || !rawData.trim()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isLoading ? t.plottingGraph : t.generateGraph}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        </div>
      </div>
    </SecureLayout>
  );
}
