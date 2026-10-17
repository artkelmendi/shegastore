import { webkit, devices, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await webkit.launch();
try {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    const context = await browser.newContext({ ...devices['iPhone 13 Pro Max'], viewport: {width:440,height:956}, reducedMotion });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/');
    const panel = page.locator('.cookie-panel');
    await expect(panel).toBeVisible({timeout:15000});
    await page.evaluate(() => {
      window.__cookieSamples = [];
      window.__sampleCookie = true;
      function sample() {
        const panel = document.querySelector('.cookie-panel');
        if (panel) {
          const style = getComputedStyle(panel), box = panel.getBoundingClientRect();
          window.__cookieSamples.push({opacity:+style.opacity,transform:style.transform,x:box.x,y:box.y});
        }
        if (window.__sampleCookie) requestAnimationFrame(sample);
      }
      sample();
    });
    await page.waitForTimeout(400);
    const samples = await page.evaluate(() => {window.__sampleCookie=false;return window.__cookieSamples;});
    assert(samples.length > 3);
    for (const sample of samples) {
      assert.equal(sample.transform, 'none');
      assert(Math.abs(sample.x-samples[0].x)<0.5 && Math.abs(sample.y-samples[0].y)<0.5);
    }
    for (let i=1;i<samples.length;i++) assert(samples[i].opacity+0.01>=samples[i-1].opacity);
    await panel.getByRole('button',{name:'Reject optional'}).click();
    await expect(panel).toHaveCount(0);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wolf-consent-v1')).optional), false);
    await page.evaluate(()=>window.dispatchEvent(new Event('wolf-cookie-settings')));
    await expect(panel).toBeVisible();
    await page.waitForTimeout(300);
    await panel.getByRole('button',{name:'Close cookie preferences'}).click();
    await expect(panel).toHaveCount(0);
    await context.close();
    console.log(`Safari cookie fade, stable placement, consent and reopen passed: ${reducedMotion}`);
  }
} finally { await browser.close(); }
