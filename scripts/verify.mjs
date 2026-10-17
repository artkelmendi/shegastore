import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const origin = process.env.SHEGA_PREVIEW_URL || "http://localhost:5173";
const artifacts = new URL("../artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const failedRequests = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400)
    failedRequests.push(`${response.status()} ${response.url()}`);
});
const screenshot = async (name) => {
  await page.waitForTimeout(1100);
  return page.screenshot({
    path: fileURLToPath(new URL(name, artifacts)),
    fullPage: false,
  });
};

await page.goto(origin, { waitUntil: "networkidle" });
assert.equal(await page.locator(".intro").count(), 0);
assert.equal(await page.locator("#main").evaluate((el) => el.inert), false);
assert.notEqual(
  await page.evaluate(() => getComputedStyle(document.body).overflow),
  "hidden",
);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await screenshot("desktop-home.png");
assert.equal(await page.locator("h1").innerText(), "DRESS LIKE\nYOURSELF.");
await page
  .getByRole("button", { name: "Next collection", exact: true })
  .click();
await page.getByRole("heading", { name: "MAKE IT PERSONAL." }).waitFor();
await page
  .getByRole("button", { name: "Previous collection", exact: true })
  .click();
await page.getByRole("heading", { name: "DRESS LIKE YOURSELF." }).waitFor();

await page
  .getByRole("button", { name: "Search the store", exact: true })
  .click();
await page.getByRole("textbox", { name: "Search products" }).fill("diesel");
await page
  .getByRole("dialog")
  .getByRole("button", { name: /DIESEL T-Boxt distressed/ })
  .click();
await page
  .getByRole("heading", { name: "T-Boxt distressed logo T-shirt", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Add to bag", exact: true }).click();
await page
  .getByRole("alert")
  .filter({ hasText: "Please choose your size." })
  .waitFor();
await page.getByRole("button", { name: "M", exact: true }).click();
await page.getByRole("button", { name: "Add to bag", exact: true }).click();
await page
  .getByRole("dialog")
  .getByRole("heading", { name: "YOUR BAG (1)" })
  .waitFor();
await page.getByRole("button", { name: /Increase quantity/ }).click();
await page.getByRole("heading", { name: "YOUR BAG (2)" }).waitFor();
assert.equal(await page.locator(".bag-summary strong").innerText(), "€90");
await page.keyboard.press("Escape");
await page.getByRole("dialog").waitFor({ state: "hidden" });
await screenshot("desktop-product.png");
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Open shopping bag (2 items)" }).click();
await page.getByRole("heading", { name: "YOUR BAG (2)" }).waitFor();
await screenshot("desktop-bag.png");
await page.getByRole("button", { name: /Decrease quantity/ }).click();
await page.getByRole("button", { name: /Remove .* from bag/ }).click();
await page.getByRole("heading", { name: "ROOM FOR SOMETHING GOOD." }).waitFor();
await page.keyboard.press("Escape");
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page
  .getByRole("button", { name: "Add to saved items", exact: true })
  .click();
await page.goto(`${origin}/saved`, { waitUntil: "networkidle" });
assert.equal(await page.locator(".product-card").count(), 1);

await page.goto(`${origin}/shop`, { waitUntil: "networkidle" });
assert.equal(await page.locator(".product-card").count(), 8);
await page.getByRole("button", { name: "Hoodies", exact: true }).click();
assert.equal(await page.locator(".product-card").count(), 3);
await page.getByRole("button", { name: "Filters", exact: true }).click();
await page.getByLabel("Brand", { exact: true }).selectOption("DIESEL");
await page.getByRole("heading", { name: "NOTHING HERE. YET." }).waitFor();
await page
  .getByRole("button", { name: "View all pieces", exact: true })
  .click();
assert.equal(await page.locator(".product-card").count(), 8);
await page
  .getByRole("combobox", { name: "Sort products" })
  .selectOption("price-asc");
assert.match(await page.locator(".product-card").first().innerText(), /DIESEL/);
await screenshot("desktop-shop.png");

await page.goto(`${origin}/contact`, { waitUntil: "networkidle" });
await page.getByLabel("First name", { exact: true }).fill("Test");
await page.getByLabel("Last name", { exact: true }).fill("Customer");
await page
  .getByLabel("Email address", { exact: true })
  .fill("test@example.com");
await page
  .getByLabel("What’s on your mind?", { exact: true })
  .selectOption("Product & sizing");
await page
  .getByLabel("Your message", { exact: true })
  .fill("A preview message about the hoodie sizing.");
await page.getByRole("checkbox").check();
await page
  .getByRole("button", { name: "Preview message", exact: true })
  .click();
await page.getByRole("heading", { name: "LOOKING GOOD." }).waitFor();
assert.match(
  await page.locator(".form-success").innerText(),
  /No message has been sent/,
);

for (const route of [
  "/",
  "/shop",
  "/product/boss-signature-hoodie",
  "/brands",
  "/contact",
  "/about",
  "/privacy",
  "/delivery",
  "/saved",
  "/not-a-real-page",
]) {
  await page.goto(origin + route, { waitUntil: "networkidle" });
  assert.equal(
    (await page.locator("h1,h2").count()) > 0,
    true,
    `Page content missing: ${route}`,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    `Desktop overflow: ${route}`,
  );
  assert.equal(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.some((img) => img.complete && img.naturalWidth === 0),
      ),
    false,
    `Broken image: ${route}`,
  );
}

await page.goto(origin, { waitUntil: "networkidle" });
assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
const track = page.locator(".brand-marquee-track");
assert.equal(
  await track.evaluate((el) => getComputedStyle(el).animationName),
  "brand-travel",
);
await page.getByRole("button", { name: "Pause brand animation" }).click();
assert.equal(
  await track.evaluate((el) => getComputedStyle(el).animationPlayState),
  "paused",
);
await page.getByRole("button", { name: "Play brand animation" }).click();
await page.evaluate(() => window.scrollTo(0, 850));
await page.waitForTimeout(800);
await screenshot("desktop-light.png");

await page.setViewportSize({ width: 390, height: 844 });
for (const route of [
  "/",
  "/shop",
  "/product/boss-signature-hoodie",
  "/brands",
  "/contact",
  "/about",
  "/privacy",
  "/delivery",
  "/saved",
]) {
  await page.goto(origin + route, { waitUntil: "networkidle" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    `Mobile overflow: ${route}`,
  );
  if (route === "/") await screenshot("mobile-home.png");
  if (route === "/shop") await screenshot("mobile-shop.png");
  if (route === "/product/boss-signature-hoodie")
    await screenshot("mobile-product.png");
}
await page.goto(origin, { waitUntil: "networkidle" });
await page
  .getByRole("button", { name: "Open navigation menu", exact: true })
  .click();
await screenshot("mobile-menu.png");
await page
  .getByRole("navigation", { name: "Mobile navigation" })
  .getByRole("link", { name: "Contact us", exact: true })
  .click();
await page.getByRole("heading", { name: "LET’S TALK." }).waitFor();
await page.getByRole("dialog").waitFor({ state: "hidden" });

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const reduced = await reducedContext.newPage();
await reduced.goto(origin, { waitUntil: "networkidle" });
await reduced.locator(".intro").waitFor({ state: "hidden" });
assert.equal(
  await reduced
    .locator(".hero-enter")
    .first()
    .evaluate((el) => getComputedStyle(el).opacity),
  "1",
);
assert.equal(
  await reduced.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  ),
  "auto",
);
assert.deepEqual(errors, [], "Browser runtime errors");
assert.deepEqual(failedRequests, [], "Failed HTTP responses");

const result = {
  passed: true,
  checks: [
    "First visit opens without an overlay or scroll lock",
    "Hero carousel",
    "Search to product",
    "Required size validation",
    "Bag quantities and subtotal",
    "Bag persistence",
    "Bag empty state",
    "Saved items",
    "Category and brand filters",
    "No-results state",
    "Price sorting",
    "Contact preview",
    "All routes and not-found page",
    "Desktop and mobile overflow",
    "Image loading",
    "White editorial appearance and original logo marquee",
    "Mobile navigation",
    "Reduced motion",
    "Browser runtime errors",
    "HTTP asset errors",
  ],
  errors,
  failedRequests,
};
await writeFile(
  new URL("verification.json", artifacts),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
