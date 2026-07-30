'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactUsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      toast.error('Please fill out all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') 
        ? `${apiUrlBase}/marketing/enquire` 
        : `${apiUrlBase}/api/marketing/enquire`;

      const finalQuery = name.trim() ? `Name: ${name}\n\nMessage: ${message}` : message;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, query: finalQuery })
      });

      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Message sent successfully! We will get back to you soon.');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        toast.error(data.message || 'Failed to submit enquiry.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 pb-24 selection:bg-emerald-500/30">
      {/* HEADER */}
      <header className="bg-slate-900 pt-16 pb-32 px-6 relative overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 blur-3xl rounded-full"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-bold text-sm">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Contact Us</h1>
          <p className="text-xl text-slate-400 font-medium">We&apos;re here to help. Reach out to us for any questions or support.</p>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-20">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/50 p-8 md:p-12">
          
          <div className="grid md:grid-cols-5 gap-12">
            
            {/* Contact Info */}
            <div className="md:col-span-2 space-y-8">
              <div>
                <h3 className="text-2xl font-black text-white mb-4">Get in touch</h3>
                <p className="text-slate-400 font-medium leading-relaxed mb-6">
                  Whether you have a question about features, pricing, need a demo, or anything else, our team is ready to answer all your questions.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center rounded-xl shrink-0">
                    <Mail className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Email Support</p>
                    <a href="mailto:support@prepia.app" className="text-white font-bold hover:text-emerald-400 transition-colors">support@prepia.app</a>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center rounded-xl shrink-0">
                    <MessageSquare className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Community</p>
                    <p className="text-white font-bold">Join our Discord</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-3">
              <form className="space-y-6 bg-slate-950 p-6 md:p-8 rounded-2xl border border-slate-800" onSubmit={handleSubmit}>
                
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-bold text-slate-400">Your Name (Optional)</label>
                  <input 
                    type="text" 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-bold text-slate-400">Email Address</label>
                  <input 
                    type="email" 
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-bold text-slate-400">Message</label>
                  <textarea 
                    id="message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Send Message
                </button>

              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

