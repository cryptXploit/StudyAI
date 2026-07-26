import { createClient } from '@/lib/supabase/client';

// 🟢 FIXED: Properly closed the function bracket
export const fetchDashboardData = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user; // Return the user or whatever you need here
};

export interface File {
  id: string;
  name: string;
  status: 'uploading' | 'chunking_complete' | 'indexed' | 'error';
  created_at: string;
  file_type: string;
  file_size: number;
  user_id: string;
}

export interface ContextPack {
  id: string;
  file_id: string;
  summary: {
    short: string;
    detailed: string;
  };
  key_concepts: Array<{
    concept: string;
    definition: string;
    importance_score: number;
  }>;
  flashcards: Array<{
    question: string;
    answer: string;
    difficulty: string;
  }>;
  quizzes: {
    mcq: Array<any>;
    short_questions: Array<any>;
  };
  generated_at: string;
}

/**
 * Upload file to backend API
 * Returns optimistically with file_id
 */
export async function uploadFile(
  file: globalThis.File,
  sessionToken: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  const data = await response.json();
  return data.file_id;
}

/**
 * Fetch user's uploaded files from Supabase
 */
export async function fetchUserFiles(userId: string): Promise<File[]> {
  const supabase = createClient(); // 🟢 ADDED HERE
  
  const { data, error } = await supabase
    .from('files')
    .select('id, name, status, created_at, file_type, file_size, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching files:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch context packs for a file
 */
export async function fetchContextPackForFile(
  fileId: string
): Promise<ContextPack | null> {
  const supabase = createClient(); // 🟢 ADDED HERE

  const { data, error } = await supabase
    .from('context_packs')
    .select('*')
    .eq('file_id', fileId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows found", which is expected if not indexed yet
    console.error('Error fetching context pack:', error);
  }

  return data || null;
}

/**
 * Fetch all context packs for user
 */
export async function fetchUserContextPacks(userId: string): Promise<ContextPack[]> {
  const supabase = createClient(); // 🟢 ADDED HERE

  const { data, error } = await supabase
    .from('context_packs')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching context packs:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete file from Supabase
 */
export async function deleteFile(fileId: string): Promise<void> {
  const supabase = createClient(); // 🟢 ADDED HERE

  const { error: fileError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (fileError) {
    throw new Error(fileError.message);
  }

  // Also delete associated context pack
  await supabase.from('context_packs').delete().eq('file_id', fileId);

  // Also delete file chunks
  await supabase.from('file_chunks').delete().eq('file_id', fileId);
}

/**
 * Get file statistics for dashboard
 */
export async function getFileStats(userId: string): Promise<{
  totalFiles: number;
  indexedFiles: number;
  totalSize: number;
}> {
  const supabase = createClient(); // 🟢 ADDED HERE

  const { data, error } = await supabase
    .from('files')
    .select('file_size, status')
    .eq('user_id', userId);

  if (error || !data) {
    return { totalFiles: 0, indexedFiles: 0, totalSize: 0 };
  }

  return {
    totalFiles: data.length,
    indexedFiles: data.filter((f) => f.status === 'indexed').length,
    totalSize: data.reduce((sum, f) => sum + (f.file_size || 0), 0),
  };
}

/**
 * Watch for file status updates in real-time
 */
export function watchFileStatus(
  fileId: string,
  onStatusChange: (status: string) => void
) {
  const supabase = createClient(); // 🟢 ADDED HERE

  const subscription = supabase
    .channel(`file-status-${fileId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'files', filter: `id=eq.${fileId}` },
      (payload) => {
        if (payload.new && 'status' in payload.new) {
          onStatusChange(payload.new.status);
        }
      }
    )
    .subscribe();

  return subscription;
}
