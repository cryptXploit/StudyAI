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
  // Only intercept /api routes and POST requests (AI generation is usually POST)
  if (!req.originalUrl.startsWith('/api/') || req.method !== 'POST') return next();
  
  // Exclude admin, webhook, upload, auth routes
  if (req.originalUrl.includes('/admin') || req.originalUrl.includes('/payments') || req.originalUrl.includes('/upload')) {
    return next();
  }

  const KNOWN_AI_FEATURES = new Set([
    'chat', 'quiz', 'live', 'voice', 'night-before', 'mind-map', 'mind-map-chat', 'flashcard', 
    'story', 'solver', 'podcast', 'molecule', 'curve', 'planner', 'presentation', 
    'flowchart', 'wallpaper', 'logicflow', 'universe', 'timeline', 'bionic', 
    'purifier', 'calendar', 'labgraph', 'battle', 'youtube', 'focus', 'battle2', 
    'reward', 'syllabus', 'geomapper', 'career', 'notes', 'bookjumper', 'oracle'
  ]);

  try {
    const match = req.originalUrl.match(/\/api\/([a-zA-Z0-9_-]+)/);
    const featureName = match ? match[1].toLowerCase() : 'unknown';

    // If it's not a known AI feature, skip the feature guard!
    if (!KNOWN_AI_FEATURES.has(featureName)) return next();

    const userTier = (req as any).user?.tier || 'Free';
    const userId = (req as any).user?.id;

    let isProUser = false;
    if (userTier.toLowerCase() === 'pro') {
      isProUser = true;
    } else if (userId) {
      const { data: profile } = await supabase.from('profiles').select('tier').eq('id', userId).single();
      if (profile?.tier === 'Pro') {
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
    let isUnmapped = true;
    
    if (cachedMappings) {
      const prefix = isProUser ? 'pro_' : 'free_';
      
      const generalMap = cachedMappings.find(m => m.tier === `${prefix}general`);
      const complexMap = cachedMappings.find(m => m.tier === `${prefix}complex`);
      const embeddingMap = cachedMappings.find(m => m.tier === `${prefix}embedding`);
      
      if (embeddingMap?.features.includes(featureName)) {
         requiredTier = 'embedding';
         isUnmapped = false;
      } else if (generalMap?.features.includes(featureName)) {
         requiredTier = 'general';
         isUnmapped = false;
      } else if (complexMap?.features.includes(featureName)) {
         requiredTier = 'complex';
         isUnmapped = false;
      }
    }

    if (!isProUser) {
      let isProFeature = false;
      if (cachedMappings) {
        const proComplexMap = cachedMappings.find(m => m.tier === 'pro_complex');
        if (proComplexMap?.features.includes(featureName)) {
          isProFeature = true;
        }
      }
      
      // Show modal if it's a Pro feature but Free user is mapped to general, OR if it's totally unmapped
      const needsModal = (requiredTier === 'general' && isProFeature) || isUnmapped;
      
      if (needsModal) {
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
