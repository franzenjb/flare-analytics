import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3847';

test('report route loads chapter report', async ({ page }) => {
  await page.goto(`${BASE}/report?chapter=ARC+of+Greater+Chicago`);
  // Wait for report to render
  await page.waitForSelector('h1', { timeout: 15000 });
  const h1 = await page.textContent('h1');
  expect(h1).toContain('Chicago');
  // Check for key sections
  await expect(page.locator('text=Executive Summary')).toBeVisible();
  await expect(page.locator('text=Fire Response Performance')).toBeVisible();
  await expect(page.locator('text=Print / Save PDF')).toBeVisible();
  // Screenshot
  await page.screenshot({ path: 'tests/screenshots/report-chapter.png', fullPage: true });
});

test('report route loads county report', async ({ page }) => {
  await page.goto(`${BASE}/report?county=17031`); // Cook County, IL
  await page.waitForSelector('h1', { timeout: 15000 });
  const h1 = await page.textContent('h1');
  expect(h1).toContain('Cook');
  await expect(page.locator('text=Executive Summary')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/report-county.png', fullPage: true });
});

test('report route shows error for missing entity', async ({ page }) => {
  await page.goto(`${BASE}/report?chapter=NonExistentChapter`);
  await page.waitForSelector('text=Report Not Found', { timeout: 15000 });
  await expect(page.locator('text=Back to Dashboard')).toBeVisible();
});

test('report route shows help when no params', async ({ page }) => {
  await page.goto(`${BASE}/report`);
  await page.waitForSelector('text=Select a division', { timeout: 15000 });
});

test('county filter appears as searchable dropdown', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForSelector('[aria-label="Filter by County"]', { timeout: 15000 });
  const countyDropdown = page.locator('[aria-label="Filter by County"]');
  await expect(countyDropdown).toBeVisible();
  // Should show "All Counties" as placeholder
  await expect(countyDropdown.locator('button').first()).toContainText('All Counties');
  // Click to open search
  await countyDropdown.locator('button').first().click();
  await expect(page.locator('input[placeholder="Search counties..."]')).toBeVisible();
  // Type a search query
  await page.fill('input[placeholder="Search counties..."]', 'Cook');
  await page.waitForTimeout(300);
  // Should find Cook County
  await expect(page.locator('button:has-text("Cook, IL")')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/county-search.png', fullPage: false });
  // Select it
  await page.locator('button:has-text("Cook, IL")').click();
  // Dropdown should close, chip should appear
  await expect(page.locator('text=Cook, IL').first()).toBeVisible();
});

test('report button opens in new tab', async ({ page }) => {
  // Navigate to dashboard with a chapter selected
  await page.goto(BASE);
  await page.waitForSelector('[aria-label="Filter by Chapter"]', { timeout: 15000 });
  // Select a chapter
  await page.selectOption('[aria-label="Filter by Chapter"]', { index: 1 });
  await page.waitForTimeout(1000);
  // Check report button is a link with target=_blank
  const reportLink = page.locator('a:has-text("Generate Chapter Report")');
  if (await reportLink.count() > 0) {
    const target = await reportLink.getAttribute('target');
    expect(target).toBe('_blank');
    const href = await reportLink.getAttribute('href');
    expect(href).toContain('/report?chapter=');
  }
  await page.screenshot({ path: 'tests/screenshots/dashboard-with-report-button.png', fullPage: false });
});
