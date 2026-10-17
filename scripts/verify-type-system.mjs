import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = [];
const report = [];
const base = process.env.SHEGA_PREVIEW_URL || "http://localhost:5173/";
const context = await browser.newContext({ reducedMotion: "reduce" });
await context.addInitScript(() =>
  localStorage.setItem(
    "shega-consent-v1",
    JSON.stringify({ version: 1, optional: false, time: Date.now() }),
  ),
);
const page = await context.newPage();
page.on("pageerror", (e) => failures.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) failures.push(r.url());
});
for (const width of [1440, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 950 });
  for (const route of [
    "",
    "shop/",
    "brands/",
    "contact/",
    "about/",
    "faq/",
    "privacy/",
    "delivery/",
    "saved/",
    "product/boss-signature-hoodie/",
  ]) {
    await page.goto(new URL(route, base).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const audit = await page.evaluate(() => {
      const fonts = {};
      const stray = [];
      for (const el of document.body.querySelectorAll("*")) {
        if (
          ["SCRIPT", "STYLE"].includes(el.tagName) ||
          !el.getClientRects().length
        )
          continue;
        const direct = [...el.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim(),
        );
        if (!direct) continue;
        const family = getComputedStyle(el)
          .fontFamily.split(",")[0]
          .replaceAll('"', "");
        fonts[family] = (fonts[family] || 0) + 1;
        if (
          !["Satoshi", "Cabinet Grotesk"].includes(family) &&
          !(family === "Telma" && el.closest(".hero-title"))
        )
          stray.push({
            text: el.textContent.slice(0, 60),
            family,
            tag: el.tagName,
          });
      }
      return {
        fonts,
        stray,
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelector("h1")?.textContent,
      };
    });
    if (audit.overflow || audit.stray.length || !audit.h1)
      failures.push({ width, route, ...audit });
    report.push({ width, route, ...audit });
    if (
      [1440, 390].includes(width) &&
      ["", "shop/", "contact/", "faq/", "about/"].includes(route)
    )
      await page.screenshot({
        path: `artifacts/final-${route.replaceAll("/", "") || "home"}-${width}.png`,
      });
  }
}
await context.close();
const mousePage = await browser.newPage();
await mousePage.goto(base);
await mousePage.locator(".opening").waitFor({ state: "hidden", timeout: 8000 });
const target = mousePage.locator(".header-tools button").first();
await target.hover();
await mousePage.waitForTimeout(180);
assert.ok(
  await mousePage
    .locator(".red-pointer")
    .evaluate((el) => el.classList.contains("is-interactive")),
);
await mousePage.mouse.down();
await mousePage.waitForTimeout(100);
assert.ok(
  await mousePage
    .locator(".red-pointer")
    .evaluate((el) => el.classList.contains("is-pressed")),
);
await mousePage.mouse.up();
assert.equal(await mousePage.locator(".pointer-ring-position").count(), 0);
await writeFile("artifacts/type-audit.json", JSON.stringify(report, null, 2));
await browser.close();
assert.deepEqual(failures, []);
console.log(
  "Passed: font audit and overflow across 10 pages × 4 widths; hero-only script; immediate hover/press pointer.",
);
