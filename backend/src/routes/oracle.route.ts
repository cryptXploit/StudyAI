import { Router } from 'express';
import multer from 'multer';
const router = Router();

// Memory storage for immediate buffer access, max 10MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

import { requireAuth } from '../middlewares/auth.middleware';
import { runOracleExtraction, getOracleExtractionStatus, runOraclePrediction } from '../controllers/oracle.controller';

router.post('/extract', requireAuth, upload.array('pastPapers', 10) as any, runOracleExtraction);
router.get('/extract-status/:jobId', requireAuth, getOracleExtractionStatus);
router.post('/predict', requireAuth, runOraclePrediction);

export default router;
