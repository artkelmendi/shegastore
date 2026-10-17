import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const bad = [];
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) bad.push(r.url());
});
const origin =
  process.env.SHEGA_PREVIEW_URL || "http://localhost:4173/shegastore/";
for (const width of [1440, 390, 320]) {
  await page.setViewportSize({ width, height: 950 });
  await page.goto(origin);
  await page
    .locator(".opening, .origin-entrance")
    .waitFor({ state: "hidden", timeout: 8000 });
  await page.waitForTimeout(700);
  assert.equal(await page.locator("canvas.background-marks").count(), 1);
  assert.equal(await page.locator(".hero canvas").count(), 0);
  assert.equal(await page.locator(".category-hoodies").count(), 1);
  assert.equal(
    await page.locator(".editorial-photo img").getAttribute("src"),
    new URL("images/real/shega-boss-editorial.webp", origin).pathname,
  );
  assert.equal(
    await page.locator(".hero-title").innerText(),
    "Dress Like\nyourself.",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    `overflow ${width}`,
  );
  await page.screenshot({ path: `artifacts/latest-hero-${width}.png` });
  await page.locator(".favorites-section").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const sizes = await page.locator(".favorites-window").evaluate((el) => ({
    width: el.clientWidth,
    card: el.querySelector(".product-card").getBoundingClientRect().width,
  }));
  if (width < 768)
    assert.ok(sizes.width >= sizes.card * 2 + 12, JSON.stringify(sizes));
  const track = page.locator(".favorites-track");
  const first = await track.evaluate((el) => getComputedStyle(el).transform);
  await page.locator(".favorites-window").hover();
  await page.waitForTimeout(1000);
  assert.notEqual(
    await track.evaluate((el) => getComputedStyle(el).transform),
    first,
  );
  assert.equal(
    await track.evaluate((el) => getComputedStyle(el).animationPlayState),
    "running",
  );
  assert.equal(
    await page
      .locator("body")
      .evaluate((el) => /\p{Emoji_Presentation}/u.test(el.innerText)),
    false,
    "emoji",
  );
  await page.screenshot({ path: `artifacts/latest-favorites-${width}.png` });
}
for (const route of [
  "faq/",
  "shop/?category=Hoodies",
  "contact/",
  "product/boss-signature-hoodie/",
]) {
  await page.goto(new URL(route, origin).href);
  await page
    .locator(".opening, .origin-entrance")
    .waitFor({ state: "hidden", timeout: 8000 });
  assert.equal(await page.locator(".not-found").count(), 0);
  assert.ok(await page.locator("h1").innerText());
}
assert.deepEqual(errors, []);
assert.deepEqual(bad, []);
console.log(
  "Passed: 3 widths, two mobile cards, continuous hover motion, no emoji, image, hero marks, nested routes, assets and runtime.",
);
await browser.close();
