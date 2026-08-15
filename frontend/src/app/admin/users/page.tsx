'use client';

import React, { useEffect, useState } from 'react';
import SecureLayout from '@/components/layout/SecureLayout';
import RequireAdmin from '@/components/hoc/RequireAdmin';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function AdminUsersPage() {
  const supabase = createClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiOrigin}/api/admin/users`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (response.ok) {
        const payload = await response.json();
        setData(payload);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
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
              <h1 className="text-3xl font-bold text-slate-900">Users Tracking</h1>
              <p className="text-slate-600 mt-1">Detailed overview of users, packages, and transactions</p>
            </div>
            <div className="flex gap-4">
              <Link href="/admin/analytics" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                View Analytics
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Users</h3>
                  <p className="text-4xl font-bold text-slate-900 mt-2">{data?.totalUsers || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Pro Users</h3>
                  <p className="text-4xl font-bold text-indigo-900 mt-2">{data?.proUsers || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Total Revenue</h3>
                  <p className="text-4xl font-bold text-emerald-900 mt-2">৳ {data?.totalRevenue?.toLocaleString() || 0}</p>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-900 border-b border-slate-200 font-semibold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="p-4 px-6">User</th>
                        <th className="p-4 px-6">Package</th>
                        <th className="p-4 px-6">TrxID</th>
                        <th className="p-4 px-6 text-right">Amount (Tk)</th>
                        <th className="p-4 px-6">Created At</th>
                        <th className="p-4 px-6">Ending Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.users?.map((user: any) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 px-6 font-medium text-slate-900">
                            {user.fullName}
                            <span className="block text-xs text-slate-400 font-normal mt-0.5">{user.id.substring(0, 8)}...</span>
                          </td>
                          <td className="p-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                              user.tier === 'free' ? 'bg-slate-100 text-slate-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {user.planType}
                            </span>
                          </td>
                          <td className="p-4 px-6 font-mono text-xs text-slate-500">
                            {user.trxId || '-'}
                          </td>
                          <td className="p-4 px-6 text-right font-semibold text-emerald-600">
                            {user.amount > 0 ? `৳${user.amount}` : '-'}
                          </td>
                          <td className="p-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </td>
                          <td className="p-4 px-6 text-xs whitespace-nowrap">
                            {user.packageEnd ? (
                              <span className={`${new Date(user.packageEnd) < new Date() ? 'text-red-500 font-medium' : 'text-slate-600'}`}>
                                {new Date(user.packageEnd).toLocaleDateString('en-GB', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                      {(!data?.users || data.users.length === 0) && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </SecureLayout>
    </RequireAdmin>
  );
}
