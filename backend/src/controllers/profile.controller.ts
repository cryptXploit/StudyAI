import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export async function getProfileHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?.sub; // 🟢 Safe ID parsing
  try {
    // 🟢 FIXED: Use maybeSingle() so it doesn't crash if the user is new!
    const { data, error } = await supabaseAdmin.from('profiles')
      .select('full_name, university, country, session_year, dob, is_profile_optimized, streak_count, last_login_date, tokens')
      .eq('id', userId)
      .maybeSingle(); 
      
    if (error) throw error;
    res.json({ success: true, profile: data || {} });
  } catch (e: any) { 
    console.error("Profile GET Error:", e.message);
    res.status(500).json({ success: false, error: e.message }); 
  }
}

export async function updateProfileHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id || (req as any).user?.sub;
  const { full_name, university, country, session_year, dob } = req.body;
  
  try {
    const updateData = {
      id: userId, // 🟢 Required for Upsert
      full_name: full_name?.trim() || null,
      university: university?.trim() || null,
      country: country?.trim() || null,
      session_year: session_year?.trim() || null,
      dob: dob?.trim() || null
    };

    // 🟢 FIXED: Use upsert(). If the row doesn't exist, it creates it.
    const { error } = await supabaseAdmin.from('profiles').upsert(updateData, { onConflict: 'id' });
    
    if (error) throw new Error(error.message);
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (e: any) { 
    console.error("Profile PUT Error:", e.message);
    res.status(500).json({ success: false, error: e.message }); 
  }
}

export function registerProfileRoutes(app: any): void {
  const router = Router();
  router.get('/', requireAuth, async (req: Request, res: Response) => { await getProfileHandler(req, res); });
  router.put('/', requireAuth, async (req: Request, res: Response) => { await updateProfileHandler(req, res); });
  app.use('/api/profile', router);
}