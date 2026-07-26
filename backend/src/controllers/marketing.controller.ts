import { Request, Response } from 'express';
import logger from '../core/logger';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const submitEnquiryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, query } = req.body;

    if (!email || !query) {
      res.status(400).json({ status: 'error', message: 'Email and query are required.' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('marketing_enquiries')
      .insert([
        {
          email: email.toLowerCase().trim(),
          query: query,
          status: 'new'
        }
      ]);

    if (error) {
      logger.error(`[Marketing API] Supabase Insert Error: ${error.message}`);
      res.status(500).json({ status: 'error', message: 'Failed to save enquiry.' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Enquiry submitted successfully.' });
  } catch (err: any) {
    logger.error(`[Marketing API] Unexpected Error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};
