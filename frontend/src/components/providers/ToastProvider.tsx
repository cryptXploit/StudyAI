'use client';
import { Toaster } from 'react-hot-toast';

export const ToastProvider = () => {
  return (
    <Toaster 
      position="top-center" 
      toastOptions={{
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          borderRadius: '12px',
          fontWeight: 'bold',
          border: '1px solid #334155'
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fef2f2',
          },
        },
      }} 
    />
  );
};
