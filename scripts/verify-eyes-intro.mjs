import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = process.env.WOLF_PREVIEW_URL || "http://localhost:5173/";
const errors = [];
try {
  for (const [width, theme] of [
    [1440, "light"],
    [390, "dark"],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
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
    await page.goto(base);
    await page.waitForFunction(() =>
      window.__wolfOrigin?.animations.some((a) =>
        a.effect.target.classList.contains("site-shell"),
      ),
    );
    await page.evaluate(() => {
      window.__eyeTestOffsets = window.__wolfOrigin.animations.map(
        (a) => a.startTime - window.__wolfOrigin.started,
      );
      window.__wolfOrigin.animations.forEach((a) => a.pause());
    });
    const seek = (time) =>
      page.evaluate((time) => {
        window.__wolfOrigin.animations.forEach((a, i) => {
          a.currentTime = time - window.__eyeTestOffsets[i];
        });
      }, time);
    await seek(750);
    const openingHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    assert.ok(
      openingHeight > 2000,
      "The full document stays laid out behind the intro",
    );
    await expect(page.locator(".site-shell")).toHaveCSS("max-height", "none");
    await expect(page.locator(".origin-veil")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );

    assert.equal(await page.locator(".origin-emblem polygon").count(), 2);
    assert.equal(await page.locator(".origin-emblem path").count(), 0);
    const positions = await page
      .locator(".origin-emblem .wolf-eye")
      .evaluateAll((eyes) =>
        eyes.map((eye) => {
          const b = eye.getBoundingClientRect();
          return { top: b.top, height: b.height };
        }),
      );
    assert.ok(
      Math.abs(positions[0].top - positions[1].top) < 0.5,
      "Eyes sit on the same horizontal line",
    );
    const eyeWidth = await page
      .locator(".origin-emblem")
      .evaluate((el) => el.getBoundingClientRect().width);
    assert.ok(
      eyeWidth > width * (width >= 768 ? 0.4 : 0.6),
      "Eye pair is large at each viewport",
    );
    await page.screenshot({
      path: `artifacts/wolf-eyes-open-${theme}-${width}.png`,
    });
    for (const time of [450, 975, 1300]) {
      await seek(time);
      const shape = await page
        .locator(".origin-emblem .wolf-eye")
        .first()
        .evaluate((el) => {
          const m = new DOMMatrix(getComputedStyle(el).transform);
          return { x: m.a, y: m.d };
        });
      assert.ok(
        shape.y > 0.96 && Math.abs(shape.x - shape.y) < 0.001,
        "Eyes retain their shape without blinking or squeezing",
      );
    }
    await seek(2000);
    await page.screenshot({
      path: `artifacts/wolf-eyes-dive-${theme}-${width}.png`,
    });
    const lastTime = await page.evaluate(
      () =>
        Math.max(
          ...window.__wolfOrigin.animations.map(
            (a, i) =>
              a.effect.getComputedTiming().endTime + window.__eyeTestOffsets[i],
          ),
        ) - 2,
    );
    await seek(lastTime);
    const measure = () =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll(
            ".header-brand,.hero-title,.hero-photography",
          ),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        }),
      );
    const beforeRelease = await measure();
    await page.evaluate(() =>
      window.__wolfOrigin.animations.forEach((a) => a.play()),
    );
    await page
      .locator(".origin-entrance")
      .waitFor({ state: "detached", timeout: 5000 });
    const afterRelease = await measure();
    beforeRelease.forEach((box, i) =>
      box.forEach((value, j) =>
        assert.ok(
          Math.abs(value - afterRelease[i][j]) < 0.5,
          "No position or scale snap when entrance layers are released",
        ),
      ),
    );
    // Offscreen lazy content can finish loading on the public host. Verify the
    // intro never crops the page, rather than freezing all downstream layout.
    await expect(page.locator(".site-shell")).toHaveCSS("max-height", "none");
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      theme,
    );
    assert.equal(
      await page.locator(".site-shell").evaluate((el) => el.inert),
      false,
    );
    assert.equal(
      await page.locator(".site-shell").evaluate((el) => el.style.clipPath),
      "",
    );
    assert.equal(
      await page.locator(".site-shell").evaluate((el) => el.style.zIndex),
      "",
    );
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    await expect(
      page.getByRole("heading", { name: "Dress Like yourself." }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/wolf-eyes-settled-${theme}-${width}.png`,
    });
    await page.reload();
    await page.locator(".origin-skip").waitFor({ state: "attached" });
    await page.keyboard.press("Escape");
    await page.locator(".origin-entrance").waitFor({ state: "detached" });
    await page.reload();
    await page.locator(".origin-skip").waitFor({ state: "attached" });
    await page.setViewportSize({ width: width - 10, height: 900 });
    await page.locator(".origin-entrance").waitFor({ state: "detached" });
    await context.close();
  }
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(base);
  await expect(page.locator(".hero-title")).toBeVisible();
  assert.equal(await page.locator(".origin-entrance").count(), 0);
  assert.equal(
    await page.locator(".site-shell").evaluate((el) => el.inert),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "White eye entrance passed: large level eyes, steady gaze, eyes-only dive, light/desktop + dark/mobile, restored layout, Escape, resize and reduced motion.",
  );
} finally {
  await browser.close();
}
