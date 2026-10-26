import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
const base =
  process.env.WOLF_PREVIEW_URL ||
  process.env.SHEGA_PREVIEW_URL ||
  "http://127.0.0.1:4188/";
if (!process.env.WOLF_PREVIEW_URL) {
  const assets = await readdir("dist/assets");
  assert(!assets.some((name) => /StaticAdmin|AdminApp/.test(name)));
  for (const route of ["admin", "admin/products", "login"])
    await assert.rejects(readFile(`dist/${route}/index.html`));
}
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch(
    engine === chromium ? { channel: "chrome" } : {},
  );
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem(
        "wolf-consent-v1",
        JSON.stringify({ version: 1, optional: false, time: Date.now() }),
      ),
    );
    async function visit(route) {
      await page.goto(new URL(route, base).href);
      await expect(page.locator("h1").first()).toBeVisible();
      if (await page.locator(".origin-entrance").count())
        await page.keyboard.press("Escape");
    }
    async function noPrices() {
      const text = await page.locator("body").innerText();
      assert(!/[€£$]\s*\d|\d\s*[€£$]|Subtotal/.test(text), text);
      assert(!text.includes("wolfshop.ks"));
    }
    await visit("shop/");
    await expect(page.locator(".product-card")).toHaveCount(6);
    await noPrices();
    assert.equal(
      await page
        .getByLabel("Sort products")
        .locator("option")
        .filter({ hasText: "Price:" })
        .count(),
      0,
    );
    const links = page.locator('a[href*="instagram.com"]');
    assert((await links.count()) > 0);
    for (const link of await links.all())
      await expect(link).toHaveAttribute(
        "href",
        "https://www.instagram.com/wolfshop.style/",
      );
    await visit("product/armani-exchange-black-tshirt/");
    await expect(page.locator(".detail-price")).toContainText(
      "Price on request",
    );
    await noPrices();
    await page
      .locator(".size-options")
      .getByRole("button", { name: "M", exact: true })
      .click();
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await expect(page.locator(".bag-summary")).toContainText(
      "Ask on Instagram",
    );
    await noPrices();
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await expect(page.locator("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Search the store", exact: true })
      .click();
    await page.getByLabel("Search products", { exact: true }).fill("Armani");
    await expect(page.locator(".search-results")).toContainText(
      "Ask for price",
    );
    await noPrices();
    for (const route of [
      "admin/",
      "admin/products/",
      "admin/stock/",
      "login/",
    ]) {
      await visit(route);
      await expect(page.locator("h1")).toHaveText("Page not found.");
      await expect(
        page.locator(
          ".workspace-sidebar,.workspace-content,.workspace-login-form",
        ),
      ).toHaveCount(0);
    }
    assert.deepEqual(errors, []);
    console.log(
      `${engine === chromium ? "Chrome" : "WebKit"}: new Instagram links, no public prices/totals, no price sorting and blocked staff routes passed.`,
    );
  } finally {
    await browser.close();
  }
}
