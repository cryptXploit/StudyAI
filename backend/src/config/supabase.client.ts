import { createClient } from '@supabase/supabase-js';
import logger from '../core/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('supabase.config', {
    message: 'Missing Supabase credentials',
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
  });
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export default supabase;
