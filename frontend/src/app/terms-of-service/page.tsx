'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 pb-24 selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="bg-slate-900 pt-16 pb-32 px-6 relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-bold text-sm">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Terms of Service</h1>
          <p className="text-xl text-slate-400 font-medium">Clear rules for a clean, secure, and productive environment.</p>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-20">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/50 p-8 md:p-12 space-y-12">
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-6 bg-slate-950 rounded-2xl flex items-start gap-4 border border-slate-800">
              <CheckCircle className="text-indigo-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-white mb-1">Fair Usage</h4>
                <p className="text-sm font-medium text-slate-400">Our platform is built for education. Please use AI tokens responsibly and ethically.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-950 rounded-2xl flex items-start gap-4 border border-slate-800">
              <ShieldAlert className="text-amber-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-white mb-1">Account Security</h4>
                <p className="text-sm font-medium text-slate-400">You are responsible for keeping your login credentials and OTPs private.</p>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><FileText className="text-indigo-500" /> Acceptance of Terms</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              By accessing and using Prepia, you agree to be bound by these Terms of Service. If you do not agree with any part of the terms, you may not access the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><FileText className="text-indigo-500" /> Subscription and Billing</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              International payments are securely processed by our merchant of record, <strong>Paddle</strong>. Paddle handles all compliance, taxes, and international billing rules. 
            </p>
            <ul className="list-disc pl-5 text-slate-400 font-medium space-y-2">
              <li><strong className="text-slate-300">Subscriptions:</strong> Subscriptions grant a specific number of tokens over a set duration.</li>
              <li><strong className="text-slate-300">Manual Payments:</strong> For specific regions, we accept manual verified transfers (e.g., bKash, Nagad). These are bound by the same usage terms.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><AlertTriangle className="text-indigo-500" /> Prohibited Conduct</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              To ensure a safe environment, the following actions are strictly prohibited:
            </p>
            <ul className="list-disc pl-5 text-slate-400 font-medium space-y-2">
              <li>Attempting to bypass our token limits or exploit API vulnerabilities.</li>
              <li>Sharing your account credentials or providing unauthorized access to premium features.</li>
              <li>Using our AI models to generate harmful, illegal, or unethical content.</li>
            </ul>
            <p className="text-slate-400 font-medium leading-relaxed mt-4">
              Violating these terms may result in immediate account termination without a refund.
            </p>
          </section>

          <section className="space-y-4 pt-8 border-t border-slate-800">
            <h2 className="text-xl font-black text-white mb-2">Contact Legal Team</h2>
            <p className="text-slate-400 font-medium">
              If you have any questions regarding these Terms, please contact us at <a href="mailto:legal@prepia.app" className="text-indigo-500 font-bold hover:underline">legal@prepia.app</a>.
            </p>
            <p className="text-sm text-slate-500 font-bold mt-8">Last Updated: July 2026</p>
          </section>

        </div>
      </div>
    </div>
  );
}
