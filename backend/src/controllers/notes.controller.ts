import { Request, Response, Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { documentQueue } from '../queue/connection';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function getNotes(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { data, error } = await supabaseAdmin
      .from('user_notes')
      .select('id, title, tags, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, notes: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getNoteById(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('user_notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) { res.status(404).json({ error: 'Note not found' }); return; }
    res.json({ success: true, note: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { title = 'Untitled Note', content_md = '', tags = [] } = req.body;

    const { data, error } = await supabaseAdmin
      .from('user_notes')
      .insert([{ user_id: userId, title, content_md, tags }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, note: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const tier = (req as any).user?.tier || 'Free';
    const { id } = req.params;
    const { title, content_md, tags } = req.body;

    const { data, error } = await supabaseAdmin
      .from('user_notes')
      .update({ title, content_md, tags, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Trigger RAG embedding in background (only if content is substantial)
    if (content_md && content_md.length > 50) {
      await documentQueue.add('extract-and-embed-note', {
        noteId: id,
        userId: userId,
        tier: tier
      });
    }

    res.json({ success: true, note: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteNote(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('user_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function registerNotesRoutes(app: any): void {
  const router = Router();
  router.get('/', requireAuth, getNotes);
  router.get('/:id', requireAuth, getNoteById);
  router.post('/', requireAuth, createNote);
  router.put('/:id', requireAuth, updateNote);
  router.delete('/:id', requireAuth, deleteNote);
  app.use('/api/notes', router);
}
