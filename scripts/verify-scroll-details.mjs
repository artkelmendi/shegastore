import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base =
  process.env.SHEGA_PREVIEW_URL || "http://localhost:4173/shegastore/";
for (const [width, reduced] of [
  [1440, false],
  [390, false],
  [390, true],
]) {
  const p = await browser.newPage({
    viewport: { width, height: 950 },
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() =>
    localStorage.setItem(
      "shega-consent-v1",
      JSON.stringify({ version: 1, optional: false, time: Date.now() }),
    ),
  );
  await p.goto(base);
  await p
    .locator(".origin-entrance,.opening")
    .waitFor({ state: "hidden", timeout: 8000 });
  await p.locator(".brand-marquee").scrollIntoViewIfNeeded();
  await p.waitForTimeout(250);
  const matrices = () =>
    p
      .locator(".brand-band-divider img")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  const before = await matrices();
  const pixels = await p
    .locator("canvas.background-marks")
    .evaluate((el) => el.toDataURL());
  const position = await p
    .locator(".category-section")
    .evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await p.mouse.wheel(0, 160);
  await p.waitForTimeout(700);
  const after = await matrices();
  const pixelsAfter = await p
    .locator("canvas.background-marks")
    .evaluate((el) => el.toDataURL());
  if (reduced) {
    assert.ok(after.every((s) => s === "none"));
    assert.equal(pixels, pixelsAfter);
  } else {
    assert.notDeepEqual(after, before, "decorative marks respond to scrolling");
    assert.notEqual(pixels, pixelsAfter, "background remains animated");
  }
  assert.ok(
    Math.abs(
      (await p
        .locator(".category-section")
        .evaluate((el) => el.getBoundingClientRect().top + scrollY)) - position,
    ) < 0.2,
    "scroll details do not shift layout",
  );
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  assert.deepEqual(errors, []);
  await p.close();
}
await browser.close();
console.log(
  "Passed: decorative scroll motion, stable content layout, desktop/mobile and static reduced-motion canvas/marks.",
);
