import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const origin = process.env.SHEGA_PREVIEW_URL || "http://localhost:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const directory = new URL("../artifacts/motion/", import.meta.url);
await mkdir(directory, { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
// An old intro preference must never silently disable the new opening.
await context.addInitScript(() =>
  sessionStorage.setItem("shega-intro", "seen"),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.setDefaultTimeout(8000);
const shot = (name) =>
  page.screenshot({ path: fileURLToPath(new URL(name + ".png", directory)) });
const logoState = () =>
  page.locator(".opening-logo").evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      opacity: Number(style.opacity),
      y: new DOMMatrixReadOnly(style.transform).m42,
    };
  });
await page.goto(origin, { waitUntil: "domcontentloaded" });
await page.locator(".opening[open]").waitFor({ state: "visible" });
assert.equal(
  await page
    .locator(".opening")
    .evaluate((el) => getComputedStyle(el).backgroundColor),
  "rgb(251, 251, 250)",
);
await page.waitForTimeout(220);
const earlyLogo = await logoState();
await shot("01-logo-rising");
assert.ok(
  earlyLogo.opacity > 0 && earlyLogo.opacity < 1,
  "Logo fades in gradually",
);
assert.ok(earlyLogo.y > 0, "Logo starts below its final position");
await page.waitForTimeout(650);
const lateLogo = await logoState();
await shot("02-logo-settling");
assert.ok(lateLogo.opacity > earlyLogo.opacity && lateLogo.y < earlyLogo.y);
await page.waitForFunction(
  () => document.querySelector(".site-shell")?.dataset.opening === "departing",
);
await page.waitForTimeout(160);
await shot("03-white-dissolve");
const dissolve = await page
  .locator(".opening")
  .evaluate((el) => Number(getComputedStyle(el).opacity));
assert.ok(
  dissolve > 0 && dissolve < 1,
  "The white surface dissolves into the hero",
);
await page.locator(".opening").waitFor({ state: "hidden" });
await page.waitForTimeout(1100);
await shot("04-hero-ready");
assert.equal(await page.locator("[inert]").count(), 0);
assert.notEqual(
  await page.evaluate(() => getComputedStyle(document.body).overflow),
  "hidden",
);
assert.equal(
  await page
    .locator(".hero-image.is-active")
    .evaluate((el) => getComputedStyle(el).opacity),
  "1",
);
const firstHero = await page.locator(".hero").boundingBox();
await page.waitForTimeout(500);
assert.deepEqual(
  await page.locator(".hero").boundingBox(),
  firstHero,
  "No jump after the opening",
);

// Scroll the outgoing page so the route change also tests the scroll handoff.
await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
const header = await page.locator(".site-header").boundingBox();
await page
  .locator(".desktop-nav")
  .getByRole("link", { name: "Shop", exact: true })
  .click();
await page.waitForFunction(() =>
  document.querySelector("#main h1")?.textContent.includes("SHEGA SELECTION"),
);
const entering = await page
  .locator("#main")
  .evaluate((el) => Number(getComputedStyle(el).opacity));
assert.ok(entering < 1, "A new page fades in");
await shot("05-page-entering");
await page.waitForFunction(
  () => Number(getComputedStyle(document.querySelector("#main")).opacity) === 1,
);
assert.equal(
  await page.locator(".opening").count(),
  0,
  "Page changes never replay the opening",
);
assert.equal(await page.evaluate(() => scrollY), 0);
assert.deepEqual(
  await page.locator(".site-header").boundingBox(),
  header,
  "Header stays still between pages",
);
await page.waitForTimeout(700);
await shot("06-shop-ready");
const main = await page.locator("#main").elementHandle();
await page
  .locator(".desktop-nav")
  .getByRole("link", { name: "Hoodies", exact: true })
  .click();
assert.equal(
  await main.evaluate((el) => el === document.querySelector("#main")),
  true,
  "Filters do not animate the whole page",
);

// Interrupt a route exit: only the most recently chosen destination should enter.
await page
  .locator(".desktop-nav a[href='/brands']")
  .evaluate((el) => el.click());
await page.locator(".desktop-nav a[href='/shop']").evaluate((el) => el.click());
await page.waitForTimeout(700);
assert.equal(await page.locator("#main").count(), 1);
assert.ok(
  await page
    .locator("#main h1")
    .innerText()
    .then((text) => text.includes("SHEGA SELECTION")),
);

await page.reload({ waitUntil: "domcontentloaded" });
await page.locator(".opening[open]").waitFor();
await page.getByRole("button", { name: "Enter store", exact: true }).click();
await page.locator(".opening").waitFor({ state: "hidden" });
assert.equal(await page.locator("[inert]").count(), 0);
assert.notEqual(
  await page.evaluate(() => getComputedStyle(document.body).overflow),
  "hidden",
);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(origin, { waitUntil: "domcontentloaded" });
await page.locator(".opening[open]").waitFor();
await page.waitForTimeout(900);
await shot("07-mobile-opening");
await page.locator(".opening").waitFor({ state: "hidden" });
await page.waitForTimeout(1000);
await shot("08-mobile-hero");
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page
  .getByRole("button", { name: "Open navigation menu", exact: true })
  .click();
await page
  .getByRole("navigation", { name: "Mobile navigation" })
  .getByRole("link", { name: "Contact us", exact: true })
  .click();
await page.getByRole("heading", { name: "LET’S TALK." }).waitFor();
await page.locator(".store-dialog").waitFor({ state: "hidden" });

const slowContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const slow = await slowContext.newPage();
let releaseImage;
const imageGate = new Promise((resolve) => {
  releaseImage = resolve;
});
await slow.route("**/shega-boss-hero.webp", async (route) => {
  await imageGate;
  await route.continue();
});
await slow.goto(origin, { waitUntil: "commit" });
await slow.locator(".opening[open]").waitFor({ state: "visible" });
await slow.waitForTimeout(1600);
assert.equal(
  await slow.locator(".site-shell").getAttribute("data-opening"),
  "arriving",
  "Slow images stay behind the white opening",
);
releaseImage();
await slow.locator(".opening").waitFor({ state: "hidden", timeout: 6000 });
assert.equal(
  await slow
    .locator(".hero-image.is-active")
    .evaluate((el) => el.complete && el.naturalWidth > 0),
  true,
);

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const reduced = await reducedContext.newPage();
await reduced.goto(origin, { waitUntil: "networkidle" });
assert.equal(await reduced.locator(".opening").count(), 0);
assert.equal(await reduced.locator("[inert]").count(), 0);
assert.equal(
  await reduced
    .locator(".hero-enter")
    .first()
    .evaluate((el) => getComputedStyle(el).transform),
  "none",
);
assert.deepEqual(errors, []);
const result = {
  passed: true,
  checks: [
    "White opening and visible bottom-to-top logo fade",
    "Image/font readiness and gentle handoff",
    "Stable hero after opening",
    "Page fade with stable header and scroll reset",
    "Filters stay immediate",
    "Interrupted navigation resolves to latest destination",
    "Skip and reload",
    "Mobile opening and navigation",
    "Slow image loading",
    "Reduced motion",
  ],
  earlyLogo,
  lateLogo,
  dissolve,
  errors,
};
await writeFile(
  new URL("verification.json", directory),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
