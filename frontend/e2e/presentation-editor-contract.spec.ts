import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('presentation creator offers selectable templates and authenticated edit persistence', () => {
  const root = path.resolve(__dirname, '..');
  const page = fs.readFileSync(path.join(root, 'src/app/presentation/page.tsx'), 'utf8');
  const controller = fs.readFileSync(path.join(root, '..', 'backend/src/controllers/presentation.controller.ts'), 'utf8');

  expect(page).toContain('Aurora Glass');
  expect(page).toContain('Midnight Executive');
  expect(page).toContain('saveDeckEdits');
  expect(page).toContain('openLivePresentation');
  expect(page).toContain('requestFullscreen');
  expect(page).toContain('downloadPresentation');
  expect(page).toContain("link.download = `${safeTitle || 'presentation'}.html`");
  expect(page).toContain('presentation-bubble-one');
  expect(page).toContain("setIsMobileDrawerOpen('template')");
  expect(page).toContain('isMobileShareOpen');
  expect(page).toContain('isDesktopTemplateOpen');
  expect(page).toContain('isDesktopShareOpen');
  expect(page).toContain('hidden lg:flex absolute right-7 top-7');
  expect(page).toContain('Live Share');
  expect(page).toContain('AnimationPicker');
  expect(page).toContain('animationStyle');
  expect(controller).toContain('BACKGROUND MOTION DIRECTION');
  expect(page).toContain("method: 'PUT'");
  expect(controller).toContain("router.put('/history/:id'");
  expect(controller).toContain(".eq('user_id', userId)");
});
