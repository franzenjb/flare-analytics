import { test } from '@playwright/test';

test('dashboard with CA state selected', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(5000);

  // Select CA state
  const stateSelect = page.locator('select[aria-label="Filter by State"]');
  await stateSelect.selectOption('CA');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/state-ca-dashboard.png', fullPage: true });

  // Switch to Data Explorer
  await page.click('button:has-text("Data Explorer")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/screenshots/state-ca-explorer.png', fullPage: true });
});
