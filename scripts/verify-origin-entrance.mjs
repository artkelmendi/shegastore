import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
await mkdir("artifacts/origin-experiment", { recursive: true });
const base = (
  process.env.SHEGA_PREVIEW_URL || "http://localhost:4173/shegastore/"
).replace(/\/?$/, "/");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const baseline = JSON.parse(
  await readFile("tests/fixtures/origin-layout.json", "utf8"),
);
const errors = [];
const results = [];
const pageFor = async (options = {}) => {
  const p = await browser.newPage(options);
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() =>
    localStorage.setItem(
      "shega-consent-v1",
      JSON.stringify({ version: 1, optional: false, time: Date.now() }),
    ),
  );
  return p;
};
for (const width of [1440, 390]) {
  const p = await pageFor({ viewport: { width, height: 950 } });
  await p.goto(base);
  await p.waitForFunction(() => window.__shegaOrigin?.phase === "unfolding");
  assert.equal(await p.locator(".opening").count(), 0);
  const start = await p.evaluate(() => ({
    clip: getComputedStyle(document.querySelector(".site-shell")).clipPath,
    inert: document.querySelector(".site-shell").inert,
    origin: window.__shegaOrigin.origin,
  }));
  assert.ok(start.inert);
  assert.match(start.clip, /circle/);
  await p.waitForFunction(() => window.__shegaOrigin?.phase === "settled");
  await p.waitForTimeout(700);
  assert.equal(
    await p.locator(".site-shell").evaluate((el) => el.inert),
    false,
  );
  assert.equal(
    await p
      .locator(".site-shell")
      .evaluate((el) => getComputedStyle(el).clipPath),
    "none",
  );
  assert.equal(await p.evaluate(() => document.body.style.overflow), "");
  const geometry = await p.evaluate(
    (selectors) =>
      Object.fromEntries(
        selectors.map((s) => {
          const el = document.querySelector(s);
          const r = el.getBoundingClientRect();
          const c = getComputedStyle(el);
          return [
            s,
            {
              rect: [r.x, r.y, r.width, r.height],
              font: c.fontFamily,
              fontSize: c.fontSize,
              weight: c.fontWeight,
              color: c.color,
              text: el.innerText,
            },
          ];
        }),
      ),
    Object.keys(baseline[width]),
  );
  for (const [selector, value] of Object.entries(geometry)) {
    for (let i = 0; i < 4; i++)
      assert.ok(
        Math.abs(value.rect[i] - baseline[width][selector].rect[i]) < 0.2,
        `${width} ${selector} geometry ${value.rect} != ${baseline[width][selector].rect}`,
      );
    for (const key of ["font", "fontSize", "weight", "color", "text"])
      assert.equal(
        value[key],
        baseline[width][selector][key],
        `${width} ${selector} ${key}`,
      );
  }
  await p.screenshot({
    path: `artifacts/origin-experiment/verified-${width}.png`,
  });
  await p.locator(".hero .button").click();
  await p.waitForURL("**/shop");
  assert.equal(await p.locator(".origin-entrance").count(), 0);
  results.push({ width, geometry: "identical", ...start });
  await p.close();
}
for (const action of ["escape", "resize"]) {
  const p = await pageFor();
  await p.goto(base);
  await p.waitForFunction(() => !!window.__shegaOrigin);
  if (action === "escape") await p.keyboard.press("Escape");
  else await p.setViewportSize({ width: 390, height: 840 });
  await p.locator(".origin-entrance").waitFor({ state: "hidden" });
  assert.equal(
    await p
      .locator(".site-shell")
      .evaluate((el) => getComputedStyle(el).clipPath),
    "none",
  );
  assert.equal(await p.evaluate(() => document.body.style.overflow), "");
  await p.close();
}
const reduced = await pageFor({ reducedMotion: "reduce" });
await reduced.goto(base);
assert.equal(await reduced.locator(".origin-entrance,.opening").count(), 0);
assert.equal(
  await reduced
    .locator(".site-shell")
    .evaluate((el) => getComputedStyle(el).clipPath),
  "none",
);
await reduced.close();
const classic = await pageFor();
await classic.goto(`${base}?entrance=classic`);
await classic.locator(".opening").waitFor();
assert.equal(await classic.locator(".origin-entrance").count(), 0);
await classic.locator(".opening").waitFor({ state: "hidden" });
await classic.close();
const slow = await pageFor();
await slow.route("**/shega-boss-hero.webp", async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 2200));
  await route.continue();
});
await slow.goto(base, { waitUntil: "domcontentloaded" });
await slow.waitForFunction(
  () => window.__shegaOrigin?.phase === "settled",
  {},
  { timeout: 6000 },
);
assert.equal(
  await slow.locator(".site-shell").evaluate((el) => el.inert),
  false,
);
await slow.close();
for (const route of ["contact", "product/boss-signature-hoodie"]) {
  const p = await pageFor();
  await p.goto(`${base}${route}`);
  await p.waitForFunction(() => window.__shegaOrigin?.phase === "settled");
  assert.equal(
    await p
      .locator(".site-shell")
      .evaluate((el) => getComputedStyle(el).clipPath),
    "none",
  );
  assert.equal(
    await p.locator("h1").evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  await p.close();
}
await browser.close();
assert.deepEqual(errors, []);
await writeFile(
  "artifacts/origin-experiment/verification.json",
  JSON.stringify(results, null, 2),
);
console.log(
  "Passed: exact original final geometry/type/content, desktop/mobile, reduced motion, Escape, resize, slow image, navigation, deep routes, original-opening fallback.",
);
