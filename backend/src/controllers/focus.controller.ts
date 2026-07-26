import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 🟢 SECURITY: Admin client for server-side trusted operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function logFocusSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { durationMinutes } = req.body;

    if (!userId || !durationMinutes) {
      res.status(400).json({ error: 'Missing session details' });
      return;
    }

    // 🟢 Non-blocking DB Save (Zero Latency impact on user experience)
    void (async () => {
      try {
        const { error } = await supabaseAdmin.from('focus_sessions').insert([{
          user_id: userId,
          duration_minutes: durationMinutes
        }]);
        if (error) console.error("Focus Session DB Save Error:", error.message);
      } catch {
        // A focus log must never interrupt the live session UX.
      }
    })();

    // Return immediately to the client
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getFocusHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(400).json({ error: 'Unauthorized' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, history: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createRoomHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) { 
      res.status(401).json({ error: 'Unauthorized' }); 
      return; 
    }

    // 🟢 Generate a secure, fast 6-character room code
    const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Kept await here to ensure the room exists in DB before the socket tries to join
    const { data, error } = await supabaseAdmin.from('study_rooms').insert([{
      host_id: userId, room_code: roomCode
    }]).select().single();

    if (error) throw error;
    res.json({ success: true, roomCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerFocusRoutes(app: any): void {
  const router = Router();
  router.post('/log', requireAuth, async (req: Request, res: Response) => { await logFocusSessionHandler(req, res); });
  router.get('/history', requireAuth, async (req: Request, res: Response) => { await getFocusHistoryHandler(req, res); });
  router.post('/create-room', requireAuth, async (req: Request, res: Response) => { await createRoomHandler(req, res); });
  app.use('/api/focus', router);
}
