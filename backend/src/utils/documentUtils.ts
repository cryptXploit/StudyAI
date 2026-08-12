import { createClient } from '@supabase/supabase-js';
import { ModelRouter } from '../ai/ModelRouter';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface PageChunk {
  content: string;
  page_number: number;
}

export async function chunkText(pages: PageChunk[]): Promise<PageChunk[]> {
  // Since we are now page-aware, we chunk text within each page boundary
  // so we never create a chunk that spans across two pages.
  const chunks: PageChunk[] = [];
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  for (const page of pages) {
    if (!page.content || page.content.trim().length === 0) continue;
    
    // Split the content of this specific page
    const splitContents = await splitter.splitText(page.content);
    
    // Assign the same page number to all chunks from this page
    for (const piece of splitContents) {
       chunks.push({
           content: piece,
           page_number: page.page_number
       });
    }
  }

  return chunks;
}

export async function processAndStoreEmbeddings(chunks: PageChunk[], fileId: string, userId: string): Promise<void> {
  const router = new ModelRouter();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      // 🟢 FIX: Strip null bytes (\u0000) from content — PostgreSQL (22P05) cannot store them
      const safeContent = chunk.content.replace(/\u0000/g, '');

      if (!safeContent.trim()) {
        console.warn(`[documentUtils] Chunk ${i} is empty after null-byte stripping, skipping.`);
        continue;
      }

      // 1. Generate Embedding for the chunk
      const embedding = await router.embed(safeContent);

      // 2. Insert into PostgreSQL with metadata
      const { error } = await supabaseAdmin.from('file_chunks').insert({
        file_id: fileId,
        user_id: userId,
        content: safeContent,
        embedding: embedding,
        chunk_index: i,
        page_number: chunk.page_number,
        metadata: {
            source_type: 'text',
            processing_version: 'v2'
        }
      });

      if (error) {
        console.error(`[documentUtils] DB insert failed for chunk ${i}, file ${fileId}:`, error.code, error.message);
        throw new Error(`Failed to save chunks: ${error.message}`);
      }
    } catch (e) {
      console.error(`[documentUtils] Failed to embed/insert chunk ${i} for file ${fileId}:`, e);
      throw e;
    }
  }
}
