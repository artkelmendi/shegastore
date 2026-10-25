import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.WOLF_PREVIEW_URL || "http://127.0.0.1:5173/";
for (const [engine, width, motion] of [
  [chromium, 1440, "no-preference"],
  [webkit, 430, "no-preference"],
  [webkit, 320, "reduce"],
]) {
  const browser = await engine.launch(
    engine === chromium ? { channel: "chrome" } : {},
  );
  try {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: motion,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem(
        "wolf-consent-v1",
        JSON.stringify({ version: 1, optional: false, time: Date.now() }),
      );
      window.__switches = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        if (this.classList.contains("product-transition-previous"))
          window.__switches.push({ src: this.src, frames, options });
        return animate.call(this, frames, options);
      };
    });
    let releasePhoto;
    const photoGate = new Promise((resolve) => (releasePhoto = resolve));
    await page.route(
      "**/armani-exchange-off-white-tshirt/front.webp",
      async (route) => {
        await photoGate;
        await route.continue();
      },
    );
    await page.goto(base + "product/armani-exchange-black-tshirt");
    await expect(page.locator("h1")).toBeVisible();
    await page.keyboard.press("Escape");
    const frame = page.locator(".product-zoom");
    await frame.scrollIntoViewIfNeeded();
    const before = await frame.boundingBox();
    await page
      .getByRole("button", { name: "Choose Off-white", exact: true })
      .click();
    await expect(frame.locator("img").first()).toHaveAttribute(
      "src",
      /black-tshirt\/front/,
    );
    releasePhoto();
    await expect(frame.locator("img").first()).toHaveAttribute(
      "src",
      /off-white-tshirt\/front/,
    );
    await expect
      .poll(() => page.evaluate(() => window.__switches.length))
      .toBeGreaterThan(0);
    const swap = await page.evaluate(() => window.__switches[0]);
    assert.equal(swap.options.duration, motion === "reduce" ? 140 : 280);
    assert(swap.frames.every((f) => !("transform" in f)));
    await expect(frame.locator(".product-transition-previous")).toHaveCount(0);
    const after = await frame.boundingBox();
    assert(
      Math.abs(before.width - after.width) < 0.5 &&
        Math.abs(before.height - after.height) < 0.5,
    );
    await page
      .getByRole("button", { name: "View product photo 2", exact: true })
      .click();
    await expect(frame.locator("img").first()).toHaveAttribute("src", /detail/);
    await page
      .getByRole("button", { name: "Choose Black", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Choose Off-white", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Choose Black", exact: true })
      .click();
    await expect(frame.locator("img").first()).toHaveAttribute(
      "src",
      /black-tshirt\/front/,
    );
    await expect(frame.locator(".product-transition-previous")).toHaveCount(0);
    let releaseHero;
    const heroGate = new Promise((resolve) => (releaseHero = resolve));
    await page.route("**/wolf-armani-hero.webp", async (route) => {
      await heroGate;
      await route.continue();
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".hero-title")).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Next collection", exact: true })
      .click();
    await expect(page.locator(".hero-slide-name")).toHaveText("The BOSS edit");
    releaseHero();
    await expect(page.locator(".hero-slide-name")).toHaveText(
      "The Armani edit",
    );
    await expect(page.locator(".hero-image.is-active")).toHaveAttribute(
      "src",
      /wolf-armani-hero/,
    );
    const geometry = await page.evaluate(() => {
      const c = document.querySelector(".hero-cta-row").getBoundingClientRect();
      const p = document
        .querySelector(".hero-pagination")
        .getBoundingClientRect();
      return {
        gap: p.top - c.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(geometry.gap >= 0, `Hero controls overlap: ${geometry.gap}`);
    assert(!geometry.overflow);
    await expect(
      page.getByRole("button", { name: "Next collection" }),
    ).toHaveCSS("min-height", "44px");
    await expect(page.locator(".hero-title")).toContainText("Dress Like");
    await expect(
      page.locator(".hero-photography .product-transition-previous"),
    ).toHaveCount(0);
    await page.screenshot({ path: `../outputs/hero-motion-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(
      `Product/hero motion passed: ${width}px ${motion}, slow decode, crossfade, stable frame, rapid switching, responsive hero and larger controls.`,
    );
  } finally {
    await browser.close();
  }
}
