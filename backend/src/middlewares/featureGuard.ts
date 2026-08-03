import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const featureGuard = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userTier = (req as any).user?.tier || 'Free';
      const userId = (req as any).user?.id;

      // 1. Check if user is Pro
      let isProUser = false;
      if (userTier.toLowerCase() === 'pro') {
        isProUser = true;
      } else if (userId) {
        const { data: profile } = await supabase.from('profiles').select('is_pro, subscription_tier').eq('id', userId).single();
        if (profile?.is_pro || profile?.subscription_tier === 'Pro') {
          isProUser = true;
        }
      }

      // 2. Fetch feature mapping
      const { data: mappings } = await supabase.from('ai_feature_mappings').select('*');
      
      let requiredTier = 'complex'; // Default to Pro if unmapped
      
      if (mappings) {
        const generalMap = mappings.find(m => m.tier === 'general');
        const complexMap = mappings.find(m => m.tier === 'complex');
        const embeddingMap = mappings.find(m => m.tier === 'embedding');
        
        if (embeddingMap?.features.includes(featureName)) {
           requiredTier = 'embedding';
        } else if (generalMap?.features.includes(featureName)) {
           requiredTier = 'general';
        } else if (complexMap?.features.includes(featureName)) {
           requiredTier = 'complex';
        }
      }

      // 3. Authorization Logic
      if (requiredTier === 'complex' && !isProUser) {
        const forceDowngrade = req.headers['x-force-downgrade'] === 'true';
        
        if (!forceDowngrade) {
           return res.status(403).json({ 
             error: 'PRO_FEATURE_CONSENT_REQUIRED',
             message: 'This is a Pro feature. Do you want to use the Free model instead (Pro tokens will still be deducted)?'
           });
        } else {
           // User consented to use free model
           (req as any).forcedDowngrade = true;
        }
      }

      // Attach resolved feature logic to request for ModelRouter
      (req as any).featureName = featureName;
      (req as any).resolvedTier = (req as any).forcedDowngrade ? 'general' : requiredTier;

      next();
    } catch (error) {
       console.error('[FeatureGuard Error]:', error);
       next();
    }
  };
};
