import { chromium, webkit, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { products } from "../src/data.js";
for (const [engine, options, label] of [
  [chromium, { viewport: { width: 1440, height: 1000 } }, "desktop"],
  [
    webkit,
    { ...devices["iPhone 13 Pro Max"], viewport: { width: 440, height: 956 } },
    "iphone-webkit",
  ],
]) {
  const browser = await engine.launch({
    headless: true,
    ...(engine === chromium ? { channel: "chrome" } : {}),
  });
  try {
    const context = await browser.newContext(options);
    await context.addInitScript(() =>
      localStorage.setItem(
        "wolf-consent-v1",
        JSON.stringify({ version: 1, optional: false, time: Date.now() }),
      ),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:5173/");
    await page.locator(".origin-emblem").waitFor({ state: "attached" });
    await page.setViewportSize({
      width: options.viewport.width,
      height: options.viewport.height - 56,
    });
    await page.waitForTimeout(150);
    assert.notEqual(
      await page.evaluate(() => window.__wolfOrigin.phase),
      "settled",
      "Height-only viewport resize must not cancel entrance",
    );
    await page
      .locator(".origin-entrance")
      .waitFor({ state: "detached", timeout: 8000 });
    await page.locator(".brand-marquee").scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.querySelectorAll(".brand-marquee img")].map((i) =>
          i.decode(),
        ),
      );
    });
    assert.ok(
      await page
        .locator(".brand-marquee .official-brand img")
        .evaluateAll((images) =>
          images.every((i) => i.src.endsWith(".svg") && i.naturalWidth > 0),
        ),
    );
    await page
      .locator(".brand-marquee")
      .screenshot({ path: `artifacts/brand-strip-${label}.png` });
    await page.evaluate(() =>
      window.scrollTo({ top: 1300, behavior: "instant" }),
    );
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => scrollY);
    await page.route("**/api/catalog", (route) =>
      route.fulfill({
        json: {
          products: products.map((p, i) =>
            i === 0 ? { ...p, price: p.price + 1 } : p,
          ),
        },
      }),
    );
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/api/catalog"),
    );
    await page.evaluate(() => dispatchEvent(new Event("focus")));
    await response;
    await page.waitForTimeout(300);
    assert.ok(
      Math.abs((await page.evaluate(() => scrollY)) - before) < 2,
      "Focus/catalog refresh must retain scroll position",
    );
    await page.goto("http://localhost:5173/shop");
    if (await page.locator(".origin-entrance").count())
      await page.keyboard.press("Escape");
    await page.locator(".shop-products").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const fontSale = await page
      .locator('.product-card[data-sale="true"] .product-name')
      .first()
      .evaluate((e) => getComputedStyle(e).fontFamily);
    const fontNormal = await page
      .locator(".product-card:not([data-sale]) .product-name")
      .first()
      .evaluate((e) => getComputedStyle(e).fontFamily);
    assert.match(fontSale, /Wolf Product Helvetica Text/);
    assert.match(fontNormal, /Satoshi/);
    assert.match(
      await page
        .locator(".page-intro h1")
        .evaluate((e) => getComputedStyle(e).fontFamily),
      /Cabinet Grotesk/,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: `artifacts/sale-type-${label}.png` });
    assert.deepEqual(errors, []);
    console.log(
      `${label}: entrance survives toolbar resize; focus refresh keeps scroll; vector logos load; Helvetica limited to sale cards.`,
    );
  } finally {
    await browser.close();
  }
}
