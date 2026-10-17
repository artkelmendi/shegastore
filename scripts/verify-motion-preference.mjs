import { webkit, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await webkit.launch();
try {
  for (const mobile of [true, false]) {
    const context = await browser.newContext(
      mobile
        ? {
            ...devices["iPhone 13 Pro Max"],
            viewport: { width: 440, height: 956 },
            reducedMotion: "no-preference",
          }
        : {
            viewport: { width: 1440, height: 1000 },
            reducedMotion: "no-preference",
          },
    );
    await context.addInitScript(() =>
      localStorage.setItem(
        "wolf-consent-v1",
        JSON.stringify({ version: 1, optional: false, time: Date.now() }),
      ),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:5173/");
    await page.waitForFunction(
      () => window.__wolfOrigin?.phase === "settled",
      {},
      { timeout: 15000 },
    );
    await expect(page.locator(".origin-entrance")).toHaveCount(0, {
      timeout: 15000,
    });
    assert.equal(await page.evaluate(() => window.__wolfOrigin.mode), "full");
    const track = page.locator(".favorites-track");
    assert.equal(
      await track.evaluate((el) => getComputedStyle(el).animationName),
      "favorites-drift",
    );
    const headingBefore = await page.locator("h1").boundingBox();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".hero-photography")).toHaveCSS(
      "transform",
      "none",
    );
    await expect(track).toHaveCSS("animation-name", "none");
    await expect(
      page.locator('.favorites-group[aria-hidden="true"]'),
    ).toBeHidden();
    assert.equal(
      await page
        .locator(".favorites-window")
        .evaluate((el) => getComputedStyle(el).overflowX),
      "auto",
    );
    const headingAfter = await page.locator("h1").boundingBox();
    assert(Math.abs(headingBefore.width - headingAfter.width) < 0.5);
    assert(Math.abs(headingBefore.height - headingAfter.height) < 0.5);
    await page.evaluate(() =>
      window.scrollTo({ top: 800, behavior: "instant" }),
    );
    await page.waitForTimeout(400);
    const atRest = await page.evaluate(() => ({
      track: getComputedStyle(document.querySelector(".favorites-track"))
        .transform,
      marks: [...document.querySelectorAll(".background-marks")].map((el) =>
        el.toDataURL(),
      ),
      lenis: document.documentElement.classList.contains("lenis"),
      spatial: document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === "running" &&
            a.effect
              .getKeyframes()
              .some((k) => k.transform && k.transform !== "none"),
        ).length,
    }));
    assert.equal(atRest.track, "none");
    assert.equal(atRest.lenis, false);
    assert.equal(atRest.spatial, 0);
    await page.waitForTimeout(350);
    assert.deepEqual(
      await page
        .locator(".background-marks")
        .evaluateAll((els) => els.map((el) => el.toDataURL())),
      atRest.marks,
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(track).toHaveCSS("animation-name", "favorites-drift");
    await expect(
      page.locator('.favorites-group[aria-hidden="true"]'),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.waitForFunction(
      () => window.__wolfOrigin?.phase === "settled",
      {},
      { timeout: 15000 },
    );
    await expect(page.locator(".origin-entrance")).toHaveCount(0, {
      timeout: 15000,
    });
    assert.equal(await page.evaluate(() => window.__wolfOrigin.mode), "gentle");
    await expect(track).toHaveCSS("animation-name", "none");
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `WebKit ${mobile ? "phone" : "desktop"}: full motion preserved; live preference changes, stable layout, static rows/canvas, gentle reload passed.`,
    );
  }
} finally {
  await browser.close();
}
