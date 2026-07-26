const fs = require('fs');

let content = fs.readFileSync('src/controllers/presentation.controller.ts', 'utf8');

content += `
export async function getHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { data, error } = await supabase.from('saved_presentations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const deckId = req.params.id;
    if (!userId || !deckId) {
      res.status(400).json({ error: 'Missing params' });
      return;
    }
    const { error } = await supabase.from('saved_presentations').delete().eq('id', deckId).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
`;

content = content.replace(
`export function registerPresentationRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generatePresentationHandler(req, res); });
  app.use('/api/presentation', router);
}`,
`export function registerPresentationRoutes(app: any): void {
  const router = Router();
  router.post('/generate', requireAuth, async (req: Request, res: Response) => { await generatePresentationHandler(req, res); });
  router.get('/history', requireAuth, async (req: Request, res: Response) => { await getHistoryHandler(req, res); });
  router.delete('/history/:id', requireAuth, async (req: Request, res: Response) => { await deleteHistoryHandler(req, res); });
  app.use('/api/presentation', router);
}`);

fs.writeFileSync('src/controllers/presentation.controller.ts', content);
console.log('Updated presentation.controller.ts');
