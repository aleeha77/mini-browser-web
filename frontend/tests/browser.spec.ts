import { expect, test, type Page } from '@playwright/test';

const users = [{ _id: 'alice-id', name: 'Alice' }];
const sites: Record<string, { address: string; title: string; author: string; body: string }> = {
  'tidepool.zz': { address: 'tidepool.zz', title: 'Tidepool', author: 'Alice', body: '<h1>Tidepool</h1><p style="height:1200px">Long page</p><a href="beacon.zz">Beacon</a>' },
  'beacon.zz': { address: 'beacon.zz', title: 'Beacon', author: 'Bob', body: '<h1>Beacon</h1><a href="lighthouse.zz">Lighthouse</a>' },
  'lighthouse.zz': { address: 'lighthouse.zz', title: 'Lighthouse', author: 'Alice', body: '<h1>Lighthouse</h1>' },
};

async function mockApi(page: Page) {
  await page.route('**/users', async (route) => route.fulfill({ json: users }));
  await page.route('**/sites/**', async (route) => {
    const url = new URL(route.request().url());
    const site = sites[decodeURIComponent(url.pathname.slice('/sites/'.length))];
    return site
      ? route.fulfill({ json: site })
      : route.fulfill({ status: 404, json: { message: 'Not found' } });
  });
  await page.route('**/history/**', async (route) => route.fulfill({ json: [] }));
  await page.route('**/history', async (route) => route.fulfill({ status: 201, json: {} }));
}

test.describe('browser navigation', () => {
  test('restores pages and clears forward history after a new navigation', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('iframe')).toHaveCount(1);

    await page.getByRole('textbox').fill('beacon.zz');
    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page.locator('iframe')).toHaveAttribute('title', 'Beacon');
    await page.getByRole('button', { name: '←' }).click();
    await expect(page.locator('iframe')).toHaveAttribute('title', 'Tidepool');

    await page.getByRole('textbox').fill('lighthouse.zz');
    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page.locator('iframe')).toHaveAttribute('title', 'Lighthouse');
    await expect(page.getByRole('button', { name: '→' })).toBeDisabled();
  });

  test('keeps the current page visible when a visit write fails', async ({ page }) => {
    await mockApi(page);
    await page.unroute('**/history');
    await page.route('**/history', (route) => route.fulfill({ status: 500, json: { message: 'write failed' } }));
    await page.goto('/');
    await expect(page.locator('iframe')).toHaveAttribute('title', 'Tidepool');
    await expect(page.getByText('Failed to record visit.')).toBeVisible();
  });

  test('follows links inside the isolated frame and restores scroll on return', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    const publishedFrame = page.locator('iframe').contentFrame().locator('iframe').contentFrame();
    await expect(publishedFrame.getByRole('heading', { name: 'Tidepool' })).toBeVisible();
    await publishedFrame.locator('body').evaluate(() => window.scrollTo(0, 500));
    await expect.poll(() => publishedFrame.locator('body').evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await publishedFrame.getByRole('link', { name: 'Beacon' }).click();
    await expect(page.locator('iframe')).toHaveAttribute('title', 'Beacon');
    await page.getByRole('button', { name: '←' }).click();
    await expect(page.locator('iframe')).toHaveAttribute('title', 'Tidepool');
    const restoredFrame = page.locator('iframe').contentFrame().locator('iframe').contentFrame();
    await expect.poll(() => restoredFrame.locator('body').evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
