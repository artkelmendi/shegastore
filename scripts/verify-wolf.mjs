import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.WOLF_PREVIEW_URL || "http://localhost:5173/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
  broken = [];
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addInitScript((theme) => {
      localStorage.setItem("wolf-theme", theme);
      localStorage.setItem(
        "wolf-consent-v1",
        JSON.stringify({ version: 1, optional: false, time: Date.now() }),
      );
    }, theme);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400 && !r.url().includes("/api/")) broken.push(r.url());
    });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        "",
        "shop",
        "product/diesel-essential-tee",
        "brands",
        "contact",
        "faq",
        "about",
        "saved",
        "privacy",
        "delivery",
        "account/create",
        "login",
      ]) {
        await page.goto(new URL(route, base).href);
        await page.locator("h1:visible,h2:visible").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const text = await page.locator("body").innerText();
        assert.doesNotMatch(text, /shega/i, `${route} contains old branding`);
        assert.equal(
          await page.evaluate(() => document.documentElement.dataset.theme),
          theme,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${theme} ${route} at ${width}px overflows`,
        );
        assert.equal(
          await page
            .locator("img")
            .evaluateAll((imgs) =>
              imgs.some((img) => img.complete && !img.naturalWidth),
            ),
          false,
          `${route} has a broken image`,
        );
        if (
          [1440, 390].includes(width) &&
          ["", "shop", "login"].includes(route)
        )
          await page.screenshot({
            path: `artifacts/wolf-${theme}-${route || "home"}-${width}.png`,
          });
      }
    }
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(base);
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "light",
    "First visit defaults to light regardless of device preference",
  );
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Switch to light mode", exact: true }),
  ).toBeVisible();
  await page.reload();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "dark",
  );
  await context.close();
  for (const [width, theme] of [
    [1440, "light"],
    [390, "dark"],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    await context.addInitScript(
      (theme) => localStorage.setItem("wolf-theme", theme),
      theme,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page
      .locator(".origin-emblem .wolf-eye")
      .first()
      .waitFor({ state: "attached" });
    assert.equal(await page.locator(".origin-emblem .wolf-eye").count(), 2);
    await page
      .locator(".origin-entrance")
      .waitFor({ state: "hidden", timeout: 7000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.dataset.originExperiment,
      ),
      "settled",
    );
    assert.equal(
      await page.locator(".site-shell").evaluate((el) => el.inert),
      false,
    );
    assert.equal(
      await page
        .locator(".site-shell")
        .evaluate((el) => getComputedStyle(el).clipPath),
      "none",
    );
    await page.reload();
    await page.locator(".origin-skip").waitFor({ state: "attached" });
    await page.keyboard.press("Escape");
    await page.locator(".origin-entrance").waitFor({ state: "hidden" });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(broken, []);
  console.log(
    "Wolf rebrand passed: 12 pages × 4 widths × 2 themes; no visible Shega branding or broken assets; persistent theme switch; eye entrance, Escape and reduced motion.",
  );
} finally {
  await browser.close();
}
