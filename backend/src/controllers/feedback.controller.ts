import { Request, Response } from 'express';
import logger from '../core/logger';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const submitFeedbackHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { issueType, message, pageContext } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    if (!issueType || !message) {
      res.status(400).json({ status: 'error', message: 'Issue type and message are required.' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('user_feedbacks')
      .insert([
        {
          user_id: userId,
          issue_type: issueType,
          message: message,
          page_context: pageContext || 'unknown',
          status: 'open'
        }
      ]);

    if (error) {
      logger.error(`[Feedback API] Supabase Insert Error: ${error.message}`);
      res.status(500).json({ status: 'error', message: 'Failed to save feedback.' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Feedback submitted successfully.' });
  } catch (err: any) {
    logger.error(`[Feedback API] Unexpected Error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};
