import express, { Express } from 'express';
import { chatHandler, registerChatRoutes } from '../controllers/chat.controller';
import { tierMiddleware } from '../middlewares/tier.middleware';

/**
 * Register chat-related routes to Express app
 */
export function setupChatRoutes(app: Express): void {
  // Apply middleware to chat routes
  app.use('/api/chat', tierMiddleware);

  // Main chat endpoint with streaming SSE
  app.post('/api/chat', async (req, res) => {
    try {
      await chatHandler(req, res);
    } catch (error) {
      console.error('Chat route error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.end();
      }
    }
  });

  // Health check for chat service
  app.get('/api/chat/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'chat-controller',
      timestamp: Date.now(),
      features: {
        streaming: true,
        caching: true,
        memory: true,
        retrieval: true,
        failover: true,
      }
    });
  });

  // Metrics endpoint
  app.get('/api/chat/metrics', (_req, res) => {
    res.json({
      timestamp: Date.now(),
      message: 'Metrics endpoint - ready for integration'
    });
  });

  console.log('Chat routes registered');
}

export { chatHandler, registerChatRoutes };