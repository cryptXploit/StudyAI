'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 pb-24 selection:bg-pink-500/30">
      {/* HEADER */}
      <header className="bg-slate-900 pt-16 pb-32 px-6 relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 blur-3xl rounded-full"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-bold text-sm">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Refund Policy</h1>
          <p className="text-xl text-slate-400 font-medium">Clear, transparent, and fair policies for digital purchases.</p>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-20">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/50 p-8 md:p-12 space-y-12">
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-6 bg-slate-950 rounded-2xl flex items-start gap-4 border border-slate-800">
              <RefreshCw className="text-pink-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-white mb-1">Digital Goods</h4>
                <p className="text-sm font-medium text-slate-400">Tokens and subscriptions are non-refundable once utilized.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-950 rounded-2xl flex items-start gap-4 border border-slate-800">
              <HelpCircle className="text-blue-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-white mb-1">Support First</h4>
                <p className="text-sm font-medium text-slate-400">If you experience technical issues, contact our support team immediately.</p>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><AlertCircle className="text-pink-500" /> Standard Refund Rule</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              Prepia provides digital SaaS products (AI compute tokens and premium features) which are delivered instantly upon purchase. Because these resources incur immediate compute costs on our end, <strong>we generally do not offer refunds</strong> for processed payments.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><AlertCircle className="text-pink-500" /> Exceptions</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              We understand that mistakes happen. We may issue a refund at our sole discretion under the following conditions:
            </p>
            <ul className="list-disc pl-5 text-slate-400 font-medium space-y-2">
              <li><strong className="text-slate-300">Duplicate Billing:</strong> You were charged multiple times for a single transaction.</li>
              <li><strong className="text-slate-300">Service Unavailability:</strong> You purchased a plan but were completely unable to access the service due to a verified fault on our servers, and you reported it within 7 days.</li>
              <li><strong className="text-slate-300">Zero Usage:</strong> You purchased a plan, used absolutely 0 tokens, and requested a refund within 48 hours of purchase.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><AlertCircle className="text-pink-500" /> Paddle Dispute & Resolutions</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              For international payments, our merchant of record is Paddle. If you file a dispute or chargeback without contacting our support team first, we reserve the right to permanently terminate your account and blacklist your email address. 
            </p>
          </section>

          <section className="space-y-4 pt-8 border-t border-slate-800">
            <h2 className="text-xl font-black text-white mb-2">Request a Refund</h2>
            <p className="text-slate-400 font-medium">
              To request a refund under our exception rules, please email <a href="mailto:support@prepia.app" className="text-pink-500 font-bold hover:underline">support@prepia.app</a> with your account email and transaction receipt.
            </p>
            <p className="text-sm text-slate-500 font-bold mt-8">Last Updated: July 2026</p>
          </section>

        </div>
      </div>
    </div>
  );
}
