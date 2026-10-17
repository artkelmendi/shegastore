import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
for (const [width, height] of [
  [1024, 768],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
]) {
  await page.setViewportSize({ width, height });
  await page.goto("http://localhost:5173/");
  await page.locator(".opening").waitFor({ state: "hidden", timeout: 8000 });
  await page.waitForTimeout(500);
  const boxes = await page.evaluate(() => {
    const button = document
      .querySelector(".hero .button")
      .getBoundingClientRect();
    const controls = document
      .querySelector(".hero-pagination")
      .getBoundingClientRect();
    return { button: button.bottom, controls: controls.top };
  });
  assert.ok(
    boxes.controls - boxes.button >= 20,
    `${width} overlap ${JSON.stringify(boxes)}`,
  );
  await page.screenshot({ path: `artifacts/fixed-hero-${width}.png` });
}
await page.locator(".favorites-section").scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const canvas = page.locator("canvas.background-marks");
assert.equal(await canvas.count(), 1);
assert.ok(
  await canvas.evaluate((el) => {
    const d = el.getContext("2d").getImageData(0, 0, el.width, el.height).data;
    return d.some((v, i) => i % 4 === 3 && v > 0);
  }),
  "background rendered",
);
await browser.close();
console.log(
  "Hero CTA/control separation passes at four desktop sizes; watery canvas renders.",
);
