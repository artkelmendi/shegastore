import { webkit, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.WOLF_PREVIEW_URL || "http://localhost:5173/";
const browser = await webkit.launch({ headless: true });
try {
  for (const theme of ["light", "dark"])
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const context = await browser.newContext({
        ...devices["iPhone 13 Pro Max"],
        viewport: { width: 440, height: 956 },
        reducedMotion,
      });
      await context.addInitScript((theme) => {
        localStorage.setItem("wolf-theme", theme);
        localStorage.setItem(
          "wolf-consent-v1",
          JSON.stringify({ version: 1, optional: false, time: Date.now() }),
        );
        window.__safariFrames = [];
        const sample = () => {
          const cover = document.querySelector(".origin-veil"),
            shell = document.querySelector(".site-shell");
          if (cover && shell) {
            const s = getComputedStyle(cover);
            window.__safariFrames.push({
              phase: window.__wolfOrigin?.phase,
              opacity: Number(s.opacity),
              visible:
                s.visibility === "visible" &&
                !cover.closest(".origin-entrance").hidden,
              shellOpacity: getComputedStyle(shell).opacity,
              shellStyle: shell.getAttribute("style"),
              overflow: document.body.style.overflow,
            });
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, theme);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/fonts/*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.continue();
      });
      for (const load of ["cold", "reload"]) {
        await page.goto(base, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForFunction(
          () =>
            window.__wolfOrigin?.phase === "eyes" ||
            window.__wolfOrigin?.phase === "revealing",
        );
        await page.setViewportSize({ width: 540, height: 850 });
        await page.setViewportSize({ width: 440, height: 900 });
        assert.notEqual(
          await page.evaluate(() => window.__wolfOrigin.phase),
          "settled",
          "Safari resize must not end the intro",
        );
        const mode = await page.evaluate(() => window.__wolfOrigin.mode);
        assert.equal(mode, reducedMotion === "reduce" ? "gentle" : "full");
        if (mode === "gentle")
          assert.ok(
            await page.evaluate(() =>
              window.__wolfOrigin.animations.every((a) =>
                a.effect
                  .getKeyframes()
                  .every((f) => !f.transform || f.transform === "none"),
              ),
            ),
            "Reduced motion uses opacity only",
          );
        await page
          .locator(".origin-entrance")
          .waitFor({ state: "detached", timeout: 10000 });
        const state = await page.evaluate(() => ({
          error: window.__wolfOrigin.error,
          reason: window.__wolfOrigin.reason,
          frames: window.__safariFrames,
        }));
        assert.equal(state.error, null);
        assert.equal(state.reason, "finished");
        assert.ok(state.frames.length > 5);
        let previous = 1;
        for (const frame of state.frames) {
          assert.equal(frame.shellOpacity, "1");
          assert.equal(frame.shellStyle, null);
          assert.equal(frame.overflow, "");
          if (frame.phase === "revealing" && frame.visible) {
            assert.ok(
              frame.opacity <= previous + 0.02,
              "White cover never flashes back",
            );
            previous = frame.opacity;
          }
        }
        await expect(page.locator(".hero-title")).toBeVisible();
        assert.equal(
          await page.locator(".site-shell").evaluate((e) => e.inert),
          false,
        );
        assert.deepEqual(errors, []);
        console.log(
          `Safari ${theme}, ${mode}, ${load}: entrance visible, resize-safe, stable page layer, no white-cover rebound.`,
        );
      }
      await context.close();
    }
  // Simulate a Safari tab being prerendered before it is first made visible.
  const context = await browser.newContext({ ...devices["iPhone 13 Pro Max"] });
  await context.addInitScript(() => {
    let hidden = true;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    window.__showTab = () => {
      hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__wolfOrigin?.phase === "waiting");
  await page.waitForTimeout(1700);
  assert.equal(await page.evaluate(() => window.__wolfOrigin.phase), "waiting");
  await page.evaluate(() => window.__showTab());
  await page.waitForFunction(
    () =>
      window.__wolfOrigin.phase === "eyes" ||
      window.__wolfOrigin.phase === "revealing",
  );
  await page
    .locator(".origin-entrance")
    .waitFor({ state: "detached", timeout: 8000 });
  assert.equal(
    await page.evaluate(() => window.__wolfOrigin.reason),
    "finished",
  );
  await context.close();
  console.log(
    "Safari background-first tab starts the entrance only after becoming visible.",
  );
} finally {
  await browser.close();
}
