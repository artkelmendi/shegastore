import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const base =
  process.env.SHEGA_PREVIEW_URL || "http://127.0.0.1:4175/shegastore/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [],
  apiCalls = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (req) => {
  if (new URL(req.url()).pathname.startsWith("/api")) apiCalls.push(req.url());
});
try {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "admin/",
      "admin/products/",
      "admin/stock/",
      "admin/activity/",
      "admin/products/armani-essential-tee",
      "login/",
    ]) {
      await page.goto(new URL(route, base).href);
      await expect(
        page.locator(".workspace-content h1,.workspace-login-form h2"),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("input[type=password]").count(), 0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${route} at ${width} overflows`,
      );
      if (width === 1440 && route === "admin/")
        await page.screenshot({
          path: "artifacts/static-admin-1440.png",
          fullPage: true,
        });
    }
  }
  await page.goto(new URL("admin/products/", base).href);
  await page.getByLabel("Search products").fill("DIESEL");
  assert.equal(await page.locator(".workspace-table tbody tr").count(), 4);
  await page.goto(new URL("account/create/", base).href);
  await expect(
    page.getByText(
      "Customer sign-in is not available on this static preview.",
      { exact: false },
    ),
  ).toBeVisible();
  assert.equal(await page.locator("input[type=password]").count(), 0);
  await page.goto(base);
  await expect(page.locator(".hero-title")).toBeVisible();
  assert.deepEqual(apiCalls, []);
  assert.deepEqual(errors, []);
  console.log(
    "Static deployment passed: storefront, direct admin routes, catalogue search, 3 viewport widths, no authentication forms or API calls.",
  );
} finally {
  await browser.close();
}
