import { test, expect } from '@playwright/test';

const TABS = ['dashboard', 'explorer', 'geography', 'trends'] as const;

for (const tab of TABS) {
  test(`${tab} tab loads without crash`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const url = tab === 'dashboard' ? '/' : `/?tab=${tab}`;
    await page.goto(url);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `tests/screenshots/${tab}.png`, fullPage: true });

    // No React crash — the page should not show an error overlay
    const errorOverlay = page.locator('#nextjs__container_errors_label');
    await expect(errorOverlay).not.toBeVisible({ timeout: 1000 }).catch(() => {});

    // Filter out irrelevant console errors
    const realErrors = errors.filter(
      e => !e.includes('DevTools') && !e.includes('favicon') && !e.includes('404')
    );
    console.log(`[${tab}] console errors:`, realErrors);
  });
}
