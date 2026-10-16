import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.locator(".intro").waitFor({ state: "hidden" });
await page.waitForTimeout(700);
await page.screenshot({
  path: fileURLToPath(
    new URL("../artifacts/white-desktop-home.png", import.meta.url),
  ),
});
console.log("hero", await page.locator(".hero-title").innerText());
console.log(
  "logos",
  await page
    .locator(".brand-marquee img")
    .evaluateAll((imgs) =>
      imgs.map((img) => ({
        src: img.getAttribute("src"),
        loaded: img.naturalWidth > 0,
      })),
    ),
);
for (const width of [320, 375, 390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of [
    "/",
    "/shop",
    "/product/boss-signature-hoodie",
    "/brands",
  ]) {
    await page.goto("http://localhost:5173" + route, {
      waitUntil: "networkidle",
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      `Overflow ${width} ${route}`,
    );
    assert.equal(
      await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.some((i) => i.complete && i.naturalWidth === 0),
        ),
      false,
      `Broken image ${route}`,
    );
    if (width === 390 && route === "/") {
      await page.waitForTimeout(900);
      await page.screenshot({
        path: fileURLToPath(
          new URL("../artifacts/white-mobile-home.png", import.meta.url),
        ),
        fullPage: true,
      });
    }
    if (width === 1440 && route === "/shop") {
      await page.waitForTimeout(900);
      await page.screenshot({
        path: fileURLToPath(
          new URL("../artifacts/white-desktop-shop.png", import.meta.url),
        ),
      });
    }
    if (width === 1440 && route === "/product/boss-signature-hoodie") {
      await page.waitForTimeout(900);
      await page.screenshot({
        path: fileURLToPath(
          new URL("../artifacts/white-desktop-product.png", import.meta.url),
        ),
      });
    }
  }
}
assert.deepEqual(errors, []);
console.log(
  "White design: six viewport widths, real images and all catalogue routes passed.",
);
await browser.close();
