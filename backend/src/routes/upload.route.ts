import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { documentQueue } from '../queue/connection';
import { TOKEN_COSTS } from '../config/tokenCosts';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Memory storage for immediate buffer access, max 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Validates file magic numbers to ensure actual file type
 * PDF: %PDF- (25 50 44 46 2D)
 * JPEG: FF D8 FF
 */
const checkMagicNumber = (buffer: Buffer): 'pdf' | 'jpeg' | null => {
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return 'pdf';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  return null;
};

router.post('/upload', requireAuth, upload.single('file') as any, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Critical Security: Magic number validation
    const fileType = checkMagicNumber(file.buffer);
    if (!fileType) {
      return res.status(400).json({ error: 'Invalid file type. Only PDF and JPEG are allowed.' });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
    
    // 🟢 NEW: File Upload Limit Check for Free Users
    if (userId !== 'anonymous') {
      const { data: userProfile } = await supabase.from('profiles').select('tier').eq('id', userId).single();
      const tier = userProfile?.tier || 'Free';
      
      if (tier.toLowerCase() !== 'pro') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count, error: countErr } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo.toISOString());
          
        if (!countErr && (count || 0) >= TOKEN_COSTS.FREE_USER_WEEKLY_FILE_LIMIT) {
          return res.status(403).json({ error: `FREE_LIMIT_REACHED`, message: `Free users can only upload ${TOKEN_COSTS.FREE_USER_WEEKLY_FILE_LIMIT} files per week. Please wait or upgrade to Pro.` });
        }
      }
    }

    const fileExt = fileType === 'pdf' ? '.pdf' : '.jpg';
    // Generate unique storage path
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;

    // 1. Upload validated file to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    // 🟢 MAGICAL FIX: Aggressive RAM Cleanup (Force V8 Garbage Collection)
    // ফাইল স্টোরেজে আপলোড হওয়ার সাথে সাথে বাফার খালি করে র‍্যাম রিলিজ করা হলো
    file.buffer = Buffer.alloc(0);

    if (storageError) {
      console.error('[UploadRoute] Storage Error:', storageError);
      return res.status(502).json({ error: 'Failed to upload to storage provider' });
    }

    // 2. Insert record in `files` table
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        storage_path: fileName,
        status: 'uploading',
        name: file.originalname,
        file_type: fileType,
        file_size: file.size,
      })
      .select('id')
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('[UploadRoute] Database Error:', dbError);
      return res.status(500).json({ error: 'Failed to save record' });
    }

    const fileId = fileRecord?.id || `mock-${Date.now()}`;

    // 3. Push every upload through the canonical document-processing pipeline.
    await documentQueue.add('extract-and-embed', {
      fileId,
      userId,
      storagePath: fileName,
      mimetype: file.mimetype,
    }, { jobId: `document:${fileId}`, removeOnComplete: 500, removeOnFail: 1000 });

    // 4. Return 202 Accepted for Async UX
    return res.status(202).json({
      message: 'File accepted for processing',
      fileId,
    });
  } catch (error) {
    console.error('[UploadRoute] Unexpected Error:', error);
    // 🟢 ফেইল করলেও যেন RAM আটকে না থাকে
    if (req.file && req.file.buffer) {
      req.file.buffer = Buffer.alloc(0);
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
