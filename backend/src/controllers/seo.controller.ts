import { Express, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { submitUrlToIndex } from '../utils/googleIndexing';
import logger from '../core/logger';
import { createClient } from '@supabase/supabase-js';

// Super Admin / Authorized user check can be implemented here if needed

export const registerSeoRoutes = (app: Express) => {
  /**
   * Ping Google Indexing API to update a specific URL
   * POST /api/seo/index-url
   */
  app.post('/api/seo/index-url', requireAuth, async (req: Request, res: Response) => {
    try {
      const { url, type } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const indexType = type === 'URL_DELETED' ? 'URL_DELETED' : 'URL_UPDATED';

      // Submit to Google
      const result = await submitUrlToIndex(url, indexType);

      if (result.success) {
        return res.status(200).json({ success: true, message: 'URL successfully sent to Google Indexing API', data: result.data });
      } else {
        return res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      logger.error('Error in /api/seo/index-url', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};
