import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const origin = process.env.SHEGA_PREVIEW_URL || "http://localhost:5173/";
for (const width of [1440, 390, 320]) {
  const page = await browser.newPage({
    viewport: { width, height: 950 },
    hasTouch: width < 768,
    isMobile: width < 768,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page
    .locator(".opening, .origin-entrance")
    .waitFor({ state: "hidden", timeout: 8000 });
  await page.locator(".cookie-panel").waitFor();
  assert.equal(await page.locator(".newsletter-section").count(), 0);
  assert.equal(await page.locator(".outfit-links a").count(), 3);
  await page.getByRole("button", { name: "What gets stored?" }).click();
  await page
    .getByText("Optional cookies: none installed.", { exact: false })
    .waitFor();
  await page.screenshot({ path: `artifacts/cookies-${width}.png` });
  await page
    .getByRole("button", { name: "Reject optional", exact: true })
    .click();
  await page.locator(".cookie-panel").waitFor({ state: "hidden" });
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("shega-consent-v1")).optional,
    ),
    false,
  );
  await page.reload();
  await page
    .locator(".opening, .origin-entrance")
    .waitFor({ state: "hidden", timeout: 8000 });
  await page.waitForTimeout(1000);
  assert.equal(await page.locator(".cookie-panel").count(), 0);
  await page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Accept all", exact: true }).click();
  await page.locator(".cookie-panel").waitFor({ state: "hidden" });
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("shega-consent-v1")).optional,
    ),
    true,
  );
  if (width === 1440) {
    await page.mouse.move(300, 300);
    await page.waitForTimeout(40);
    assert.equal(await page.locator(".pointer-ring-position").count(), 0);
    const pointerMatrix = await page
      .locator(".pointer-dot-position")
      .evaluate(
        (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).e,
      );
    assert.equal(pointerMatrix, 300);
    assert.equal(
      await page
        .locator(".red-pointer")
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    assert.ok(
      await page.evaluate(() =>
        document.documentElement.classList.contains("lenis"),
      ),
    );
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(700);
    assert.ok(await page.evaluate(() => scrollY > 100));
  } else
    assert.equal(
      await page
        .locator(".red-pointer")
        .evaluate((el) => getComputedStyle(el).display),
      "none",
    );
  await page.locator(".outfit-edit").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `artifacts/outfit-edit-${width}.png` });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator(".outfit-links a").first().click();
  await page.waitForURL("**/shop?category=T-Shirts");
  await page.close();
}
const reduced = await browser.newPage({ reducedMotion: "reduce" });
await reduced.goto(origin);
assert.equal(await reduced.locator(".red-pointer").count(), 0);
assert.equal(
  await reduced.evaluate(() =>
    document.documentElement.classList.contains("lenis"),
  ),
  false,
);
await reduced.close();
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "Passed: cookie choices/reopen/persistence, responsive edit, links, smooth scroll, pointer and reduced motion.",
);
