import * as dotenv from 'dotenv';
dotenv.config();
import { Worker, Job } from 'bullmq';
import { connection } from './connection';
import { IdempotencyManager } from './idempotency';
import logger from '../core/logger';
import { runWithTraceId } from '../core/tracing';
import { createClient } from '@supabase/supabase-js';
import { modelRouter } from '../services/modelRouter';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

// 🟢 FIX: Enterprise-grade LangChain PDF Extraction
async function extractContent(buffer: Buffer, mimetype: string, path: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    try {
      const blob = new Blob([buffer as any], { type: 'application/pdf' });
      const loader = new PDFLoader(blob, { splitPages: false });
      const docs = await loader.load();
      const extractedText = docs.map(doc => doc.pageContent).join('\n\n');

      // 🟢 HYBRID ARCHITECTURE: If text is < 50 chars, assume it's a scanned/image PDF
      // and redirect to Gemini Flash for Multimodal OCR and equation extraction.
      return extractedText.trim().length < 50 ? await modelRouter.extractDocument(buffer) : extractedText;
    } catch (error: any) {
      logger.error('LangChain PDF extraction error', { error: error.message });
      throw new Error(`PDF parse failed: ${error.message}`);
    }
  } else if (mimetype.startsWith('image/')) {
    return await performVisionAnalysis(buffer);
  }
  return "";
}

async function getStreamAsBuffer(stream: any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadFromSupabase(storagePath: string) {
  const { data, error } = await supabase.storage.from('documents').download(storagePath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function downloadFromR2(storagePath: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || '',
    Key: storagePath,
  });
  const r2Response = await s3Client.send(command);
  return await getStreamAsBuffer(r2Response.Body);
}

async function performVisionAnalysis(buffer: Buffer): Promise<string> {
  return await modelRouter.extractDocument(buffer);
}

function splitTextIntoChunks(text: string, size: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.substring(i, i + size));
  }
  return chunks;
}

async function generateEmbedding(text: string, outputDimensions = 1536): Promise<number[]> {
  try {
    const response = await modelRouter.embed(text, outputDimensions);
    if (!response || !response.vector) {
      throw new Error('Embedding response is undefined or missing vector');
    }
    if (response.vector.length !== outputDimensions) {
      throw new Error(`Embedding dimension mismatch: expected ${outputDimensions}, received ${response.vector.length}`);
    }
    return response.vector;
  } catch (err) {
    logger.error('embedding.failed', { error: err });
    throw err;
  }
}

async function processDocument(job: Job) {
  let { fileId, userId, storagePath, mimetype, storageProvider } = job.data;

  // DB lookup if storageProvider is missing (Legacy/Race Condition Safety)
  if (!storageProvider) {
    const { data: fileData } = await supabase.from('files').select('storage_provider, r2_key').eq('id', fileId).single();
    if (fileData) {
      storageProvider = fileData.storage_provider;
      if (storageProvider === 'r2' && fileData.r2_key) {
        storagePath = fileData.r2_key;
      }
    } else {
      storageProvider = 'supabase';
    }
  }

  const safeMimetype = mimetype || (storagePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  logger.info('worker.document.started', { fileId, safeMimetype, storageProvider });

  let fileBuffer: Buffer;
  if (storageProvider === 'r2') {
    fileBuffer = await downloadFromR2(storagePath);
  } else {
    fileBuffer = await downloadFromSupabase(storagePath);
  }
  const text = await extractContent(fileBuffer, safeMimetype, storagePath);
  const chunks = splitTextIntoChunks(text, 1000);

  const fileName = storagePath.split('/').pop() || 'Untitled Document';
  await supabase.from('context_packs').insert({
    file_id: fileId,
    user_id: userId,
    name: `${fileName} - Summary`,
    description: text.substring(0, 500) + '... (Auto-generated context)',
  });

  // 🟢 MAGICAL FIX: Bulk Insert Preparation (Saves Database from Crashing)
  const chunksToInsert = [];
  let index = 0;

  for (const chunk of chunks) {
    const vector = await generateEmbedding(chunk, 1536);
    chunksToInsert.push({
      file_id: fileId,
      user_id: userId,
      content: chunk,
      embedding: vector,
      chunk_index: index 
    });
    index++;
  }

  // 🟢 EXECUTE BULK INSERT: 500 Database call convert into 1 Single Call!
  if (chunksToInsert.length > 0) {
    const { error: insertError } = await supabase.from('file_chunks').insert(chunksToInsert);
    if (insertError) {
      logger.error('Database Bulk Insert Error:', insertError);
      throw new Error(`Failed to save chunks: ${insertError.message}`);
    }
  }

  const { error: updateError } = await supabase
    .from('files')
    .update({ status: 'indexed' })
    .eq('id', fileId);

  if (updateError) {
    logger.error('Failed to update file status:', updateError);
  }
}

async function processNote(job: Job) {
  const { noteId, userId } = job.data;
  logger.info('worker.note.started', { noteId });

  // 1. Fetch note content
  const { data: note, error: noteError } = await supabase
    .from('user_notes')
    .select('content_md, title')
    .eq('id', noteId)
    .single();

  if (noteError || !note) {
    throw new Error(`Note not found or error: ${noteError?.message}`);
  }

  // 2. Clear old embeddings for this note (if auto-saving updates)
  await supabase.from('user_notes_embeddings').delete().eq('note_id', noteId);

  // 3. Generate new chunks and embeddings
  const chunks = splitTextIntoChunks(`Note Title: ${note.title}\n\n${note.content_md}`, 1000);
  const chunksToInsert = [];

  for (const chunk of chunks) {
    if (chunk.trim().length < 10) continue;
    const vector = await generateEmbedding(chunk, 768);
    chunksToInsert.push({
      note_id: noteId,
      user_id: userId,
      content: chunk,
      embedding: vector
    });
  }

  // 4. Bulk insert
  if (chunksToInsert.length > 0) {
    const { error: insertError } = await supabase.from('user_notes_embeddings').insert(chunksToInsert);
    if (insertError) {
      logger.error('Note Database Bulk Insert Error:', insertError);
      throw new Error(`Failed to save note chunks: ${insertError.message}`);
    }
  }
  
  logger.info('worker.note.completed', { noteId, chunksSaved: chunksToInsert.length });
}

export const documentWorker = new Worker(
  'document-processing',
  async (job) => {
    return runWithTraceId(job.data._traceId, async () => {
      const isProcessed = await IdempotencyManager.isProcessed('document-processing', job.id!);
      if (isProcessed) return { skipped: true };

      let result;
      if (job.name === 'extract-and-embed-note') {
        result = await processNote(job);
      } else {
        result = await processDocument(job);
      }
      
      await IdempotencyManager.markAsProcessed('document-processing', job.id!);
      return result;
    });
  },
  // 🟢 RAM PROTECTOR FIX: Reduced Concurrency from 5 to 2 to prevent Server Crash (OOM Kill)
  { connection: connection as any, concurrency: 2 }
);

documentWorker.on('completed', (job) => logger.info('worker.completed', { jobId: job.id }));
documentWorker.on('failed', (job, err) => logger.error('worker.failed', { jobId: job?.id, error: err.message }));
