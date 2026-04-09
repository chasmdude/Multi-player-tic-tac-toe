# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tictactoe.spec.ts >> should show marks after clicking
- Location: e2e/tictactoe.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test } from '@playwright/test';
  2  | 
  3  | test('should show marks after clicking', async ({ browser }) => {
  4  |   const page = await browser.newPage();
  5  |   
  6  |   page.on('console', msg => console.log('LOG:', msg.text()));
  7  |   
> 8  |   await page.goto('http://localhost:5173');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  9  |   await page.waitForLoadState('networkidle');
  10 |   await page.waitForTimeout(5000);
  11 |   
  12 |   const btn = page.locator('button').nth(0);
  13 |   await btn.click();
  14 |   
  15 |   // Wait and force update
  16 |   await page.waitForTimeout(1000);
  17 |   
  18 |   // Get innerHTML instead of textContent
  19 |   const html = await btn.innerHTML();
  20 |   console.log('Button innerHTML:', html);
  21 |   
  22 |   // Get the div inside the button
  23 |   const span = btn.locator('span');
  24 |   const spanCount = await span.count();
  25 |   console.log('Span count inside button:', spanCount);
  26 |   
  27 |   if (spanCount > 0) {
  28 |     const spanText = await span.textContent();
  29 |     console.log('Span text:', spanText);
  30 |   }
  31 |   
  32 |   await page.close();
  33 | });
```