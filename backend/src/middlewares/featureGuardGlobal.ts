import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requestContext } from '../core/requestContext';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

let cachedMappings: any[] | null = null;
let lastFetch = 0;

export const featureGuardGlobal = async (req: Request, res: Response, next: NextFunction) => {
  // Only intercept /api routes
  if (!req.originalUrl.startsWith('/api/')) return next();
  
  // Exclude admin, webhook, upload, auth routes
  if (req.originalUrl.includes('/admin') || req.originalUrl.includes('/payments') || req.originalUrl.includes('/upload')) {
    return next();
  }

  try {
    const match = req.originalUrl.match(/\/api\/([a-zA-Z0-9_-]+)/);
    const featureName = match ? match[1].toLowerCase() : 'unknown';

    const userTier = (req as any).user?.tier || 'Free';
    const userId = (req as any).user?.id;

    let isProUser = false;
    if (userTier.toLowerCase() === 'pro') {
      isProUser = true;
    } else if (userId) {
      const { data: profile } = await supabase.from('profiles').select('is_pro, subscription_tier').eq('id', userId).single();
      if (profile?.is_pro || profile?.subscription_tier === 'Pro') {
        isProUser = true;
      }
    }

    // Cache mappings for 1 minute to avoid DB spam
    if (!cachedMappings || Date.now() - lastFetch > 60000) {
      const { data } = await supabase.from('ai_feature_mappings').select('*');
      cachedMappings = data || [];
      lastFetch = Date.now();
    }
    
    let requiredTier = 'complex'; // Default to Pro if unmapped (per user request)
    
    if (cachedMappings) {
      const generalMap = cachedMappings.find(m => m.tier === 'general');
      const complexMap = cachedMappings.find(m => m.tier === 'complex');
      const embeddingMap = cachedMappings.find(m => m.tier === 'embedding');
      
      if (embeddingMap?.features.includes(featureName)) {
         requiredTier = 'embedding';
      } else if (generalMap?.features.includes(featureName)) {
         requiredTier = 'general';
      } else if (complexMap?.features.includes(featureName)) {
         requiredTier = 'complex';
      }
    }

    if (requiredTier === 'complex' && !isProUser) {
      const forceDowngrade = req.headers['x-force-downgrade'] === 'true' || req.query['forceDowngrade'] === 'true';
      
      if (!forceDowngrade) {
         return res.status(403).json({ 
           error: 'PRO_FEATURE_CONSENT_REQUIRED',
           message: 'This is a Pro feature. Do you want to use the Free model instead (Pro tokens will still be deducted)?'
         });
      } else {
         (req as any).forcedDowngrade = true;
      }
    }

    const requestData = {
      featureName,
      resolvedTier: (req as any).forcedDowngrade ? 'general' : requiredTier,
      forcedDowngrade: (req as any).forcedDowngrade
    };

    requestContext.run(requestData, () => {
      next();
    });
  } catch (error) {
     console.error('[FeatureGuard Error]:', error);
     next();
  }
};
