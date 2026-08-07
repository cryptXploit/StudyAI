'use client';

import { useEffect, useState } from 'react';

export default function FetchInterceptor() {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, config] = args;
      
      // Skip interceptor for GET requests or any request without a POST method
      const isPost = config?.method && config.method.toUpperCase() === 'POST';
      
      let isBackground = false;
      if (config?.headers) {
        if (config.headers instanceof Headers) {
          isBackground = config.headers.get('X-Background-Request') === 'true';
        } else if (typeof config.headers === 'object') {
          isBackground = (config.headers as Record<string, string>)['X-Background-Request'] === 'true';
        }
      }
      
      const response = await originalFetch(...args);
      
      if (!isPost || isBackground) return response;
      
      // Clone response to read body without consuming the original
      const clonedResponse = response.clone();
      
      if (response.status === 403) {
        try {
          const body = await clonedResponse.json();
          if (body.error === 'PRO_FEATURE_CONSENT_REQUIRED') {
            return new Promise((resolve, reject) => {
              setPendingRequest({
                args,
                resolve,
                reject,
                message: body.message
              });
              setShowDialog(true);
            });
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleConfirm = async () => {
    if (pendingRequest) {
      const [url, config] = pendingRequest.args;
      const headers = new Headers(config?.headers || {});
      headers.append('X-Force-Downgrade', 'true');
      
      try {
        const response = await window.fetch(url, { ...config, headers });
        pendingRequest.resolve(response);
      } catch (error) {
        pendingRequest.reject(error);
      }
    }
    setShowDialog(false);
    setPendingRequest(null);
  };

  const handleCancel = () => {
    if (pendingRequest) {
      // Resolve with a mock 403 response so the app handles it gracefully instead of crashing
      pendingRequest.resolve(new Response(JSON.stringify({ error: 'Action cancelled by user' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    setShowDialog(false);
    setPendingRequest(null);
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-slate-800">Pro Feature Detected</h2>
        </div>
        <p className="text-slate-600 mb-6">
          {pendingRequest?.message || 'This is a Pro feature. Do you want to use the Free model instead? (Note: Pro tokens will still be deducted).'}
        </p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition"
          >
            Yes, Continue with Free Model
          </button>
        </div>
      </div>
    </div>
  );
}
