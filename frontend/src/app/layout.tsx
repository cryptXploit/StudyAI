import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/AuthContext';
import { I18nProvider } from '@/components/providers/I18nContext';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { PublicErrorProvider } from '@/components/providers/PublicErrorProvider';
import FetchInterceptor from '@/components/FetchInterceptor';
// @ts-ignore: Allow side-effect CSS import when global CSS types are not declared in this project
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://prepia.app'),
  title: {
    default: 'Prepia - AI Learning Platform & PDF Study Assistant',
    template: '%s | Prepia'
  },
  description: 'Prepia is the ultimate Bengali & English AI learning platform for students. Upload documents, chat with PDFs via RAG, generate flashcards, mind maps, quizzes, and study routines instantly.',
  keywords: [
    'AI study assistant',
    'PDF AI chat',
    'Bengali AI learning',
    'AI flashcards maker',
    'AI mind map generator',
    'study routines AI',
    'concept battles',
    'RAG learning platform',
    'Prepia',
    'student exam prep'
  ],
  authors: [{ name: 'Prepia Team' }],
  creator: 'Prepia',
  publisher: 'Prepia',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://prepia.app',
    siteName: 'Prepia',
    title: 'Prepia - AI Learning Platform for Students',
    description: 'Upload documents, chat with AI, generate quizzes, flashcards, and mind maps instantly. The ultimate study tool for Bengali & English students.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Prepia - AI Learning Platform'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prepia - AI Learning Platform',
    description: 'The ultimate AI study assistant. Chat with your PDFs, generate mind maps, and ace your exams!',
    images: ['/og-image.jpg'],
    creator: '@PrepiaApp'
  },
  alternates: {
    canonical: 'https://prepia.app'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'google-adsense-account': 'ca-pub-7232534846173963'
  }
};

import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense Script - Replaced 'ca-pub-YOUR_ADSENSE_ID' with my actual ID */}
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7232534846173963" 
          crossOrigin="anonymous" 
          strategy="afterInteractive"
        />
      </head>
      <body>
        <AuthProvider>
          <I18nProvider>
            <PublicErrorProvider />
            <FetchInterceptor />
            {children}
            <ToastProvider />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

