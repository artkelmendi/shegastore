import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const width of [1440, 768, 390, 320]) {
  const page = await browser.newPage({ viewport: { width, height: 950 } });
  await page.goto("http://localhost:5173/shop");
  await page.locator(".opening").waitFor({ state: "hidden", timeout: 8000 });
  await page.waitForTimeout(900);
  await page
    .getByRole("button", { name: "Reject optional", exact: true })
    .click();
  await page.locator(".cookie-panel").waitFor({ state: "hidden" });
  assert.equal(
    await page.locator(".shop-page h1").innerText(),
    "The collection",
  );
  assert.match(
    await page
      .locator(".shop-page h1")
      .evaluate((el) => getComputedStyle(el).fontFamily),
    /Cabinet/,
  );
  assert.match(
    await page
      .locator(".shop-tabs button")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily),
    /Satoshi/,
  );
  assert.match(
    await page
      .locator(".product-name")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily),
    /Satoshi/,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  if (width < 768)
    assert.equal(
      await page
        .locator(".product-grid")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
      2,
    );
  await page.screenshot({ path: `artifacts/shop-updated-${width}.png` });
  await page.getByRole("button", { name: "Hoodies", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Brand", { exact: true }).selectOption("DIESEL");
  await page.getByRole("heading", { name: "NOTHING HERE. YET." }).waitFor();
  await page
    .getByRole("button", { name: "View all pieces", exact: true })
    .click();
  await expect(page.locator(".product-card")).toHaveCount(8);
  await page.getByLabel("Sort products").selectOption("price-asc");
  assert.match(await page.locator(".product-card").first().innerText(), /€45/);
  await page.close();
}
await browser.close();
console.log(
  "Shop typography, two-column mobile layout, filters, empty state and sorting passed at four widths.",
);
