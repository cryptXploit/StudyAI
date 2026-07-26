import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.client';
import { addJob, getQueue } from '../queue/producer';
import { logger } from '../utils/logger';

const ocr = Router();

/**
 * OCR Callback Webhook
 * 
 * Triggered by n8n after JPEG OCR processing completes
 * 
 * Success Flow:
 * 1. Receive extracted text from n8n
 * 2. Update file status to 'ocr_complete'
 * 3. Push job to BullMQ text-chunking queue
 * 4. Return 202 Accepted (async processing)
 * 
 * Error Flow:
 * 1. Receive error details from n8n
 * 2. Update file status to 'ocr_failed'
 * 3. Log error details
 * 4. Return 400 Bad Request
 */
ocr.post('/api/ocr-callback', validateOCRRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      fileId,
      userId,
      fileName,
      extractedText,
      error,
      errorMessage,
      errorType,
      details,
      metadata
    } = req.body;

    // === ERROR CASE ===
    if (error) {
      logger.error('OCR processing failed', {
        fileId,
        userId,
        errorType,
        errorMessage,
        details,
        timestamp: new Date().toISOString()
      });

      // Update file status to failed
      const { error: updateError } = await supabase
        .from('files')
        .update({
          status: 'ocr_failed',
          error_message: errorMessage,
          error_details: {
            type: errorType,
            message: errorMessage,
            technicalDetails: details,
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', fileId)
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Failed to update file status on OCR error', {
          fileId,
          updateError: updateError.message,
          originalError: errorMessage
        });
      }

      return res.status(400).json({
        status: 'error',
        message: 'OCR processing failed',
        fileId,
        errorType,
        errorMessage
      });
    }

    // === SUCCESS CASE ===

    // Validate extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      logger.warn('OCR returned empty text', {
        fileId,
        userId,
        fileName,
        textLength: extractedText?.length || 0
      });

      // Still update status but mark as low confidence
      await supabase
        .from('files')
        .update({
          status: 'ocr_complete',
          extracted_text_preview: '',
          ocr_metadata: {
            ...metadata,
            emptyResult: true,
            processedAt: metadata?.processedAt || new Date().toISOString()
          }
        })
        .eq('id', fileId)
        .eq('user_id', userId);

      // Still queue for chunking (may have some content)
      const job = await addJob('text-chunking', 'chunk-text', {
        fileId,
        userId,
        text: extractedText || '',
        fileName,
        source: 'ocr',
        metadata: {
          ...metadata,
          textLength: extractedText?.length || 0,
          emptyResult: true
        },
        idempotencyKey: `chunking-${fileId}-empty`
      });

      logger.info('Empty OCR result queued for chunking', {
        fileId,
        jobId: job.id,
        textLength: 0
      });

      return res.status(202).json({
        status: 'queued',
        message: 'Empty OCR result received and queued for processing',
        fileId,
        jobId: job.id,
        textLength: 0
      });
    }

    // Extract text preview (first 500 chars)
    const textPreview = extractedText.substring(0, 500);

    logger.info('OCR completed successfully', {
      fileId,
      userId,
      fileName,
      textLength: extractedText.length,
      confidence: (metadata as any)?.confidence,
      pageCount: (metadata as any)?.pageCount,
      processingTime: (metadata as any)?.processedAt
    });

    // Update file record in Supabase
    const { error: updateError, data: updatedFile } = await supabase
      .from('files')
      .update({
        status: 'ocr_complete',
        extracted_text_preview: textPreview,
        ocr_metadata: {
          textLength: extractedText.length,
          confidence: (metadata as any)?.confidence,
          pageCount: (metadata as any)?.pageCount,
          processedAt: (metadata as any)?.processedAt,
          source: 'n8n-ocr-workflow'
        }
      })
      .eq('id', fileId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update file status after successful OCR', {
        fileId,
        userId,
        updateError: updateError.message
      });
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Push to BullMQ text-chunking queue
    const job = await addJob('text-chunking', 'chunk-text', {
      fileId,
      userId,
      text: extractedText,
      fileName,
      source: 'ocr',
      metadata: {
        textLength: extractedText.length,
        confidence: (metadata as any)?.confidence,
        pageCount: (metadata as any)?.pageCount,
        processedAt: (metadata as any)?.processedAt,
        ocrSource: (metadata as any)?.source || 'n8n-workflow'
      },
      idempotencyKey: `chunking-${fileId}`
    });

    logger.info('OCR text queued for chunking', {
      fileId,
      userId,
      jobId: job.id,
      textLength: extractedText.length,
      queuedAt: new Date().toISOString()
    });

    // Return 202 Accepted - async processing has begun
    res.status(202).json({
      status: 'queued',
      message: 'OCR text received and queued for chunking',
      fileId,
      jobId: job.id,
      textLength: extractedText.length,
      confidence: (metadata as any)?.confidence,
      pageCount: (metadata as any)?.pageCount,
      nextStep: 'text_chunking',
      estimatedTimeSeconds: 30 // Rough estimate
    });

  } catch (err) {
    logger.error('Unhandled error in OCR callback', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });

    next(err);
  }
});

/**
 * Middleware: Validate OCR Request
 * 
 * - Check Authorization header matches BACKEND_API_KEY
 * - Validate required fields
 * - Validate payload structure
 */
function validateOCRRequest(req: Request, res: Response, next: NextFunction) {
  // Check authorization token
  const authHeader = req.headers.authorization;
  const expectedToken = `Bearer ${process.env.BACKEND_API_KEY}`;

  if (!authHeader || authHeader !== expectedToken) {
    logger.warn('Unauthorized OCR callback attempt', {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(401).json({
      status: 'unauthorized',
      message: 'Invalid or missing Bearer token'
    });
  }

  // Validate required fields
  const { fileId, userId, fileName } = req.body;

  if (!fileId || !userId) {
    logger.warn('OCR callback missing required fields', {
      hasFileId: !!fileId,
      hasUserId: !!userId,
      hasFileName: !!fileName
    });

    return res.status(400).json({
      status: 'invalid_request',
      message: 'Missing required fields: fileId, userId'
    });
  }

  // Check error vs success payload structure
  const { error, extractedText, errorMessage } = req.body;

  if (error && !errorMessage) {
    return res.status(400).json({
      status: 'invalid_request',
      message: 'Error payload must include errorMessage'
    });
  }

  if (!error && typeof extractedText !== 'string') {
    return res.status(400).json({
      status: 'invalid_request',
      message: 'Success payload must include extractedText (string)'
    });
  }

  next();
}

/**
 * Health Check Endpoint (optional)
 * 
 * Monitor OCR callback readiness
 */
ocr.get('/api/ocr-callback/health', async (req: Request, res: Response) => {
  try {
    // Check Supabase connectivity
    const { error: dbError } = await supabase
      .from('files')
      .select('id')
      .limit(1);

    if (dbError) {
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Database connection failed',
        component: 'supabase'
      });
    }

    // Check BullMQ connectivity
    try {
      const queue = getQueue('text-chunking');
      await queue.count();
    } catch (qErr) {
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Queue connection failed',
        component: 'bullmq'
      });
    }

    return res.status(200).json({
      status: 'healthy',
      message: 'OCR callback endpoint ready',
      timestamp: new Date().toISOString(),
      components: {
        database: 'connected',
        queue: 'connected'
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

/**
 * Stats Endpoint (optional)
 * 
 * Monitor OCR processing statistics
 */
ocr.get('/api/ocr-callback/stats', async (req: Request, res: Response) => {
  try {
    // Get queue stats
    const queue = getQueue('text-chunking');
    const counts = await queue.getJobCounts();

    // Get recent file processing stats from Supabase
    const { data: recentFiles, error } = await supabase
      .from('files')
      .select('status, created_at')
      .eq('status', 'ocr_complete')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const ocrSuccessCount = recentFiles?.filter((f: any) => f.status === 'ocr_complete').length || 0;

    res.status(200).json({
      queue: {
        waiting: counts.wait,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        total: counts.total
      },
      recentProcessing: {
        last24h: {
          ocrCompleted: ocrSuccessCount,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (err) {
    logger.error('Failed to get OCR stats', {
      error: err instanceof Error ? err.message : String(err)
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch stats'
    });
  }
});

export default ocr;