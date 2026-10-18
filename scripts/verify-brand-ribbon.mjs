import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    localStorage.setItem(
      "wolf-consent-v1",
      JSON.stringify({ version: 1, optional: false, time: Date.now() }),
    ),
  );
  for (const width of [390, 1440, 2560]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("http://127.0.0.1:4175/shegastore/");
    await expect(page.locator(".brand-marquee")).toBeVisible();
    await page.keyboard.press("Escape");
    const strip = page.locator(".brand-marquee");
    await strip.scrollIntoViewIfNeeded();
    await expect(strip).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(strip).toHaveCSS("border-top-color", "rgb(255, 0, 51)");
    const track = page.locator(".brand-marquee-track");
    await strip.hover();
    await expect(track).toHaveCSS("animation-play-state", "running");
    const result = await strip.evaluate((el) => {
      const track = el.querySelector(".brand-marquee-track");
      const groups = [...el.querySelectorAll(".brand-marquee-group")];
      const windowWidth = el
        .querySelector(".brand-marquee-window")
        .getBoundingClientRect().width;
      const animation = track.getAnimations()[0];
      const images = [...el.querySelectorAll("img")];
      const widths = groups.map((g) => g.getBoundingClientRect().width);
      let coverage = true;
      animation.pause();
      for (const fraction of [0, 0.25, 0.5, 0.75, 0.999]) {
        animation.currentTime = 60000 * fraction;
        const rects = groups.map((g) => g.getBoundingClientRect());
        const box = el.getBoundingClientRect();
        if (rects[0].left > box.left + 2 || rects[1].right < box.right - 2)
          coverage = false;
      }
      animation.currentTime = 0;
      return {
        widths,
        windowWidth,
        coverage,
        loaded: images.every((i) => i.complete && i.naturalWidth > 0),
        names: images.slice(0, 5).map((i) => i.alt),
      };
    });
    assert(result.loaded);
    assert(result.coverage);
    assert(result.widths[0] >= result.windowWidth);
    assert.equal(result.widths[0], result.widths[1]);
    assert.deepEqual(result.names, [
      "BOSS",
      "DIESEL",
      "EMPORIO ARMANI",
      "KARL LAGERFELD",
      "HUGO",
    ]);
    await strip.screenshot({
      path: `../outputs/wolf-brand-ribbon-${width}.png`,
    });
    console.log(
      `White vector ribbon: ${width}px, loaded logos, full loop coverage, no hover pause passed.`,
    );
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".brand-marquee-track")).toHaveCSS(
    "animation-name",
    "none",
  );
} finally {
  await browser.close();
}
