'use client';

import React, { useEffect, useState } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import RequireAdmin from '@/components/hoc/RequireAdmin';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface ApiConfig {
  id: string;
  provider_name: string;
  api_key: string;
  model_name: string;
  priority: number;
  is_active: boolean;
  task_type: string;
  available_models?: string[]; 
  isLoadingModels?: boolean;
  has_api_key?: boolean;
}

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [featureMappings, setFeatureMappings] = useState<{tier: string, features: string[]}[]>([
    { tier: 'free_embedding', features: [] },
    { tier: 'free_general', features: [] },
    { tier: 'free_complex', features: [] },
    { tier: 'pro_embedding', features: [] },
    { tier: 'pro_general', features: [] },
    { tier: 'pro_complex', features: [] }
  ]);
  const [activeTab, setActiveTab] = useState<'embedding' | 'general' | 'complex'>('embedding');
  const [mappingUserType, setMappingUserType] = useState<'free' | 'pro'>('free');
  const [activeMappingTab, setActiveMappingTab] = useState<'embedding' | 'general' | 'complex'>('embedding');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // SMS Processing State
  const [smsText, setSmsText] = useState('');
  const [smsStatus, setSmsStatus] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [isProcessingSms, setIsProcessingSms] = useState(false);

  const ALL_FEATURES = [
    'chat', 'quiz', 'live', 'voice', 'night-before', 'mind-map', 'flashcard', 
    'story', 'solver', 'podcast', 'molecule', 'curve', 'planner', 'presentation', 
    'flowchart', 'wallpaper', 'logicflow', 'universe', 'timeline', 'bionic', 
    'purifier', 'calendar', 'labgraph', 'battle', 'youtube', 'focus', 'battle2', 
    'reward', 'syllabus', 'geomapper', 'career', 'notes', 'bookjumper', 'oracle'
  ];

  useEffect(() => {
    fetchConfigs();
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${apiOrigin}/api/admin/feature-mappings`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.data) {
      setFeatureMappings(prev => prev.map(p => {
         const found = payload.data.find((d: any) => d.tier === p.tier);
         return found ? { tier: p.tier, features: found.features || [] } : p;
      }));
    }
  };

  const fetchConfigs = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${apiOrigin}/api/admin/api-configurations`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const payload = await response.json().catch(() => ({}));
    const data = payload.data;
    if (response.ok && data) {
      const formattedData = data.map(d => ({ ...d, available_models: d.model_name ? [d.model_name] : [] }));
      setConfigs(formattedData);
    } else {
      setSaveStatus(`Unable to load routing settings: ${payload.error || response.statusText}`);
    }
    setIsLoading(false);
  };

  const fetchAvailableModels = async (id: string, provider: string, apiKey: string) => {
    if (!apiKey || apiKey.length < 10) return;
    
    handleUpdate(id, 'isLoadingModels', true);
    try {
      let models: string[] = [];
      
      if (provider.toLowerCase() === 'gemini' || provider.toLowerCase() === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        if (data.models) {
          models = data.models.map((m: any) => m.name.replace('models/', ''));
        }
      } else if (provider.toLowerCase() === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data = await res.json();
        if (data.data) {
          models = data.data.map((m: any) => m.id);
        }
      } else if (provider.toLowerCase() === 'openai' || provider.toLowerCase() === 'deepseek') {
        const baseUrl = provider.toLowerCase() === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1';
        try {
          const res = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          const data = await res.json();
          if (data.data) {
            models = data.data.map((m: any) => m.id);
          }
        } catch (e) {
          models = [];
        }
      } else if (provider.toLowerCase() === 'atomesus') {
        // 🟢 NEW: Attempt to fetch models from Atomesus (Standard format)
        try {
          const res = await fetch('https://api.atomesus.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          const data = await res.json();
          if (data.data) models = data.data.map((m: any) => m.id);
        } catch (e) {
          // Fallback to manual entry if API doesn't support /models endpoint
          models = []; 
        }
      }

      handleUpdate(id, 'available_models', models);
      
      if (models.length > 0) {
        const currentConfig = configs.find(c => c.id === id);
        if (!currentConfig?.model_name || !models.includes(currentConfig.model_name)) {
          handleUpdate(id, 'model_name', models[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch models");
    } finally {
      handleUpdate(id, 'isLoadingModels', false);
    }
  };

  const handleUpdate = (id: string, field: keyof ApiConfig, value: any) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleAddNewRoute = () => {
    const newConfig: ApiConfig = {
      id: `temp-${Date.now()}`, 
      provider_name: 'gemini',
      api_key: '',
      model_name: '',
      priority: filteredConfigs.length + 1,
      is_active: true,
      task_type: activeTab,
      available_models: [],
      isLoadingModels: false
    };
    setConfigs([...configs, newConfig]);
  };

  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiOrigin}/api/admin/api-configurations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ configs }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Save failed');
      
      // Save feature mappings
      try {
        const mapResponse = await fetch(`${apiOrigin}/api/admin/feature-mappings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ mappings: featureMappings }),
        });
        if (!mapResponse.ok) console.warn('Feature mappings endpoint returned an error (might not be implemented).', mapResponse.status);
      } catch (err) {
        console.warn('Failed to save feature mappings (might not be implemented).', err);
      }

      await fetchConfigs(); 
      setSaveStatus('Saved Successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
      
    } catch (error: any) {
      console.error("Save Configuration Error:", error);
      setSaveStatus(`Error: ${error.message}`); 
    }
  };

  const handleProcessSms = async () => {
    if (!smsText.trim()) return;
    setIsProcessingSms(true);
    setSmsStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiOrigin}/api/admin/process-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: smsText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process SMS');
      setSmsStatus({ type: 'success', message: data.message || 'Payment verified successfully.' });
      setSmsText('');
    } catch (error: any) {
      setSmsStatus({ type: 'error', message: error.message });
    } finally {
      setIsProcessingSms(false);
    }
  };

  const filteredConfigs = configs.filter(c => c.task_type === activeTab);

  return (
    <RequireAdmin>
    <SecureLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">LLM Routing Gateway</h1>
            <p className="text-slate-600 mt-1">Configure Cascading Fallback & Dynamic Models</p>
          </div>
          <Link href="/admin/analytics" className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100">
            View Analytics & Health ➜
          </Link>
          {/* NEW LINK TO ADD */}
          <Link href="/admin/resources" className="ml-2 px-4 py-2 bg-amber-50 text-amber-700 font-semibold rounded-lg hover:bg-amber-100">
            Manage Resource Vault ➜
          </Link>
        </div>

        <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl w-max">
          <button onClick={() => setActiveTab('embedding')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'embedding' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>1. Embedding AI</button>
          <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'general' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>2. Free Users (General)</button>
          <button onClick={() => setActiveTab('complex')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeTab === 'complex' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>3. Pro Users (Complex)</button>
        </div>

        {/* MANUAL SMS PROCESSING UI */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-800 mb-2">Manual Payment Verification (bKash/Nagad/Rocket)</h2>
           <p className="text-sm text-slate-500 mb-4">Paste the full "Send Money" SMS here. The system will extract the TrxID and Amount, find the pending request submitted by the user, and activate their package.</p>
           
           <div className="flex flex-col gap-3">
             <textarea 
               className="w-full min-h-[100px] p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
               placeholder="Example: You have received Tk 1,399.00 from 01518901803... TrxID DHC5D7TJ43"
               value={smsText}
               onChange={(e) => setSmsText(e.target.value)}
             />
             <div className="flex justify-between items-center">
               <button 
                 onClick={handleProcessSms} 
                 disabled={isProcessingSms || !smsText.trim()}
                 className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
               >
                 {isProcessingSms ? 'Verifying...' : 'Verify & Activate'}
               </button>
               {smsStatus && (
                 <div className={`px-4 py-2 rounded-lg text-sm font-medium ${smsStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                   {smsStatus.message}
                 </div>
               )}
             </div>
           </div>
        </div>

        {/* FEATURE MAPPING UI */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
             <div>
               <h2 className="text-lg font-bold text-slate-800">Feature Mappings</h2>
               <p className="text-sm text-slate-500">Map which API tier features use depending on the user's subscription.</p>
             </div>
             <div className="flex bg-slate-100 rounded-lg p-1 w-max">
                <button onClick={() => setMappingUserType('free')} className={`px-4 py-1.5 rounded-md font-semibold text-sm transition ${mappingUserType === 'free' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Free Users</button>
                <button onClick={() => setMappingUserType('pro')} className={`px-4 py-1.5 rounded-md font-semibold text-sm transition ${mappingUserType === 'pro' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Pro Users</button>
             </div>
           </div>
           
           <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl w-max mb-4">
             <button onClick={() => setActiveMappingTab('embedding')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeMappingTab === 'embedding' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>1. Embedding API</button>
             <button onClick={() => setActiveMappingTab('general')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeMappingTab === 'general' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>2. General API</button>
             <button onClick={() => setActiveMappingTab('complex')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${activeMappingTab === 'complex' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>3. Complex API</button>
           </div>

           <div className="flex flex-wrap gap-2">
             {ALL_FEATURES.map(feat => {
               const activeTierName = `${mappingUserType}_${activeMappingTab}`;
               const currentMapping = featureMappings.find(m => m.tier === activeTierName);
               const isSelected = currentMapping?.features.includes(feat);
               const isAssignedElsewhere = featureMappings.find(m => m.tier !== activeTierName && m.tier.startsWith(`${mappingUserType}_`) && m.features.includes(feat));
               
               return (
                 <label key={feat} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : isAssignedElsewhere ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                   <input 
                     type="checkbox" 
                     className="hidden" 
                     checked={!!isSelected}
                     onChange={(e) => {
                       setFeatureMappings(prev => prev.map(m => {
                         if (m.tier === activeTierName) {
                           return { ...m, features: e.target.checked ? [...m.features, feat] : m.features.filter(f => f !== feat) };
                         }
                         if (e.target.checked && m.tier.startsWith(`${mappingUserType}_`) && m.features.includes(feat)) {
                           return { ...m, features: m.features.filter(f => f !== feat) };
                         }
                         return m;
                       }));
                     }}
                   />
                   {feat}
                 </label>
               )
             })}
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Provider</th>
                <th className="px-6 py-4 font-semibold">API Key</th>
                <th className="px-6 py-4 font-semibold w-1/4">Select Model</th>
                <th className="px-6 py-4 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConfigs.map((config) => (
                <tr key={config.id} className={`hover:bg-slate-50 ${!config.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <select value={config.priority} onChange={(e) => handleUpdate(config.id, 'priority', parseInt(e.target.value))} className="px-3 py-2 border rounded-lg focus:ring-indigo-500 font-bold text-slate-700">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Route Priority {n}</option>)}
                    </select>
                  </td>
                  
                  <td className="px-6 py-4">
                    <select value={config.provider_name} onChange={(e) => handleUpdate(config.id, 'provider_name', e.target.value)} className="px-3 py-2 border rounded-lg focus:ring-indigo-500 font-bold text-slate-800 capitalize">
                      <option value="gemini">Gemini</option>
                      <option value="groq">Groq</option>
                      <option value="openai">OpenAI</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="atomesus">Atomesus</option> {/* 🟢 NEW: Added Atomesus */}
                    </select>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        value={config.api_key || ''} 
                        onChange={(e) => handleUpdate(config.id, 'api_key', e.target.value)} 
                        onBlur={(e) => fetchAvailableModels(config.id, config.provider_name, e.target.value)}
                        placeholder="Paste API Key & click outside..." 
                        className="w-full px-3 py-2 border rounded-lg font-mono text-xs focus:ring-indigo-500" 
                      />
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {config.isLoadingModels ? (
                      <span className="text-xs text-indigo-500 animate-pulse">Fetching models...</span>
                    ) : config.available_models && config.available_models.length > 0 ? (
                      <select 
                        value={config.model_name || ''} 
                        onChange={(e) => handleUpdate(config.id, 'model_name', e.target.value)} 
                        className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 text-xs font-mono"
                      >
                        {config.available_models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={config.model_name || ''} 
                        onChange={(e) => handleUpdate(config.id, 'model_name', e.target.value)} 
                        placeholder="Type model manually..." 
                        className="w-full px-3 py-2 border rounded-lg font-mono text-xs focus:ring-indigo-500 bg-slate-50" 
                      />
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <input type="checkbox" checked={config.is_active} onChange={(e) => handleUpdate(config.id, 'is_active', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                  </td>
                </tr>
              ))}
              {filteredConfigs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No configuration found for this section. Click the button below to add a new provider route.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
            <button onClick={handleAddNewRoute} className="px-4 py-2 border border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition">
              + Add New Provider Route
            </button>

            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium ${saveStatus?.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{saveStatus}</span>
              <button onClick={handleSave} className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 shadow-sm transition">
                Save Gateway Rules
              </button>
            </div>
          </div>
        </div>
      </div>
    </SecureLayout>
    </RequireAdmin>
  );
}
