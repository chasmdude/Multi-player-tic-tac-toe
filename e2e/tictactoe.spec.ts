import { test } from '@playwright/test';

test('should show marks after clicking', async ({ browser }) => {
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  const btn = page.locator('button').nth(0);
  await btn.click();
  
  // Wait and force update
  await page.waitForTimeout(1000);
  
  // Get innerHTML instead of textContent
  const html = await btn.innerHTML();
  console.log('Button innerHTML:', html);
  
  // Get the div inside the button
  const span = btn.locator('span');
  const spanCount = await span.count();
  console.log('Span count inside button:', spanCount);
  
  if (spanCount > 0) {
    const spanText = await span.textContent();
    console.log('Span text:', spanText);
  }
  
  await page.close();
});