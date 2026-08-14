import { createClient } from '@supabase/supabase-js';
import { modelRouter } from './modelRouter'; 

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface RetrievalChunk {
  id: string;
  file_id: string;
  chunk_index: number;
  content: string;
  similarity_score: number;
  search_type: 'vector' | 'keyword' | 'hybrid';
}

export interface RetrievalOptions {
  userId: string;
  fileId: string;
  query: string;
  limit?: number;
  vectorWeight?: number;  
  keywordWeight?: number; 
}

export class RetrievalService {
  
  private static async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!query || query.trim() === '') return new Array(1536).fill(0);
    try {
      const response = await modelRouter.embed(query);
      return response;
    } catch (error) {
      console.error("[RetrievalService] Dynamic Embedding Failed:", error);
      return new Array(1536).fill(0); 
    }
  }

  static async hybridSearch(options: RetrievalOptions): Promise<RetrievalChunk[]> {
    // 🟢 OPTIMIZATION: Hard limit set to 3 to prevent API Cost Explosion & Context overflow
    const { userId, fileId, query, limit = 3, vectorWeight = 0.5, keywordWeight = 0.5 } = options;
    const finalLimit = Math.min(limit, 5); // Never allow more than 5 chunks

    console.log(`[RetrievalService] Starting hybrid search for file: ${fileId}`);

    const queryEmbedding = await this.generateQueryEmbedding(query);

    const { data: results, error } = await supabase.rpc('hybrid_search_chunks', {
      p_user_id: userId,
      p_file_id: fileId,
      p_query: query,
      p_query_embedding: queryEmbedding,
      p_vector_weight: vectorWeight,
      p_keyword_weight: keywordWeight,
      p_limit: finalLimit,
    });

    if (error) {
      console.error('[RetrievalService] Hybrid RPC Error:', error);
      return []; 
    }

    return (results || []) as RetrievalChunk[];
  }

  static async vectorSearch(options: Omit<RetrievalOptions, 'limit'> & { limit?: number }): Promise<RetrievalChunk[]> {
    return [];
  }

  static async keywordSearch(options: Omit<RetrievalOptions, 'limit'> & { limit?: number }): Promise<RetrievalChunk[]> {
    return [];
  }

  static buildContextFromChunks(chunks: RetrievalChunk[]): string {
    if (chunks.length === 0) {
      return 'No relevant context found in the provided document.';
    }

    // 🟢 OPTIMIZATION: Trim individual chunk size to prevent API token limits
    const contextLines = chunks.map((chunk, index) => {
      const safeText = chunk.content.substring(0, 1500);
      return `[Context ${index + 1}]:\n${safeText}`;
    });

    return contextLines.join('\n\n---\n\n');
  }
}
