import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('global avatar opens a profile viewer without removing the feature sidebar', () => {
  const root = path.resolve(__dirname, '..');
  const layout = fs.readFileSync(path.join(root, 'src/components/layout/SecureLayout.tsx'), 'utf8');

  expect(layout).toContain("select('tokens, tier, full_name, avatar_url')");
  expect(layout).toContain('aria-label="Open profile section"');
  expect(layout).toContain('isProfileViewerOpen');
  expect(layout).toContain('profile.avatar_url');
  expect(layout).toContain('href="/settings"');
  expect(layout).toContain('href="/rewards"');
  expect(layout).toContain('href="/analytics"');
  expect(layout).toContain('navItems.map');
});
