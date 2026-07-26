'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import { createClient } from '@/lib/supabase/client';
import { Map as MapIcon, Loader2, History, Globe, Download, Sparkles, Info, Search } from 'lucide-react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Sphere, Graticule } from "react-simple-maps";
import html2canvas from 'html2canvas';
import OutOfTokensModal from '@/components/modals/OutOfTokensModal';

// Lightweight TopoJSON for the world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const translations = {
  English: {
    title: "Data Geo-Mapper", subtitle: "Interactive World Map Analytics",
    placeholder: "e.g., Global GDP 2023, Allies vs Axis WWII, Top Tech Exporters...",
    generateMap: "Generate Interactive Map", mapping: "Analyzing Global Data...",
    exportMap: "Export as PNG", history: "Map History", noHistory: "No maps generated yet.",
    hoverInfo: "Hover over countries to view data"
  },
  Bangla: {
    title: "ডেটা জিও-ম্যাপার", subtitle: "ইন্টারঅ্যাকটিভ ওয়ার্ল্ড ম্যাপ অ্যানালিটিক্স",
    placeholder: "যেমন: গ্লোবাল জিডিপি ২০২৩, ২য় বিশ্বযুদ্ধের মিত্রশক্তি...",
    generateMap: "ইন্টারঅ্যাকটিভ ম্যাপ তৈরি করুন", mapping: "গ্লোবাল ডেটা বিশ্লেষণ করা হচ্ছে...",
    exportMap: "PNG হিসেবে এক্সপোর্ট করুন", history: "ম্যাপ হিস্ট্রি", noHistory: "কোনো ম্যাপ তৈরি হয়নি।",
    hoverInfo: "ডেটা দেখতে দেশের উপর হোভার করুন"
  },
  Hindi: {
    title: "डेटा जियो-मैपर", subtitle: "इंटरएक्टिव वर्ल्ड मैप एनालिटिक्स",
    placeholder: "उदा., वैश्विक जीडीपी 2023, द्वितीय विश्व युद्ध के मित्र राष्ट्र...",
    generateMap: "इंटरएक्टिव मैप बनाएं", mapping: "वैश्विक डेटा का विश्लेषण किया जा रहा है...",
    exportMap: "PNG के रूप में निर्यात करें", history: "मैप इतिहास", noHistory: "कोई मैप नहीं बनाया गया।",
    hoverInfo: "डेटा देखने के लिए देशों पर होवर करें"
  }
};

type LanguageType = 'English' | 'Bangla' | 'Hindi';

export default function GeoMapperPage() {
  const supabase = createClient();
  const [language, setLanguage] = useState<LanguageType>('English');
  const t = translations[language] || translations['English'];

  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapData, setMapData] = useState<any>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  
  const [historyList, setHistoryList] = useState<any[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Tooltip State
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  // 🟢 MOBILE UI STATES
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<'none'|'search'|'history'>('none');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = React.useRef(0);

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
    const loadLanguage = () => { const savedLang = localStorage.getItem('studyai_language'); if (savedLang) setLanguage(savedLang as LanguageType); };
    loadLanguage(); window.addEventListener('languageChanged', loadLanguage);
    fetchHistory();
    return () => window.removeEventListener('languageChanged', loadLanguage);
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/geomapper/history` : `${apiUrlBase}/api/geomapper/history`;
      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      const data = await res.json();
      if (data.success) setHistoryList(data.history);
    } catch (e) {}
  };

  const handleGenerateMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    setIsLoading(true); setMapData(null); setSelectedCountryId(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, ''); 
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/geomapper/generate` : `${apiUrlBase}/api/geomapper/generate`;
      
      const response = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ topic, language })
      });
      const data = await response.json();
      
      if (data.success) {
        setMapData(data.data);
        fetchHistory();
      } else {
        if (data.error === 'INSUFFICIENT_TOKENS' || response.status === 402) {
          setShowTokenModal(true);
        } else {
          alert(data.error || "Failed to generate map");
        }
      }
    } catch (error) { 
      alert("Server connection error."); 
    } 
    finally { setIsLoading(false); }
  };

  const loadFromHistory = (item: any) => {
    setTopic(item.topic);
    setMapData(item.map_data);
    setSelectedCountryId(null);
  };

  // 🟢 Growth Hacking: Export Map as PNG
  const exportAsImage = async () => {
    if (!mapContainerRef.current) return;
    try {
      const canvas = await html2canvas(mapContainerRef.current, { backgroundColor: '#020617', scale: 2 });
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement('a');
      link.download = `StudyAI_Map_${topic.replace(/\s+/g, '_')}.png`;
      link.href = image; link.click();
    } catch (e) { alert("Failed to export image."); }
  };

  // Optimize Map Data Lookup (O(1) time complexity)
  const mappedCountries = useMemo(() => {
    if (!mapData || !mapData.countries) return {};
    const map: Record<string, any> = {};
    mapData.countries.forEach((c: any) => { 
      if(c.id) map[String(c.id).toLowerCase()] = c; 
      if(c.name) map[String(c.name).toLowerCase()] = c;
    });
    return map;
  }, [mapData]);

  const renderSearchSection = () => (
    <form onSubmit={(e) => { handleGenerateMap(e); setIsMobileDrawerOpen('none'); }} className="space-y-4 bg-slate-950 p-4 md:p-5 rounded-2xl border border-slate-800 shadow-inner shrink-0">
      <div>
        <label className="block text-xs font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Search size={14}/> Query Topic</label>
        <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={t.placeholder} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold focus:border-cyan-500 outline-none text-white placeholder:text-slate-600 transition-colors resize-none" rows={3} required/>
      </div>
      <button type="submit" disabled={isLoading || !topic.trim()} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
        {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} {t.generateMap}
      </button>
    </form>
  );

  const renderHistorySection = () => (
    <>
       <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-2"><History size={14}/> {t.history}</h3>
       <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar pb-6">
         {historyList.length === 0 ? <p className="text-xs text-slate-600 text-center py-4 bg-slate-950 rounded-xl">{t.noHistory}</p> : (
           historyList.map(h => (
             <div key={h.id} onClick={() => { loadFromHistory(h); setIsMobileDrawerOpen('none'); }} className="p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-cyan-500/50 hover:bg-slate-900 transition-all">
               <p className="text-xs font-bold text-slate-300 line-clamp-2">{h.topic}</p>
             </div>
           ))
         )}
       </div>
    </>
  );

  return (
    <SecureLayout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] max-w-7xl mx-auto overflow-hidden bg-slate-950 lg:border lg:border-slate-800 lg:rounded-3xl lg:shadow-2xl lg:mt-4 font-sans relative">
        
        {/* Mobile Smart Header */}
        <div className={`lg:hidden h-[60px] mx-3 mt-3 rounded-2xl flex items-center justify-between px-4 z-40 sticky backdrop-blur-2xl shadow-lg transition-all duration-300 border ${isHeaderVisible ? 'top-3 opacity-100 translate-y-0' : '-top-20 opacity-0 -translate-y-full'} bg-slate-900/90 border-slate-700/50 shadow-[0_0_15px_rgba(0,0,0,0.2)] shrink-0`}>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase text-slate-100"><Globe size={16} className="text-cyan-500"/> Mapper</h2>
            <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">Data Geo-Mapper</p>
          </div>
          <button onClick={() => window.location.href='/chat'} className="px-3 py-1.5 font-black rounded-lg transition uppercase tracking-wider text-[10px] bg-cyan-600 text-slate-900 shadow-md hover:bg-cyan-500">Chat</button>
        </div>

        {/* Desktop Sidebar: Controls & History */}
        <div className="hidden lg:flex w-full lg:w-80 bg-slate-900 border-r border-slate-800 p-6 flex-col z-10 shrink-0 h-full overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8 mt-2">
            <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.2)]"><Globe size={24} /></div>
            <div><h2 className="text-xl font-black text-white tracking-tight">{t.title}</h2><p className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest">{t.subtitle}</p></div>
          </div>
          <div className="mb-8">
            {renderSearchSection()}
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {renderHistorySection()}
          </div>
        </div>

        {/* Right Area: Interactive Map Rendering */}
        <div onScroll={handleScroll} className="flex-1 relative bg-[#020617] flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
          
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
               <Loader2 size={48} className="animate-spin text-cyan-500 mb-4" />
               <h3 className="text-xl font-black text-white">{t.mapping}</h3>
            </div>
          )}

          {!mapData && !isLoading ? (
            <div className="text-center opacity-50">
               <MapIcon size={80} className="mx-auto text-slate-600 mb-4"/>
               <p className="text-lg font-bold text-slate-400">Enter a topic to generate an interactive world map.</p>
            </div>
          ) : mapData && (
            <div ref={mapContainerRef} className="w-full h-full min-h-[500px] md:min-h-0 relative flex flex-col p-2 md:p-6 pb-24 md:pb-12 animate-in zoom-in-95 duration-500">
              
              {/* Map Header Overlay */}
              <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20 max-w-[65%] md:max-w-sm pointer-events-none">
                <h1 className="text-lg md:text-3xl font-black text-white mb-1 md:mb-2 drop-shadow-lg leading-tight">{mapData.title}</h1>
                <p className="text-[10px] md:text-sm font-medium text-slate-300 drop-shadow-md line-clamp-3 md:line-clamp-none">{mapData.description}</p>
                <div className="hidden md:flex mt-4 items-center gap-2 text-[10px] uppercase font-black tracking-widest text-cyan-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-cyan-500/30 backdrop-blur-md w-fit">
                  <Info size={12}/> {t.hoverInfo}
                </div>
              </div>

              {/* Legend Overlay */}
              {mapData.legend && mapData.legend.length > 0 && (
                <div className="absolute bottom-24 md:bottom-8 left-4 md:left-8 z-20 bg-slate-900/80 backdrop-blur-md border border-slate-700 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl pointer-events-none">
                  <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 md:mb-3">Legend</h4>
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    {mapData.legend.map((leg: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm bg-slate-400"></div>
                        <span className="text-[10px] md:text-xs font-bold text-slate-300">{leg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 🟢 Export Button (Intelligently Hidden on Mobile) */}
              <button onClick={exportAsImage} className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex items-center gap-2 bg-slate-800/80 md:bg-cyan-600/90 hover:bg-cyan-500 backdrop-blur-md border border-slate-600 md:border-cyan-400/50 text-white p-2.5 md:px-4 md:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 group">
                <Download size={16} className="text-slate-300 md:text-white group-hover:text-white" /> 
                <span className="hidden md:inline">{t.exportMap}</span>
              </button>

              {/* WATERMARK FOR EXPORT */}
              <div className="absolute bottom-24 md:bottom-6 right-4 md:right-8 z-20 opacity-40 pointer-events-none">
                <p className="text-[8px] md:text-[10px] font-black tracking-widest text-white uppercase">Generated by Prepia</p>
              </div>

              {/* 🟢 SELECTED COUNTRY FIXED PANEL (Mobile & Desktop) */}
              {selectedCountryId && mappedCountries[selectedCountryId] && (
                <div className="absolute top-32 md:top-auto md:bottom-12 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 p-4 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.3)] animate-in slide-in-from-top-10 md:slide-in-from-bottom-10 w-[85%] md:w-auto min-w-[300px] max-w-md flex flex-col gap-3 pointer-events-auto">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight">{mappedCountries[selectedCountryId].name}</h3>
                    <button onClick={() => setSelectedCountryId(null)} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg active:scale-95 transition-all">✕</button>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 shadow-inner">
                    <p className="text-sm md:text-base font-bold text-cyan-400">{mappedCountries[selectedCountryId].value}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-md shadow-sm border border-slate-600" style={{ backgroundColor: mappedCountries[selectedCountryId].color }}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Data Color Match</span>
                  </div>
                </div>
              )}

              {/* 🌍 THE INTERACTIVE D3 MAP */}
              <div className="flex-1 w-full flex items-center justify-center cursor-crosshair relative touch-none pointer-events-auto" onClick={() => { /* Clicking outside map clears selection */ }}>
                <ComposableMap projectionConfig={{ scale: 140 }} className="w-full h-full outline-none">
                  <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={8}>
                    <Sphere stroke="#1e293b" strokeWidth={0.5} id="sphere" fill="transparent" />
                    <Graticule stroke="#0f172a" strokeWidth={0.5} />
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const countryName = geo.properties?.name || '';
                          const mapKey = countryName.toLowerCase();
                          const countryData = mappedCountries[mapKey];
                          const isMapped = !!countryData;
                          const fillColor = isMapped ? (countryData.color || '#0ea5e9') : '#0f172a';
                          const isSelected = mapKey === selectedCountryId;

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              stroke={isSelected ? "#ffffff" : "#1e293b"}
                              strokeWidth={isSelected ? 1.5 : 0.5}
                              style={{
                                default: { fill: fillColor, outline: "none", transition: "all 300ms ease", filter: isSelected ? "drop-shadow(0 0 12px rgba(255,255,255,0.6))" : "none" },
                                hover: { fill: isMapped ? "#38bdf8" : "#1e293b", outline: "none", filter: isMapped && !isSelected ? "drop-shadow(0 0 8px rgba(56,189,248,0.8))" : "none", zIndex: 10 },
                                pressed: { outline: "none" }
                              }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent clicking outside map logic
                                if (isMapped) {
                                  setSelectedCountryId(isSelected ? null : geo.id);
                                  setTooltipContent(''); // Clear hover tooltip on click
                                }
                              }}
                              onMouseEnter={(e) => {
                                if (isMapped && !('ontouchstart' in window) && !isSelected) {
                                  setTooltipContent(`${countryData.name}`);
                                  setTooltipPos({ x: e.clientX, y: e.clientY });
                                }
                              }}
                              onMouseMove={(e) => {
                                if (isMapped && !('ontouchstart' in window)) setTooltipPos({ x: e.clientX, y: e.clientY });
                              }}
                              onMouseLeave={() => setTooltipContent('')}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>

                {/* Custom Tooltip (Desktop Only Hover) */}
                {tooltipContent && !('ontouchstart' in window) && (
                  <div 
                    className="fixed z-50 bg-slate-900 border border-cyan-500/50 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-15px]"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                  >
                    {tooltipContent}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Floating Input Dock */}
        <div className={`lg:hidden fixed bottom-0 left-0 w-full p-4 z-30 pointer-events-none transition-all duration-500 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent flex flex-col items-center pb-6 ${isHeaderVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
          <div className="w-full max-w-md flex gap-2 pointer-events-auto shadow-2xl">
            <button 
              onClick={() => setIsMobileDrawerOpen('history')} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 border border-slate-700"
            >
              <History size={18} /> {t.history}
            </button>
            <button 
              onClick={() => setIsMobileDrawerOpen('search')} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black tracking-wide rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all active:scale-95 border border-cyan-400/50"
            >
              <Search size={18} /> Query
            </button>
          </div>
        </div>

        {/* 🟢 MOBILE BOTTOM SHEET DRAWERS 🟢 */}
        <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${isMobileDrawerOpen !== 'none' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileDrawerOpen('none')} />
          
          {/* Search Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'search' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderSearchSection()}
          </div>

          {/* History Drawer */}
          <div className={`absolute bottom-0 left-0 w-full h-auto max-h-[85vh] rounded-t-[2rem] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-500 custom-scrollbar flex flex-col border-t bg-slate-900 border-slate-700 ${isMobileDrawerOpen === 'history' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsMobileDrawerOpen('none')} />
            {renderHistorySection()}
          </div>
        </div>

      </div>
      
      {showTokenModal && (
        <OutOfTokensModal 
          isOpen={showTokenModal} 
          onClose={() => setShowTokenModal(false)} 
           
          requiredTokens={15} 
        />
      )}
    </SecureLayout>
  );
}
