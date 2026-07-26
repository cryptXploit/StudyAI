'use client';

import React, { useEffect, useState } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import RequireAdmin from '@/components/hoc/RequireAdmin';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { BookOpen, Plus, Trash2, Save, ExternalLink } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  embed_url: string;
  keywords: string;
  is_active: boolean;
}

export default function AdminResourceVaultPage() {
  const supabase = createClient();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('learning_resources').select('*').order('created_at', { ascending: false });
    if (data) setResources(data);
    setIsLoading(false);
  };

  const handleUpdate = (id: string, field: keyof Resource, value: any) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleAddNew = () => {
    const newResource: Resource = {
      id: `temp-${Date.now()}`,
      title: '',
      embed_url: '',
      keywords: '',
      is_active: true
    };
    setResources([newResource, ...resources]);
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('temp-')) {
      setResources(resources.filter(r => r.id !== id));
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this resource?")) {
      await supabase.from('learning_resources').delete().eq('id', id);
      setResources(resources.filter(r => r.id !== id));
    }
  };

  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      for (const res of resources) {
        if (!res.title || !res.embed_url || !res.keywords) {
           throw new Error("Title, Embed URL, and Keywords are required for all resources.");
        }

        if (res.id.startsWith('temp-')) {
          const { error: insertError } = await supabase.from('learning_resources').insert({
            title: res.title,
            embed_url: res.embed_url,
            keywords: res.keywords.toLowerCase(),
            is_active: res.is_active
          });
          if (insertError) throw new Error(insertError.message);
        } else {
          const { error: updateError } = await supabase.from('learning_resources').update({
            title: res.title,
            embed_url: res.embed_url,
            keywords: res.keywords.toLowerCase(),
            is_active: res.is_active
          }).eq('id', res.id);
          if (updateError) throw new Error(updateError.message);
        }
      }
      
      await fetchResources();
      setSaveStatus('Saved Successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
      
    } catch (error: any) {
      console.error("Save Resource Error:", error);
      setSaveStatus(`Error: ${error.message}`); 
    }
  };

  return (
    <RequireAdmin>
    <SecureLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Learning Resource Vault</h1>
            <p className="text-slate-600 mt-1">Manage Interactive Simulations & OER Links</p>
          </div>
          <div className="flex gap-2">
             <Link href="/admin/settings" className="px-4 py-2 bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 hover:bg-slate-100">
               Routing Settings
             </Link>
             <Link href="/admin/analytics" className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100">
               View Analytics ➜
             </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/5">Title</th>
                <th className="px-6 py-4 font-semibold w-1/3">Embed URL / iframe link</th>
                <th className="px-6 py-4 font-semibold w-1/4">Keywords (Comma separated)</th>
                <th className="px-6 py-4 font-semibold text-center">Active</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.map((resource) => (
                <tr key={resource.id} className={`hover:bg-slate-50 ${!resource.is_active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                  
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={resource.title} 
                      onChange={(e) => handleUpdate(resource.id, 'title', e.target.value)} 
                      placeholder="e.g. Projectile Motion" 
                      className="w-full px-3 py-2 border rounded-lg focus:ring-amber-500 font-semibold text-slate-800" 
                    />
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={resource.embed_url} 
                         onChange={(e) => handleUpdate(resource.id, 'embed_url', e.target.value)} 
                         placeholder="https://phet.colorado.edu/sims/html/..." 
                         className="w-full px-3 py-2 border rounded-lg font-mono text-xs focus:ring-amber-500" 
                       />
                       {resource.embed_url && !resource.id.startsWith('temp-') && (
                          <a href={resource.embed_url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg">
                             <ExternalLink size={16}/>
                          </a>
                       )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={resource.keywords} 
                      onChange={(e) => handleUpdate(resource.id, 'keywords', e.target.value)} 
                      placeholder="physics, math, projectile" 
                      className="w-full px-3 py-2 border rounded-lg font-mono text-xs focus:ring-amber-500 bg-slate-50" 
                    />
                  </td>

                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={resource.is_active} onChange={(e) => handleUpdate(resource.id, 'is_active', e.target.checked)} className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer" />
                  </td>

                  <td className="px-6 py-4 text-right">
                     <button onClick={() => handleDelete(resource.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={18}/>
                     </button>
                  </td>
                </tr>
              ))}
              
              {resources.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                       <BookOpen size={48} className="text-slate-300 mb-3"/>
                       <p className="font-semibold text-lg text-slate-700">No Learning Resources Added Yet</p>
                       <p className="text-sm mt-1 mb-4 max-w-md">Add iframe URLs from PhET, GeoGebra, or YouTube. The frontend will pull these automatically based on user topic keywords (0 API Cost).</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
            <button onClick={handleAddNew} className="px-4 py-2 border-2 border-dashed border-amber-600 text-amber-700 font-bold rounded-xl hover:bg-amber-50 transition flex items-center gap-2">
              <Plus size={18}/> Add New Resource Link
            </button>

            <div className="flex items-center gap-4">
              <span className={`text-sm font-bold ${saveStatus?.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{saveStatus}</span>
              <button onClick={handleSave} className="px-8 py-3 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 shadow-lg active:scale-95 transition flex items-center gap-2">
                <Save size={18}/> Save Vault
              </button>
            </div>
          </div>
        </div>
      </div>
    </SecureLayout>
    </RequireAdmin>
  );
}
