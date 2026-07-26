import { expect, test } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:5000';
const live = process.env.E2E_ENABLED === 'true';

test.describe('public security and billing contracts', () => {
  test.skip(!live, 'Set E2E_ENABLED=true only against the isolated staging test stack.');

  test('unauthenticated visitors cannot access admin configuration or uploads', async ({ request }) => {
    const [admin, upload] = await Promise.all([
      request.get(`${apiUrl}/api/admin/api-configurations`),
      request.post(`${apiUrl}/api/upload`),
    ]);
    expect(admin.status()).toBe(401);
    expect(upload.status()).toBe(401);
  });

  test('pricing exposes the central token-cost configuration', async ({ request }) => {
    const response = await request.get(`${apiUrl}/api/payments/pricing`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.tokenCosts.AI_CHAT).toBeGreaterThan(0);
    expect(payload.tokenCosts.MIND_MAP_GEN).toBeGreaterThan(0);
  });

  test('signup and pricing pages render without exposing privileged controls', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('body')).toContainText(/sign up|register|create/i);
    await page.goto('/pricing');
    await expect(page.locator('body')).not.toContainText(/api key/i);
  });
});
