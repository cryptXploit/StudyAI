import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { runOraclePrediction } from '../controllers/oracle.controller';

const router = Router();

router.post('/predict', requireAuth, runOraclePrediction);

export default router;
