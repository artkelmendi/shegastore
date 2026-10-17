import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { products } from "../src/data.js";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      hasTouch: true,
    });
    await context.addInitScript((theme) => {
      localStorage.setItem("wolf-theme", theme);
      localStorage.setItem(
        "wolf-consent-v1",
        JSON.stringify({ version: 1, optional: false, time: Date.now() }),
      );
    }, theme);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [320, 390, 430, 767, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://localhost:5173/");
      await page.evaluate(() => document.fonts.ready);
      const hero = await page.locator(".hero").boundingBox();
      assert.ok(hero.height <= (width < 768 ? 351 : 611), "Compact hero");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Home overflow ${width}`,
      );
      if (width < 768) {
        const favorites = await page.locator(".favorites-window").boundingBox();
        const categories = await page.locator(".category-section").boundingBox();
        assert.ok(categories.y < 650, "Categories appear directly after the compact hero");
        assert.ok(categories.y < favorites.y, "Categories precede favorites");
        const cards = await page
          .locator(".favorites-group")
          .first()
          .locator(".product-card")
          .evaluateAll((cards) =>
            cards.slice(0, 2).map((c) => c.getBoundingClientRect().width),
          );
        assert.ok(
          cards[0] > 130 && cards[0] * 2 <= favorites.width,
          "Two comfortably sized favorites",
        );
        await page
          .getByRole("button", { name: "Next collection", exact: true })
          .click();
        await page.waitForTimeout(350);
        const cta = await page
          .getByRole("link", { name: "Shop now", exact: true })
          .boundingBox();
        const controls = await page.locator(".hero-pagination").boundingBox();
        assert.ok(
          cta.y + cta.height <= controls.y,
          `Hero CTA overlaps controls at ${width}`,
        );
      }
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: `artifacts/compact-home-${theme}-${width}.png`,
        });
      await page.goto("http://localhost:5173/shop");
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Shop overflow ${width}`,
      );
      if (width < 768) {
        const photos = await page
          .locator(".shop-products .product-image-wrap")
          .evaluateAll((items) =>
            items.slice(0, 2).map((e) => {
              const r = e.getBoundingClientRect();
              return { top: r.top, x: r.x, width: r.width };
            }),
          );
        assert.ok(photos[0].top < 350, "Shop products appear early");
        const sortControl = await page.locator(".sort-select").boundingBox();
        assert.ok(
          sortControl.width > 120,
          "Sort control remains readable on touch screens",
        );
        assert.ok(
          Math.abs(photos[0].top - photos[1].top) < 1,
          "Two aligned columns",
        );
        await page
          .getByRole("button", { name: "T-Shirts", exact: true })
          .click();
        await expect(page.locator(".shop-products .product-card")).toHaveCount(
          products.filter((p) => p.category === "T-Shirts").length,
        );
        await page.getByRole("button", { name: /^Filters/ }).click();
        await page.getByLabel("Brand", { exact: true }).selectOption("DIESEL");
        await expect(page.locator(".shop-products .product-card")).toHaveCount(
          products.filter(
            (p) => p.category === "T-Shirts" && p.brand === "DIESEL",
          ).length,
        );
        await page.getByLabel("Sort products").selectOption("price-asc");
        const save = page.locator(".shop-products .product-save").first();
        const before = await save.getAttribute("aria-pressed");
        await save.click();
        await expect(save).toHaveAttribute(
          "aria-pressed",
          before === "true" ? "false" : "true",
        );
        await page
          .getByRole("button", { name: "Clear filters", exact: false })
          .click();
        await expect(page.locator(".shop-products .product-card")).toHaveCount(
          products.length,
        );
        await page.getByRole("button", { name: /^Filters/ }).click();
      }
      if ([320, 390].includes(width))
        await page.screenshot({
          path: `artifacts/compact-shop-${theme}-${width}.png`,
        });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Compact browsing passed: five widths, both themes, early two-column products, hero slides, categories, brand filters, sorting and saving.",
  );
} finally {
  await browser.close();
}
