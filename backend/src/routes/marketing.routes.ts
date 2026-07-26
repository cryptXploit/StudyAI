import { Router } from 'express';
import { submitEnquiryHandler } from '../controllers/marketing.controller';

const router = Router();

// Public route to submit marketing enquiry from landing page
router.post('/enquire', submitEnquiryHandler);

export default router;
