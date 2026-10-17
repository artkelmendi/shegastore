import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { openDatabase } from "../server/database.mjs";
import { createApi } from "../server/index.mjs";
import { checkCustomerAccounts } from "./customer-browser.mjs";

// All credentials, products and stock changes stay in this isolated test database.
const directory = await mkdtemp(resolve("artifacts/workspace-ui-"));
const db = openDatabase(join(directory, "test.sqlite"));
const { server } = createApi({
  db,
  mediaDir: join(directory, "media"),
  origin: "http://localhost:5174",
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const vite = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5174"],
  {
    env: {
      ...process.env,
      API_PROXY_TARGET: `http://127.0.0.1:${server.address().port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
vite.stdout.on("data", (c) => (logs += c));
vite.stderr.on("data", (c) => (logs += c));
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5174/@vite/client")).ok) break;
    } catch {}
    if (vite.exitCode !== null) throw new Error(logs);
    if (i === 59) throw new Error("Test Vite did not start. " + logs);
    await new Promise((r) => setTimeout(r, 150));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://localhost:5174";
  await page.goto(base + "/admin/products");
  await expect(page).toHaveURL(base + "/login");
  await expect(
    page.getByRole("heading", { name: "Set up your workspace" }),
  ).toBeVisible();
  const password = `Workspace UI ${randomUUID()}`;
  await page.getByLabel("Your name", { exact: true }).fill("Test Operator");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("ui@example.test");
  await page.getByLabel("Passphrase", { exact: true }).fill(password);
  await page.getByLabel("Confirm passphrase", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create administrator" }).click();
  await expect(page).toHaveURL(base + "/admin");
  await expect(page.getByText("Sizes to count", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "artifacts/workspace-overview-1440.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Products" })
    .click();
  await page.getByRole("link", { name: "Add product", exact: true }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Studio test polo");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A test piece for the isolated workspace browser check.");
  await page.getByLabel("Price · EUR", { exact: true }).fill("62.50");
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/images/real/diesel-special-117.webp");
  await expect(page.getByAltText("Main product preview")).toBeVisible();
  await page.screenshot({
    path: "artifacts/workspace-editor-1440.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page).toHaveURL(base + "/admin/products");
  await page.getByLabel("Search products").fill("Studio test polo");
  await expect(
    page.getByRole("table").getByText("Draft", { exact: true }),
  ).toBeVisible();
  assert.ok(
    !(
      await (await page.request.get(base + "/api/catalog")).json()
    ).products.some((p) => p.id === "studio-test-polo"),
  );
  await page.getByRole("link", { name: "Edit Studio test polo" }).click();
  await expect(page).toHaveURL(base + "/admin/products/studio-test-polo");
  await expect(
    page.getByRole("heading", { name: "Edit product", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Status", { exact: true }).selectOption("published");
  await page.getByLabel("Colour name", { exact: true }).fill("Ink");
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Stock", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Leave this edit?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page).toHaveURL(base + "/admin/products/studio-test-polo");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page).toHaveURL(base + "/admin/products");
  await page.goto(base + "/product/studio-test-polo");
  await expect(
    page.getByRole("button", { name: "Out of stock", exact: true }),
  ).toBeDisabled();
  await page.goto(base + "/admin/stock");
  await page.getByLabel("Search stock").fill("Studio test polo");
  assert.ok(
    (await page.getByLabel("Search stock").boundingBox()).width > 250,
    "Desktop stock search must remain readable",
  );
  assert.ok(
    (await page.getByLabel("Stock filter").boundingBox()).width < 240,
    "Stock filter must not consume the search space",
  );
  const row = page.getByRole("row").filter({ hasText: "STUDIO-TEST-POLO-M" });
  await row.getByRole("button", { name: "Adjust" }).click();
  await expect(
    page.getByRole("dialog").getByText("M / Ink", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Quantity", { exact: true }).fill("5");
  await page
    .getByLabel("Note · optional", { exact: true })
    .fill("Browser test count");
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "STUDIO-TEST-POLO-M" })
      .getByText("Confirmed", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/workspace-stock-1440.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Workspace navigation" })
    .getByRole("link", { name: "Activity" })
    .click();
  await expect(
    page.getByRole("cell", { name: "Browser test count" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/workspace-activity-1440.png",
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/admin",
      "/admin/products",
      "/admin/products/studio-test-polo",
      "/admin/stock",
      "/admin/activity",
    ]) {
      await page.goto(base + route);
      await expect(page.locator(".workspace-content h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${route} at ${width}px overflows`,
      );
      if (width === 390 && route === "/admin")
        await page.screenshot({
          path: "artifacts/workspace-overview-390.png",
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/product/studio-test-polo");
  await page.getByRole("button", { name: "M", exact: true }).click();
  await expect(
    page.getByText("5 available in size M", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "S", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const plus = page.getByRole("button", {
    name: "Increase quantity of Studio test polo in size M",
  });
  for (let i = 0; i < 4; i++) await plus.click();
  await expect(plus).toBeDisabled();
  await page.goto(base + "/admin");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("ui@example.test");
  await page.getByLabel("Passphrase", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(base + "/admin");
  assert.deepEqual(errors, []);
  await checkCustomerAccounts(browser, base);
  console.log(
    "Workspace browser checks passed: setup/login, product upload/create/edit/publish, size stock, activity, storefront availability, quantity limits, 320/390/1440px layouts.",
  );
} finally {
  await browser?.close();
  vite.kill();
  await new Promise((r) => server.close(r));
  db.close();
}
