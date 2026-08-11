'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'bn' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    bn: string;
    hi?: string;
  };
}

const translations: Translations = {
  // --- Original Keys ---
  'app.title': { en: 'Prepia', bn: 'স্টাডিএআই' },
  'nav.dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  'nav.chat': { en: 'Chat', bn: 'চ্যাট' },
  'nav.documents': { en: 'Documents', bn: 'ডকুমেন্ট' },
  'nav.settings': { en: 'Settings', bn: 'সেটিংস' },
  'nav.logout': { en: 'Logout', bn: 'লগ আউট' },
  'auth.login': { en: 'Login', bn: 'লগইন করুন' },
  'auth.signup': { en: 'Sign Up', bn: 'সাইন আপ' },
  'auth.email': { en: 'Email', bn: 'ইমেইল' },
  'auth.password': { en: 'Password', bn: 'পাসওয়ার্ড' },
  'auth.forgotPassword': { en: 'Forgot Password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
  'auth.signInWithGoogle': { en: 'Sign in with Google', bn: 'গুগল দিয়ে সাইন ইন করুন' },
  'dashboard.welcome': { en: 'Welcome to your Dashboard', bn: 'আপনার ড্যাশবোর্ডে স্বাগতম' },
  'dashboard.recentFiles': { en: 'Recent Files', bn: 'সাম্প্রতিক ফাইল' },
  'dashboard.studyStats': { en: 'Study Statistics', bn: 'অধ্যয়ন পরিসংখ্যান' },
  'chat.title': { en: 'Study Assistant', bn: 'পড়াশোনার সহায়ক' },
  'chat.placeholder': { en: 'Ask me anything about your study materials...', bn: 'আপনার পড়ার বিষয়ে আমাকে কিছু জিজ্ঞাসা করুন...' },
  'chat.send': { en: 'Send', bn: 'পাঠান' },
  'chat.selectMode': { en: 'Response Mode', bn: 'প্রতিক্রিয়া মোড' },
  'chat.selectDocument': { en: 'Select Document', bn: 'ডকুমেন্ট নির্বাচন করুন' },
  'chat.mode.default': { en: 'Default', bn: 'ডিফল্ট' },
  'chat.mode.default.desc': { en: 'Regular Q&A', bn: 'নিয়মিত প্রশ্নোত্তর' },
  'chat.mode.summary': { en: 'Summary', bn: 'সারসংক্ষেপ' },
  'chat.mode.summary.desc': { en: 'Concise overview', bn: 'সংক্ষিপ্ত সারবিষয়' },
  'chat.mode.quiz': { en: 'Quiz', bn: 'কুইজ' },
  'chat.mode.quiz.desc': { en: 'Test your knowledge', bn: 'আপনার জ্ঞান পরীক্ষা করুন' },
  'chat.mode.deep': { en: 'Deep Dive', bn: 'গভীর বিশ্লেষণ' },
  'chat.mode.deep.desc': { en: 'Detailed explanation', bn: 'বিস্তারিত ব্যাখ্যা' },
  'chat.noDocuments': { en: 'No documents uploaded. Upload a file on the Dashboard to get started.', bn: 'কোন ডকুমেন্ট আপলোড করা হয়নি। শুরু করতে ড্যাশবোর্ডে একটি ফাইল আপলোড করুন।' },
  'chat.selectFirst': { en: 'Select a document above to start chatting', bn: 'চ্যাট শুরু করতে উপরে একটি ডকুমেন্ট নির্বাচন করুন' },
  'chat.readyToChat': { en: '✓ Ready to chat', bn: '✓ চ্যাটের জন্য প্রস্তুত' },
  'chat.stillProcessing': { en: '⏳ Still processing. Please wait.', bn: '⏳ এখনও প্রসেস করা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।' },
  'chat.cancel': { en: 'Cancel', bn: 'বাতিল করুন' },
  'chat.cacheHit': { en: 'Cached response (instant)', bn: 'ক্যাশ করা উত্তর (তাৎক্ষণিক)' },
  'error.unauthorized': { en: 'You are not authorized to access this page', bn: 'আপনি এই পৃষ্ঠা অ্যাক্সেস করার অনুমতি পান না' },
  'error.notFound': { en: 'Page not found', bn: 'পৃষ্ঠা পাওয়া যায়নি' },
  'common.loading': { en: 'Loading...', bn: 'লোড হচ্ছে...' },
  'common.error': { en: 'An error occurred', bn: 'একটি ত্রুটি ঘটেছে' },

  // --- Added Keys for Dashboard & Upload ---
  'dashboard.welcomeSubtitle': { en: 'Welcome to Prepia', bn: 'স্টাডিএআই-তে স্বাগতম' },
  'dashboard.stats.totalDocs': { en: 'Total Documents', bn: 'মোট ডকুমেন্ট' },
  'dashboard.stats.indexed': { en: 'indexed and ready', bn: 'ইনডেক্সড এবং প্রস্তুত' },
  'dashboard.stats.storage': { en: 'Storage Used', bn: 'ব্যবহৃত স্টোরেজ' },
  'dashboard.stats.available': { en: '10 GB total available', bn: 'মোট 10 GB উপলব্ধ' },
  'dashboard.stats.materials': { en: 'Study Materials', bn: 'স্টাডি ম্যাটেরিয়াল' },
  'dashboard.stats.learning': { en: 'Available for learning', bn: 'শেখার জন্য উপলব্ধ' },
  'dashboard.upload.title': { en: 'Upload Your Study Materials', bn: 'আপনার স্টাডি ম্যাটেরিয়াল আপলোড করুন' },
  'dashboard.upload.desc': { en: 'Upload PDF documents or JPEG images to extract knowledge, generate summaries, and create study materials.', bn: 'জ্ঞান বের করতে, সারসংক্ষেপ তৈরি করতে এবং অধ্যয়নের উপকরণ তৈরি করতে PDF বা JPEG ছবি আপলোড করুন।' },
  'dashboard.packs.title': { en: 'Study Materials & Summaries', bn: 'অধ্যয়নের উপকরণ এবং সারসংক্ষেপ' },
  'dashboard.packs.desc': { en: 'AI-generated summaries, flashcards, and quizzes for your documents.', bn: 'আপনার ডকুমেন্টের জন্য AI-জেনারেটেড সারসংক্ষেপ, ফ্ল্যাশকার্ড এবং কুইজ।' },
  'upload.drop': { en: 'Drag and drop your files here', bn: 'আপনার ফাইলগুলো এখানে টেনে আনুন' },
  'upload.click': { en: 'or click to select PDF or JPEG files', bn: 'অথবা PDF বা JPEG ফাইল নির্বাচন করতে ক্লিক করুন' },
  'upload.maxSize': { en: 'Maximum file size: 10MB', bn: 'সর্বোচ্চ ফাইলের আকার: 10MB' },
  'upload.indexing': { en: 'Indexing...', bn: 'ইনডেক্স করা হচ্ছে...' },
  'upload.preparing': { en: 'Preparing your document for AI learning', bn: 'AI শেখার জন্য আপনার ডকুমেন্ট প্রস্তুত করা হচ্ছে' },
  'upload.error.type': { en: 'Only PDF and JPEG files are allowed', bn: 'শুধুমাত্র PDF এবং JPEG ফাইল অনুমোদিত' },
  'upload.error.size': { en: 'File size must be less than 10MB', bn: 'ফাইলের আকার 10MB এর কম হতে হবে' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string, fallback?: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return fallback ?? key;
    }
    return translation[language] || translation['en'] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
