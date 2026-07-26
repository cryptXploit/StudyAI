'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthContext';
import { useI18n } from '@/components/providers/I18nContext';
// 🟢 FIX: Imported the correct Supabase fetch service
import { fetchUserFiles } from '@/services/dashboard.service';

export interface FileOption {
  id: string;
  name: string;
  status: 'uploading' | 'chunking_complete' | 'indexed' | 'error' | string;
}

interface FileSelectorProps {
  selectedFileId?: string;
  onFileSelect: (fileId: string, fileName: string) => void;
  disabled?: boolean;
}

export default function FileSelector({
  selectedFileId,
  onFileSelect,
  disabled = false,
}: FileSelectorProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [files, setFiles] = useState<FileOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadFiles = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 🟢 FIX: Fetch files directly from Supabase via our service instead of a broken API endpoint
        const fetchedFiles = await fetchUserFiles(user.id);
        
        if (!fetchedFiles) {
          throw new Error('Failed to fetch files');
        }

        setFiles(fetchedFiles as FileOption[]);

        // Auto-select first indexed file
        const indexedFile = fetchedFiles?.find(
          (f) => f.status === 'indexed'
        );
        if (indexedFile && !selectedFileId) {
          onFileSelect(indexedFile.id, indexedFile.name);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('common.error')
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [user, onFileSelect, selectedFileId, t]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'indexed':
        return t('chat.readyToChat', '✓ Ready');
      case 'chunking_complete':
        return '⏳ Processing';
      case 'uploading':
        return '📤 Uploading';
      case 'error':
        return '✗ Error';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <label className="text-sm font-semibold text-gray-700 mb-3 block">
        {t('chat.selectDocument', 'Select Document')}
      </label>

      {isLoading ? (
        <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          {t('chat.noDocuments', 'No documents uploaded. Upload a file on the Dashboard to get started.')}
        </div>
      ) : (
        <select
          value={selectedFileId || ''}
          onChange={(e) => {
            const fileId = e.target.value;
            const file = files.find((f) => f.id === fileId);
            if (file) {
              onFileSelect(fileId, file.name);
            }
          }}
          disabled={disabled || files.length === 0}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Choose a document...</option>
          {files.map((file) => (
            <option key={file.id} value={file.id} disabled={file.status !== 'indexed'}>
              {file.name} • {getStatusLabel(file.status)}
            </option>
          ))}
        </select>
      )}

      {selectedFileId && files.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {files.find((f) => f.id === selectedFileId)?.status === 'indexed' ? (
            <p className="text-green-600">{t('chat.readyToChat', '✓ Ready to chat')}</p>
          ) : (
            <p className="text-yellow-600">
              {t('chat.stillProcessing', '⏳ Still processing. Please wait.')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
