import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { invalidateEmbeddingConfigCache } from '../services/modelRouter';

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export function registerAdminRoutes(app: any): void {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get('/api-configurations', async (_req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('api_configurations')
      .select('id, provider_name, model_name, priority, is_active, task_type, updated_at, api_key')
      .order('priority', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: (data || []).map(({ api_key, ...row }: any) => ({ ...row, has_api_key: Boolean(api_key) })) });
  });

  router.put('/api-configurations', async (req: Request, res: Response) => {
    const configs = Array.isArray(req.body?.configs) ? req.body.configs : [];
    if (!configs.length) return res.status(400).json({ error: 'configs is required' });
    for (const config of configs) {
      const payload: any = {
        provider_name: config.provider_name,
        model_name: config.model_name || null,
        priority: Number(config.priority),
        is_active: Boolean(config.is_active),
        task_type: config.task_type || 'general',
        updated_at: new Date().toISOString(),
      };
      if (typeof config.api_key === 'string' && config.api_key.trim()) payload.api_key = config.api_key.trim();
      const query = config.id && !String(config.id).startsWith('temp-')
        ? supabase.from('api_configurations').update(payload).eq('id', config.id)
        : supabase.from('api_configurations').insert(payload);
      const { error } = await query;
      if (error) return res.status(400).json({ error: error.message });
    }
    invalidateEmbeddingConfigCache();
    res.json({ success: true });
  });

  router.get('/analytics', async (_req: Request, res: Response) => {
    const [costsResult, healthResult] = await Promise.all([
      supabase.from('api_cost_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('api_health_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (costsResult.error || healthResult.error) {
      res.status(500).json({ error: costsResult.error?.message || healthResult.error?.message });
      return;
    }
    res.json({ costs: costsResult.data || [], health: healthResult.data || [] });
  });

  app.use('/api/admin', router);
}
