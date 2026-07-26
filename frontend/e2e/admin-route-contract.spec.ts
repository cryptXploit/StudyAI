import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('admin pages use the normalized backend origin and database-backed route guard', () => {
  const root = path.resolve(__dirname, '..');
  const settings = fs.readFileSync(path.join(root, 'src/app/admin/settings/page.tsx'), 'utf8');
  const analytics = fs.readFileSync(path.join(root, 'src/app/admin/analytics/page.tsx'), 'utf8');
  const proxy = fs.readFileSync(path.join(root, 'proxy.ts'), 'utf8');
  const resources = fs.readFileSync(path.join(root, 'src/app/admin/resources/page.tsx'), 'utf8');
  const requireAdmin = fs.readFileSync(path.join(root, 'src/components/hoc/RequireAdmin.tsx'), 'utf8');

  expect(settings).toContain("replace(/\\/api\\/?$/, '')");
  expect(settings).toContain('/api/admin/api-configurations');
  expect(analytics).toContain('/api/admin/analytics');
  expect(proxy).toContain("pathname.startsWith('/admin')");
  expect(proxy).toContain("select('is_admin')");
  expect(proxy).toContain("proxy(request: NextRequest)");
  expect(settings).toContain('RequireAdmin');
  expect(analytics).toContain('RequireAdmin');
  expect(resources).toContain('RequireAdmin');
  expect(requireAdmin).toContain("router.replace('/login')");
  expect(requireAdmin).toContain("router.replace('/dashboard')");
  expect(requireAdmin).toContain("select('is_admin')");
});
