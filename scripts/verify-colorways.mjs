import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "wolf-consent-v1",
      JSON.stringify({ version: 1, optional: false, time: Date.now() }),
    ),
  );
  const base = "http://127.0.0.1:4175/shegastore/";
  await page.goto(base + "shop/");
  await expect(page.locator(".product-card")).toHaveCount(6);
  await page.keyboard.press("Escape");
  const card = page
    .locator(".product-card")
    .filter({ has: page.getByText("City frame T-shirt", { exact: true }) });
  await card
    .getByRole("button", { name: "Choose Off-white", exact: true })
    .click();
  await expect(
    card.locator(".product-image-link > img").first(),
  ).toHaveAttribute("src", /off-white-tshirt\/front/);
  await expect(card.locator(".product-name")).toHaveAttribute(
    "href",
    /off-white-tshirt$/,
  );
  await page.goto(base + "product/armani-exchange-black-tshirt/");
  await expect(page.locator("h1")).toHaveText("City frame T-shirt");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "View product photo 3" }).click();
  await page
    .locator(".size-options")
    .getByRole("button", { name: "M", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Choose Off-white", exact: true })
    .click();
  await expect(page.locator(".product-zoom img")).toHaveAttribute(
    "src",
    /off-white-tshirt\/front/,
  );
  await expect(page.locator(".detail-color")).toContainText("Off-white");
  await expect(
    page
      .locator(".size-options")
      .getByRole("button", { name: "M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const bag = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("wolf-bag")),
  );
  assert.equal(bag[0].id, "armani-exchange-off-white-tshirt");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.getByRole("button", { name: "Choose Black", exact: true }).click();
  await expect(page.locator(".product-zoom img")).toHaveAttribute(
    "src",
    /black-tshirt\/front/,
  );
  console.log(
    "Colour selection passed: grouped card, updated photo/link, detail gallery reset, retained size and correct bag colour.",
  );
} finally {
  await browser.close();
}
