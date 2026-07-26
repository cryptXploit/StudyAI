'use client';

import React, { useEffect, useState } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import RequireAdmin from '@/components/hoc/RequireAdmin';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function AdminAnalyticsPage() {
  const supabase = createClient();
  const [costLogs, setCostLogs] = useState<any[]>([]);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${apiOrigin}/api/admin/analytics`, {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setCostLogs(payload.costs || []);
    setHealthLogs(payload.health || []);
  };

  return (
    <RequireAdmin>
    <SecureLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Analytics</h1>
            <p className="text-slate-600 mt-1">API Cost and Health Monitoring</p>
          </div>
          <Link href="/admin/settings" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50">
            Back to Routing Settings
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Health Monitor */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-4">API Latency & Health</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {healthLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                  <span className="font-semibold capitalize">{log.provider}</span>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {log.status.toUpperCase()}
                  </span>
                  <span className="text-slate-500 font-mono">{log.latency_ms} ms</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Tracker */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-4">Token Usage Logs</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {costLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                  <div>
                    <p className="font-semibold">{log.provider}</p>
                    <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-indigo-600 text-xs font-bold">IN: {log.input_tokens}</p>
                    <p className="font-mono text-emerald-600 text-xs font-bold">OUT: {log.output_tokens}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SecureLayout>
    </RequireAdmin>
  );
}
