import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createWorker } from '../queue/worker';
import { GoogleGenAI } from '@google/genai';
import { connection as redis } from '../queue/connection';

// Ensure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const ai = new GoogleGenAI({}); // Relies on GEMINI_API_KEY

interface FileProcessingJobData {
  fileId: string;
  userId: string;
  storagePath: string;
  fileType: 'pdf' | 'jpeg';
}

export const fileProcessingWorker = createWorker<FileProcessingJobData>(
  'file-processing',
  async (job: Job<FileProcessingJobData>) => {
    const { fileId, userId, storagePath, fileType } = job.data;

    console.log(`[FileProcessingWorker] Starting processing for file: ${fileId}`);

    try {
      // 1. Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message || 'No data'}`);
      }

      // 2. Parse PDF using LangChain PDFLoader
      let docs: any[] = [];
      if (fileType === 'pdf') {
        // PDFLoader accepts a Blob
        const loader = new PDFLoader(fileData, {
          splitPages: false,
        });
        const rawDocs = await loader.load();

        // 3. Split into meaningful chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });

        docs = await textSplitter.splitDocuments(rawDocs);
        console.log(`[FileProcessingWorker] Split PDF into ${docs.length} chunks.`);

        // 4. Generate Embeddings via Gemini
        console.log(`[FileProcessingWorker] Generating embeddings for ${docs.length} chunks...`);
        const chunksToInsert = await Promise.all(docs.map(async (doc, index) => {
          const textContent = doc.pageContent;
          const embedResponse = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: textContent,
          });
          
          // Depending on exact SDK version, the values are inside embeddings[0] or embedding
          const values = embedResponse.embeddings?.[0]?.values || (embedResponse as any).embedding?.values || [];

          return {
            file_id: fileId,
            user_id: userId,
            chunk_index: index,
            text_content: textContent,
            embedding: values,
          };
        }));

        // 5. Bulk insert into Supabase file_chunks table
        // Supabase/PostgREST processes array inserts as a single atomic transaction.
        console.log(`[FileProcessingWorker] Bulk inserting ${chunksToInsert.length} chunks into DB...`);
        const { error: insertError } = await supabase
          .from('file_chunks')
          .insert(chunksToInsert);

        if (insertError) {
          throw new Error(`Failed to insert chunks: ${insertError.message}`);
        }
      } else {
        // Handle JPEG or other types
        console.log(`[FileProcessingWorker] JPEG processing not fully implemented yet.`);
      }

      // 6. Update Supabase files table status to 'indexed'
      const { error: updateError } = await supabase
        .from('files')
        .update({ status: 'indexed' })
        .eq('id', fileId);

      if (updateError) {
        throw new Error(`Failed to update file status: ${updateError.message}`);
      }

      // 7. Emit a document_indexed event using Redis Pub/Sub
      await redis.publish('events:document_indexed', JSON.stringify({ fileId, userId }));

      console.log(`[FileProcessingWorker] Finished processing and indexing file: ${fileId}`);
      return { success: true, chunksCount: docs.length };
    } catch (error) {
      console.error(`[FileProcessingWorker] Error processing file ${fileId}:`, error);
      
      // Optionally update status to 'failed'
      await supabase
        .from('files')
        .update({ status: 'failed' })
        .eq('id', fileId);

      throw error; // Rethrow to let BullMQ handle the failure (retries, dead-letter queue)
    }
  },
  (job: any) => job.data.fileId // Use fileId as idempotency key to prevent reprocessing
);

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await fileProcessingWorker.close();
  process.exit(0);
});

export default fileProcessingWorker;
