import { webkit, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { products, categories, brands } from "../src/data.js";
import { uniqueStyles } from "../src/colorways.js";
const base =
  process.env.WOLF_PREVIEW_URL || "http://127.0.0.1:4175/shegastore/";
const browser = await webkit.launch();
try {
  const context = await browser.newContext({
    ...devices["iPhone 13 Pro Max"],
    reducedMotion: "reduce",
  });
  await context.addInitScript(() =>
    localStorage.setItem(
      "wolf-consent-v1",
      JSON.stringify({ version: 1, optional: false, time: Date.now() }),
    ),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function visit(path) {
    await page.goto(new URL(path, base).href);
    await expect(page.locator("h1").first()).toBeVisible();
    if (await page.locator(".origin-entrance").count())
      await page.keyboard.press("Escape");
  }
  await visit("shop/");
  await expect(page.locator(".product-card")).toHaveCount(
    uniqueStyles(products).length,
  );
  for (const p of products) {
    assert(brands.includes(p.brand));
    assert(categories.includes(p.category));
    assert(p.price > 0);
    for (const key of p.gallery) {
      const response = await page.request.get(
        new URL(`images/real/${key}.webp`, base).href,
      );
      assert.equal(response.status(), 200);
      assert(response.headers()["content-type"].includes("image/"));
    }
    await visit(`product/${p.id}/`);
    await expect(page.locator("h1")).toContainText(p.name);
    assert(
      await page
        .locator(".product-page img")
        .first()
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    );
  }
  for (const c of categories.slice(1)) {
    await visit(`shop/?category=${encodeURIComponent(c)}`);
    await expect(page.locator(".product-card")).toHaveCount(
      uniqueStyles(products.filter((p) => p.category === c)).length,
    );
  }
  await visit("");
  await expect(page.locator(".category-caption h2")).toHaveText([
    "T-SHIRTS",
    "SWEATSHIRTS",
    "TRACKSUITS",
  ]);
  await expect(
    page.locator(".favorites-group").first().locator(".product-card"),
  ).toHaveCount(uniqueStyles(products).length);
  await page.screenshot({
    path: "../outputs/wolf-campaign-home-mobile.png",
    fullPage: true,
  });
  await visit("brands/");
  assert.deepEqual(errors, []);
  console.log(
    "Seven-product campaign catalog passed: 21 images, product detail pages, category filters, favorites and brand directory.",
  );
  await context.close();
} finally {
  await browser.close();
}
