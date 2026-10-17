import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("artifacts/brand-motion", { recursive: true });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.locator(".opening").waitFor({ state: "hidden" });
const replay = page.getByRole("button", { name: "Replay Shega logo drawing" });
await replay.click();
await page.waitForTimeout(160);
const drawing = await page
  .locator(".logo-drawing-outlines path")
  .first()
  .evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset));
assert.ok(
  drawing > 0 && drawing < 1,
  "The actual logo outlines are being drawn",
);
assert.equal(
  await page
    .locator(".logo-drawing-fills path")
    .first()
    .evaluate((el) => Number(getComputedStyle(el).opacity)),
  0,
);
await page.screenshot({ path: "artifacts/brand-motion/logo-drawing.png" });
await page.waitForTimeout(2500);
assert.equal(
  await page
    .locator(".logo-drawing-fills path")
    .last()
    .evaluate((el) => Number(getComputedStyle(el).opacity)),
  1,
);
await page.screenshot({ path: "artifacts/brand-motion/hero-desktop.png" });
const backdrop = page.locator(".hero-background-marks");
const before = await backdrop.evaluate((el) => el.toDataURL());
const box = await backdrop.boundingBox();
await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.18);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(250);
assert.notEqual(
  await backdrop.evaluate((el) => el.toDataURL()),
  before,
  "The canvas responds and drifts",
);
assert.equal(
  await backdrop.evaluate((el) => getComputedStyle(el).transform),
  "none",
  "No whole-logo canvas scaling",
);
assert.equal(
  await backdrop.evaluate((el) => getComputedStyle(el).pointerEvents),
  "none",
);
await page.mouse.move(0, 0);
for (const width of [1440, 1024, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    `Overflow at ${width}`,
  );
  assert.equal(
    await page
      .locator(".category-caption")
      .evaluateAll((els) =>
        els.every(
          (el) => getComputedStyle(el).backgroundColor === "rgb(206, 48, 77)",
        ),
      ),
    true,
  );
  assert.equal(
    await page
      .locator(".category-caption h2")
      .evaluateAll((els) => els.some((el) => el.scrollWidth > el.clientWidth)),
    false,
  );
  if (width === 390)
    await page.screenshot({ path: "artifacts/brand-motion/hero-mobile.png" });
}
await page.locator(".category-tees").click();
await page.waitForURL("**/shop?category=T-Shirts");
await page.locator(".shop-products").waitFor();
await page
  .getByRole("button", { name: "Search the store", exact: true })
  .click();
await page.getByRole("textbox", { name: "Search products" }).fill("diesel");
await page
  .getByRole("dialog")
  .getByRole("button", { name: /DIESEL T-Boxt distressed/ })
  .waitFor();
await page.keyboard.press("Escape");
const reduced = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
await reduced.goto("http://localhost:5173/", { waitUntil: "networkidle" });
assert.equal(await reduced.locator(".opening").count(), 0);
assert.equal(
  await reduced
    .locator(".logo-drawing-fills path")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity),
  "1",
);
const staticCanvas = await reduced
  .locator(".hero-background-marks")
  .evaluate((el) => el.toDataURL());
await reduced.waitForTimeout(300);
assert.equal(
  await reduced
    .locator(".hero-background-marks")
    .evaluate((el) => el.toDataURL()),
  staticCanvas,
  "Reduced motion keeps background marks still",
);
assert.deepEqual(errors, []);
const result = {
  passed: true,
  drawing,
  checks: [
    "Original SVG drawing and replay",
    "Slow drifting canvas and local ripple",
    "Pointer events pass through background",
    "Five viewport widths",
    "Lighter red captions",
    "Category navigation and search",
    "Reduced motion",
  ],
  errors,
};
await writeFile(
  "artifacts/brand-motion/verification.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
