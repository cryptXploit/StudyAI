'use client';

import React, { useRef, useState } from 'react';
import { useI18n } from '@/components/providers/I18nContext';

interface FileUploadDragDropProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
  uiTheme?: 'dark' | 'light';
}

export default function FileUploadDragDrop({
  onUpload,
  disabled = false,
  uiTheme = 'light'
}: FileUploadDragDropProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file) {
      await processFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const file = files[0];

    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError(null);

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError(t('upload.error.type'));
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(t('upload.error.size'));
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
          isDragging
            ? (uiTheme === 'dark' ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50')
            : (uiTheme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50')
        } ${isUploading || disabled ? 'opacity-50 cursor-not-allowed' : (uiTheme === 'dark' ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80' : 'cursor-pointer hover:border-indigo-400')}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg"
          onChange={handleFileInput}
          disabled={isUploading || disabled}
          className="hidden"
        />

        <div
          onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
          className="space-y-3"
        >
          {isUploading ? (
            <>
              <div className="flex justify-center">
                <div className="animate-spin">
                  <svg
                    className="h-12 w-12 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-semibold text-indigo-600">
                {t('upload.indexing')}
              </p>
              <p className="text-sm text-gray-600">
                {t('upload.preparing')}
              </p>
            </>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v24a4 4 0 004 4h24a4 4 0 004-4V20"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M32 4v12h12"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className={`text-lg font-black mt-4 ${uiTheme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
                {t('upload.drop')}
              </p>
              <p className={`text-sm font-bold mt-1 ${uiTheme === 'dark' ? 'text-slate-500' : 'text-gray-600'}`}>
                {t('upload.click')}
              </p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${uiTheme === 'dark' ? 'text-slate-600' : 'text-gray-500'}`}>
              {t('upload.maxSize')}
            </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
