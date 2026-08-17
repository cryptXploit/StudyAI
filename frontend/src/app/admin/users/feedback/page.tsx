'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import RequireAdmin from '@/components/hoc/RequireAdmin';
import SecureLayout from '@/components/layout/SecureLayout';
import { Eye, EyeOff } from 'lucide-react';

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function AdminFeedbacksPage() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidePersonalInfo, setHidePersonalInfo] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiOrigin}/api/admin/feedbacks`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (response.ok) {
        const payload = await response.json();
        setData(payload);
      }
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireAdmin>
      <SecureLayout>
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">User Feedbacks</h1>
              <p className="text-slate-500 mt-1">Review feedback, bug reports, and suggestions.</p>
            </div>
            
            <button
              onClick={() => setHidePersonalInfo(!hidePersonalInfo)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium shadow-sm border border-slate-200"
            >
              {hidePersonalInfo ? (
                <>
                  <Eye className="w-5 h-5 text-indigo-600" />
                  Show Name & Email
                </>
              ) : (
                <>
                  <EyeOff className="w-5 h-5 text-rose-500" />
                  Hide Name & Email
                </>
              )}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">Loading feedbacks...</div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No feedbacks found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Feedback Type</th>
                      <th className="p-4">Message</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((fb: any) => (
                      <tr key={fb.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className={`font-medium ${hidePersonalInfo ? 'blur-sm select-none opacity-60' : 'text-slate-900'}`}>
                            {fb.full_name}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`text-sm ${hidePersonalInfo ? 'blur-sm select-none opacity-60' : 'text-slate-500'}`}>
                            {fb.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            fb.issue_type?.includes('Bug') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {fb.issue_type || 'Feedback'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap max-w-md">
                            {fb.message}
                          </p>
                          {fb.page_context && (
                            <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-100 px-2 py-1 inline-block rounded">
                              Path: {fb.page_context}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </SecureLayout>
    </RequireAdmin>
  );
}
