import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/AuthContext';
import { I18nProvider } from '@/components/providers/I18nContext';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { PublicErrorProvider } from '@/components/providers/PublicErrorProvider';
// @ts-ignore: Allow side-effect CSS import when global CSS types are not declared in this project
import './globals.css';

export const metadata: Metadata = {
  title: 'Prepia - Your AI Study Assistant',
  description: 'Advanced AI-powered study platform with document analysis and smart chat',
  keywords: ['study', 'AI', 'learning', 'education', 'chat'],
  other: {
    // Replace this ID with your actual AdSense Publisher ID
    'google-adsense-account': 'ca-pub-YOUR_ADSENSE_ID'
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
            {children}
            <ToastProvider />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

