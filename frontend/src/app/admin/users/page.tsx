'use client';

import React from 'react';
import Link from 'next/link';
import RequireAdmin from '@/components/hoc/RequireAdmin';
import SecureLayout from '@/components/layout/SecureLayout';
import { UsersIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function AdminUsersHubPage() {
  return (
    <RequireAdmin>
      <SecureLayout>
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <div className="border-b pb-4">
            <h1 className="text-3xl font-bold text-slate-900">Users Management</h1>
            <p className="text-slate-600 mt-2">Manage user payments, tiers, and feedbacks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/admin/users/payment" className="group">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-600">
                    <UsersIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">User Payments & Tiers</h2>
                    <p className="text-sm text-slate-500">Track user subscriptions, tokens, and payment history.</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/users/feedback" className="group">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors text-indigo-600">
                    <ChatBubbleLeftRightIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">User Feedbacks</h2>
                    <p className="text-sm text-slate-500">View bug reports, feature requests, and feedback from users.</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </SecureLayout>
    </RequireAdmin>
  );
}
