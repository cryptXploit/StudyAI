import fs from 'fs';
import path from 'path';

describe('production security contract', () => {
  const migration = fs.readFileSync(path.resolve(__dirname, '../../../migrations/20260725_rls_hardening.sql'), 'utf8');

  it('keeps API configuration and billing data behind RLS', () => {
    expect(migration).toContain("'api_configurations'");
    expect(migration).toContain("'credit_ledger'");
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('uses a database-backed admin flag rather than JWT metadata', () => {
    expect(migration).toContain('is_admin BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('is_current_admin()');
    expect(migration).not.toContain("app_metadata' ->> 'role'");
  });

  it('covers every table from the supplied production schema', () => {
    const tables = [
      'profiles', 'files', 'context_packs', 'file_chunks', 'sessions', 'messages',
      'api_configurations', 'app_settings', 'credit_ledger', 'bd_transactions',
      'user_subscriptions', 'shared_timebombs', 'bounties', 'bounty_solutions',
      'learning_resources', 'user_notes', 'user_notes_embeddings', 'youtube_courses',
      'oracle_history', 'usage_logs', 'reward_transactions',
    ];
    for (const table of tables) {
      expect(migration).toMatch(new RegExp(`(?:'${table}'|public\\.${table})`));
    }
  });

  it('keeps admin configuration and analytics behind the backend admin router', () => {
    const adminController = fs.readFileSync(path.resolve(__dirname, '../controllers/admin.controller.ts'), 'utf8');
    expect(adminController).toContain("router.get('/api-configurations'");
    expect(adminController).toContain("router.get('/analytics'");
    expect(adminController).toContain('router.use(requireAuth, requireAdmin)');
  });
});
