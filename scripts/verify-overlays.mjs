import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
await page.goto("http://localhost:5173/");
await page.locator(".cookie-panel").waitFor();
await page
  .getByRole("button", { name: "Reject optional", exact: true })
  .click();
await page.locator(".cookie-panel").waitFor({ state: "hidden" });
for (const label of ["Search the store", "Open shopping bag (0 items)"]) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.match(
    await dialog
      .locator("h2")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily),
    /Cabinet/,
  );
  assert.equal(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    true,
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}
await page.setViewportSize({ width: 390, height: 850 });
await page
  .getByRole("button", { name: /Open menu|Open navigation|Menu/, exact: false })
  .click();
await page.locator(".mobile-menu").waitFor();
assert.match(
  await page
    .locator(".mobile-menu>a")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily),
  /Satoshi/,
);
await page.keyboard.press("Escape");
await browser.close();
console.log("Search, bag and mobile menu fonts and dialog width passed.");
