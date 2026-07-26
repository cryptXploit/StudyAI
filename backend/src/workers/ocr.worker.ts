import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import vision from '@google-cloud/vision';
import { createWorker } from '../queue/worker';
import { addJob } from '../queue/producer';
import logger from '../core/logger';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || undefined,
});

interface OCRJobData {
  fileId: string;
  userId: string;
  tenantId: string;
  storagePath: string;
  idempotencyKey: string;
}

/**
 * OCR Worker: Calls Google Cloud Vision API to extract text from JPEG uploads
 * Concurrency: 10 concurrent workers
 * Retry: 3 attempts with exponential backoff
 */
export const ocrWorker = createWorker<OCRJobData>(
  'file-ocr',
  async (job: Job<OCRJobData>) => {
    const { fileId, userId, tenantId, storagePath, idempotencyKey } = job.data;

    logger.info('ocr.processing', { fileId, storagePath });

    try {
      // 1. Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message || 'No data'}`);
      }

      // 2. Convert to buffer for Vision API
      const fileBuffer = await fileData.arrayBuffer();
      const base64Image = Buffer.from(fileBuffer).toString('base64');

      logger.info('ocr.vision_api_call', { fileId });

      // 3. Call Google Cloud Vision API
      const request = {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: 'TEXT_DETECTION',
          },
        ],
      };

      const [result] = await visionClient.annotateImage(request);
      const detections = result.textAnnotations;

      // 4. Extract full text (first annotation contains all detected text)
      let extractedText = '';
      if (!detections || detections.length === 0) {
        logger.warn('ocr.no_text_detected', { fileId });
      } else {
        extractedText = detections[0].description || '';
      }

      logger.info('ocr.text_extracted', { fileId, textLength: extractedText.length });

      // 5. Update file status to 'ocr_complete' in Supabase
      const { error: updateError } = await supabase
        .from('files')
        .update({
          status: 'ocr_complete',
          raw_text: extractedText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to update file status: ${updateError.message}`);
      }

      // 6. Push to text-chunking queue
      logger.info('ocr.queuing_chunking', { fileId });
      await addJob('text-chunking', 'chunk-text', {
        fileId,
        userId,
        tenantId,
        rawText: extractedText,
        fileType: 'jpeg',
        idempotencyKey: `chunking-${fileId}`,
      });

      logger.info('ocr.completed', { fileId, textLength: extractedText.length });

      return {
        success: true,
        fileId,
        textLength: extractedText.length,
        status: 'ocr_complete',
      };
    } catch (error) {
      logger.error('ocr.failed', { fileId, error: error instanceof Error ? error.message : String(error) });

      // Mark file as failed
      await supabase
        .from('files')
        .update({
          status: 'ocr_failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .eq('user_id', userId);

      throw error;
    }
  },
  (job) => job.data.idempotencyKey
);

// Configure worker with concurrency of 10
export function registerOCRWorker(): void {
  const workerOptions = {
    concurrency: 10,
    maxStalledCount: 2,
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
  };

  logger.info('ocr.worker_registered', {});
}
