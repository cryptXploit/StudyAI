'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

const ISSUE_TYPES = [
  'Bug Report',
  'Payment Issue',
  'Token Problem',
  'Feature Request',
  'Other'
];

export default function FeedbackWidget() {
  const { session } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [issueType, setIssueType] = useState('Bug Report');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // If user is not logged in, don't show the widget
  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter your feedback message.');
      return;
    }

    setIsSubmitting(true);
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const fetchUrl = apiUrlBase.endsWith('/api') 
        ? `${apiUrlBase}/feedback/submit` 
        : `${apiUrlBase}/api/feedback/submit`;

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          issueType,
          message,
          pageContext: pathname
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setIsSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setIsSuccess(false);
          setMessage('');
          setIssueType('Bug Report');
        }, 3000);
      } else {
        toast.error(data.message || 'Failed to submit feedback.');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-24 right-6 z-50 flex items-center justify-center p-3 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen ? 'hidden' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
        }`}
        style={{
          boxShadow: '0 0 20px rgba(79, 70, 229, 0.4)'
        }}
      >
        <MessageSquarePlus className="w-4 h-4" />
        <AnimatePresence>
          {isHovered && (
            <motion.span
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 'auto', opacity: 1, marginLeft: 8 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              className="overflow-hidden whitespace-nowrap font-medium text-sm pr-2"
            >
              Feedback & Help
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Slide-over / Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <h3 className="text-white font-medium flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-indigo-400" />
                Send Feedback
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex-1">
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-lg">Thank you!</h4>
                    <p className="text-gray-400 text-sm mt-1">Your feedback has been sent to our team.</p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Issue Type Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium ml-1">What is this regarding?</label>
                    <div className="relative">
                      <select
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        {ISSUE_TYPES.map(type => (
                          <option key={type} value={type} className="bg-[#0B0F19] text-white">
                            {type}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-medium ml-1">Your Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe the issue or suggestion in detail..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] resize-none"
                    />
                  </div>

                  {/* Context Meta */}
                  <div className="flex items-start gap-2 text-xs text-gray-500 bg-white/5 p-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <p>We automatically capture the page you're on to help us understand the issue better.</p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Feedback
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChevronDownIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
