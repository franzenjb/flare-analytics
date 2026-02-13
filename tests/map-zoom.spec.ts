import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3847';

test('choropleth zooms when chapter filter applied', async ({ page }) => {
  await page.goto(`${BASE}/?tab=geography`);
  await page.waitForSelector('[aria-label="Filter by Chapter"]', { timeout: 15000 });

  // Screenshot before filter
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/screenshots/geo-choropleth-national.png', fullPage: false });

  // Apply chapter filter
  await page.selectOption('[aria-label="Filter by Chapter"]', { index: 1 });
  await page.waitForTimeout(1000);

  // Screenshot after filter — should be zoomed in
  await page.screenshot({ path: 'tests/screenshots/geo-choropleth-filtered.png', fullPage: false });
});

test('point map zooms when chapter filter applied', async ({ page }) => {
  await page.goto(`${BASE}/?tab=geography`);
  await page.waitForSelector('[aria-label="Filter by Chapter"]', { timeout: 15000 });

  // Switch to point map
  await page.click('text=Point Map');
  await page.waitForTimeout(3000); // Wait for points to load + map to render

  // Screenshot before filter
  await page.screenshot({ path: 'tests/screenshots/geo-points-national.png', fullPage: false });

  // Apply chapter filter
  await page.selectOption('[aria-label="Filter by Chapter"]', { index: 1 });
  await page.waitForTimeout(2000); // Wait for flyTo animation

  // Screenshot after filter — should be zoomed in
  await page.screenshot({ path: 'tests/screenshots/geo-points-filtered.png', fullPage: false });
});

test('county filter works on point map', async ({ page }) => {
  await page.goto(`${BASE}/?tab=geography`);
  await page.waitForSelector('[aria-label="Filter by County"]', { timeout: 15000 });

  // Switch to point map
  await page.click('text=Point Map');
  await page.waitForTimeout(3000);

  // Select Cook County via searchable dropdown
  await page.click('[aria-label="Filter by County"] button');
  await page.fill('input[placeholder="Search counties..."]', 'Cook');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Cook, IL")');
  await page.waitForTimeout(2500); // Wait for stations to load + zoom

  await page.screenshot({ path: 'tests/screenshots/geo-points-county.png', fullPage: false });
});
