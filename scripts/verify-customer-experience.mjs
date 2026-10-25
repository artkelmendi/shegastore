import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { products } from "../src/data.js";
const base = process.env.WOLF_PREVIEW_URL || "http://127.0.0.1:5173/";
for (const [engine, width, theme] of [
  [chromium, 1440, "light"],
  [webkit, 390, "dark"],
  [webkit, 320, "light"],
]) {
  const browser = await engine.launch(
    engine === chromium ? { channel: "chrome" } : {},
  );
  try {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript((theme) => {
      localStorage.setItem("wolf-theme", theme);
      localStorage.setItem(
        "wolf-consent-v1",
        JSON.stringify({ version: 1, optional: false, time: Date.now() }),
      );
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text) => {
            if (window.__denyClipboard) throw Error("clipboard unavailable");
            window.__copied = text;
          },
        },
      });
    }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Isolated catalogue response; real inventory and customer data are never changed.
    await page.route("**/api/catalog", (route) =>
      route.fulfill({
        json: {
          products: products.map((p) =>
            p.id === "boss-black-zip-knit"
              ? { ...p, stock: { M: { tracked: true, available: 0 } } }
              : p,
          ),
        },
      }),
    );
    async function visit(path) {
      await page.goto(new URL(path, base).href);
      await expect(page.locator("h1").first()).toBeVisible();
      if (await page.locator(".origin-entrance").count())
        await page.keyboard.press("Escape");
    }
    async function noOverflow(label) {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        label + " overflows",
      );
    }
    await visit("shop");
    await expect(page.locator(".product-card")).toHaveCount(6);
    await expect(page.locator(".desktop-nav")).not.toContainText("Sale");
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByLabel("Listed size", { exact: true }).selectOption("M");
    await expect(page.locator(".product-card")).toHaveCount(5);
    await expect(page.locator(".size-availability-note")).toContainText(
      "not a live stock guarantee",
    );
    await noOverflow("Shop filters");
    await page.getByRole("button", { name: "Size M", exact: true }).click();
    await expect(page.locator(".product-card")).toHaveCount(6);
    await page.getByLabel("Brand", { exact: true }).selectOption("DIESEL");
    await expect(page.locator(".results-count")).toHaveText("1 style");
    await page.screenshot({
      path: `../outputs/customer-pass-shop-${width}-${theme}.png`,
      fullPage: true,
    });
    await visit("shop?size=XXXS");
    await expect(
      page.getByText("No pieces match those choices.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "View all pieces", exact: true })
      .click();
    await expect(page.locator(".product-card")).toHaveCount(6);
    await visit("product/armani-exchange-black-tshirt");
    await page
      .getByRole("button", { name: "Size & fit help", exact: true })
      .click();
    await expect(page.locator(".fit-help")).toContainText(
      "flat garment measurements",
    );
    await expect(page.locator(".size-guide table")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await expect(page.locator("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Choose Off-white", exact: true })
      .click();
    await page
      .locator(".size-options")
      .getByRole("button", { name: "M", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Copy product details", exact: true })
      .click();
    assert(
      (await page.evaluate(() => window.__copied)).includes(
        "Colour: Off-white | Size: M",
      ),
    );
    await expect(
      page.getByRole("button", {
        name: "Copied — paste into Instagram",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".customer-enquiry a")).toHaveAttribute(
      "href",
      "https://www.instagram.com/wolfshop.ks/",
    );
    await page.screenshot({
      path: `../outputs/customer-pass-product-${width}-${theme}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await expect(page.locator("dialog .bag-item-size")).toContainText(
      "Off-white / Size M",
    );
    await page
      .getByRole("button", { name: "Copy bag details", exact: true })
      .click();
    assert(
      (await page.evaluate(() => window.__copied)).includes("Quantity: 1"),
    );
    await noOverflow("Bag");
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await expect(page.locator("dialog")).toHaveCount(0);
    await page.evaluate(() => (window.__denyClipboard = true));
    await page
      .getByRole("button", {
        name: "Copied — paste into Instagram",
        exact: true,
      })
      .click();
    await expect(page.locator(".manual-enquiry textarea")).toContainText(
      "Colour: Off-white | Size: M",
    );
    await noOverflow("Product and manual copy");
    await visit("product/boss-blue-tracksuit");
    await page
      .getByRole("button", { name: "Size & fit help", exact: true })
      .click();
    await expect(page.locator(".fit-help")).toContainText(
      "Check the trousers too.",
    );
    assert.deepEqual(errors, []);
    console.log(
      `Customer pass: ${engine === chromium ? "Chrome" : "WebKit"} ${width}px ${theme}, size/stock filters, empty recovery, accurate colour enquiry, clipboard fallback, bag and fit help passed.`,
    );
  } finally {
    await browser.close();
  }
}
