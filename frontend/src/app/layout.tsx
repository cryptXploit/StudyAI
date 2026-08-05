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
    default: 'Prepia AI – #1 AI Study Operating System for Students',
    template: '%s | Prepia AI'
  },
  description: 'Transform textbooks & PDFs into flashcards, 3D organic molecules, AI podcasts & exam cheat sheets in seconds. Accurate RAG-powered study tool for students.',
  keywords: [
    'Prepia AI',
    'AI study assistant',
    'PDF to podcast AI',
    'night before exam cheat sheet',
    'RAG AI textbook summarizer',
    '3D molecule study tool',
    'AI flashcard generator'
  ],
  authors: [{ name: 'Prepia Team' }],
  creator: 'Prepia',
  publisher: 'Prepia',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://prepia.app',
    siteName: 'Prepia AI',
    title: 'Prepia AI – #1 AI Study Operating System for Students',
    description: 'Transform textbooks & PDFs into flashcards, 3D organic molecules, AI podcasts & exam cheat sheets in seconds. Accurate RAG-powered study tool for students.',
    images: [
      {
        url: 'https://prepia.app/assets/og-cover.png',
        width: 1200,
        height: 630,
        alt: 'Prepia AI - Study Operating System'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prepia AI – #1 AI Study Operating System for Students',
    description: 'Transform textbooks & PDFs into flashcards, 3D organic molecules, AI podcasts & exam cheat sheets in seconds.',
    images: ['https://prepia.app/assets/og-cover.png'],
    creator: '@PrepiaAI'
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Prepia AI',
  operatingSystem: 'Web, Android, iOS',
  applicationCategory: 'EducationalApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '1250',
  },
  description: 'RAG-powered AI Academic Learning Platform with 28 micro-apps, 3D lab visualizer, PDF-to-podcast generator, and Night Before Exam cheat sheets.',
  sameAs: [
    'https://twitter.com/PrepiaAI',
    'https://www.linkedin.com/company/prepia-ai',
    'https://github.com/prepia-ai',
    'https://www.producthunt.com/products/prepia-ai'
  ]
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
        {/* Structured Data (JSON-LD) for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

