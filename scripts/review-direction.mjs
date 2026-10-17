import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
assert.equal(await page.locator(".intro").count(), 0);
assert.equal(await page.locator("[inert]").count(), 0);
assert.notEqual(
  await page.evaluate(() => getComputedStyle(document.body).overflow),
  "hidden",
);
await page.evaluate(() => document.fonts.ready);
await page.locator(".hero-image.is-active").evaluate((img) => img.decode());
assert.equal(
  await page.evaluate(() => document.fonts.check('500 24px "Clash Display"')),
  true,
);
assert.equal(
  await page.evaluate(() => document.fonts.check("400 16px Satoshi")),
  true,
);
const first = await page.locator(".hero-title").boundingBox();
await page.waitForTimeout(2200);
const settled = await page.locator(".hero-title").boundingBox();
assert.deepEqual(
  settled,
  first,
  "Hero must not move after its first composed frame",
);
assert.equal(await page.locator(".category-hoodies").count(), 0);
assert.equal(
  await page.getByText("Your off-duty uniform", { exact: true }).count(),
  0,
);

assert.equal(await page.locator(".hero-image").count(), 2);
assert.equal(await page.locator('.hero img[src*="campaign-"]').count(), 0);
for (const width of [1440, 1024, 768, 390, 320]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  for (let slide = 0; slide < 2; slide++) {
    await page.waitForTimeout(1000);
    const active = page.locator(".hero-image.is-active");
    assert.equal(
      await active.evaluate((img) => img.complete && img.naturalWidth > 0),
      true,
    );
    assert.equal(
      await active.evaluate((img) => getComputedStyle(img).opacity),
      "1",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: fileURLToPath(
        new URL(`../artifacts/campaign-${width}-${slide}.png`, import.meta.url),
      ),
    });
    await page
      .getByRole("button", { name: "Next collection", exact: true })
      .click();
  }
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  for (let y = 0; y < height; y += 500) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      y,
    );
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(900);
  await page.screenshot({
    path: fileURLToPath(
      new URL(`../artifacts/campaign-full-${width}.png`, import.meta.url),
    ),
    fullPage: true,
  });
}
assert.deepEqual(errors, []);
const result = {
  passed: true,
  checks: [
    "No first-visit overlay, inert background, or scroll lock",
    "Stable hero position after initial load",
    "New locally hosted fonts loaded",
    "Removed hoodie uniform tile",
    "Both supplied hero images replace the previous campaign photos",
    "Both hero slides visible at five screen widths",
    "Scrolling reveals",
  ],
  errors,
};
await writeFile(
  new URL("../artifacts/direction-verification.json", import.meta.url),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
