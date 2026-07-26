'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Database, EyeOff, Server, FileCheck, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 pb-24 selection:bg-emerald-500/30">
      {/* HEADER */}
      <header className="bg-slate-900 pt-16 pb-32 px-6 relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-bold text-sm">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Privacy Policy</h1>
          <p className="text-xl text-slate-400 font-medium">Your data is yours. We encrypt it, protect it, and never sell it.</p>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-20">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/50 p-8 md:p-12 space-y-12">
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-6 bg-slate-950 rounded-2xl flex items-start gap-4 border border-slate-800">
              <ShieldCheck className="text-emerald-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-white mb-1">Bank-Level Encryption</h4>
                <p className="text-sm font-medium text-slate-400">All data in transit and at rest is secured using AES-256 encryption.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-950 rounded-2xl flex items-start gap-4 border border-slate-800">
              <EyeOff className="text-blue-500 shrink-0" size={24} />
              <div>
                <h4 className="font-black text-white mb-1">No AI Training</h4>
                <p className="text-sm font-medium text-slate-400">We do NOT use your private study materials to train our base AI models.</p>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><Database className="text-emerald-500" /> Data We Collect</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              When you use Prepia, we collect minimal data necessary to provide our service. This includes:
            </p>
            <ul className="list-disc pl-5 text-slate-400 font-medium space-y-2">
              <li><strong className="text-slate-300">Account Information:</strong> Name, email address, and authentication tokens (managed securely via Supabase Auth).</li>
              <li><strong className="text-slate-300">Uploaded Documents:</strong> PDFs, images, and text you voluntarily upload for the purpose of generating context packs.</li>
              <li><strong className="text-slate-300">Usage Telemetry:</strong> Anonymized metrics on which features are used to help us improve the platform.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><Server className="text-emerald-500" /> Storage & Deletion</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              We employ strict Row Level Security (RLS) on our databases. This means your files are mathematically impossible to be accessed by another user.
            </p>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mt-4">
              <h4 className="font-black text-white mb-2">Free Tier Retention</h4>
              <p className="text-sm font-medium text-slate-400 mb-4">To manage server costs, files uploaded by Free tier users are automatically and permanently deleted from our servers after 7 days.</p>
              
              <h4 className="font-black text-white mb-2">Pro Tier Retention</h4>
              <p className="text-sm font-medium text-slate-400">Pro users enjoy permanent storage until they manually delete their files or their account.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black flex items-center gap-3 text-white"><Lock className="text-emerald-500" /> Third-Party AI Providers</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              To provide state-of-the-art responses, we route queries through APIs from OpenAI, Anthropic, and Google DeepMind. We have Zero Data Retention agreements with these providers. They do not store your queries, and they do not use your academic data to train their commercial models.
            </p>
          </section>

          <section className="space-y-4 pt-8 border-t border-slate-800">
            <h2 className="text-xl font-black text-white mb-2">Contact Privacy Team</h2>
            <p className="text-slate-400 font-medium">
              If you have any questions regarding your data, or wish to invoke your Right to be Forgotten (complete account erasure), please email us at <a href="mailto:privacy@Prepia.com" className="text-emerald-500 font-bold hover:underline">privacy@Prepia.com</a>.
            </p>
            <p className="text-sm text-slate-500 font-bold mt-8">Last Updated: July 2026</p>
          </section>

        </div>
      </div>
    </div>
  );
}

