import { expect } from "@playwright/test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Called by workspace-ui.mjs against its temporary API/database.
export async function checkCustomerAccounts(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() =>
    localStorage.setItem(
      "shega-consent-v1",
      JSON.stringify({ version: 1, optional: false, time: Date.now() }),
    ),
  );
  const page = await context.newPage(),
    errors = [];
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  const password = `Customer browser ${randomUUID()}`,
    nextPassword = `Changed browser ${randomUUID()}`;
  const email = "browser-customer@example.test";
  try {
    await page.goto(base + "/account/create");
    await expect(
      page.getByRole("heading", {
        name: "Make yourself at home.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Your account", exact: true }),
    ).toBeVisible();
    assert.equal(
      await page.locator(".opening,.origin-entrance").count(),
      0,
      "Account access must not wait through the storefront intro",
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: "artifacts/customer-create-1440.png",
      fullPage: true,
    });
    await page
      .getByLabel("Your name", { exact: true })
      .fill("Customer Example");
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Passphrase", { exact: true }).fill(password);
    await page
      .getByLabel("Confirm passphrase", { exact: true })
      .fill("Mismatched test passphrase");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText(
      "The passphrases do not match.",
    );
    await page.getByLabel("Confirm passphrase", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(base + "/account");
    await expect(
      page.getByRole("heading", { name: "Your account.", exact: true }),
    ).toBeVisible();
    assert.equal(
      (await page.request.get(base + "/api/admin/products")).status(),
      401,
    );
    await page
      .getByLabel("Your name", { exact: true })
      .fill("Updated Customer");
    await page
      .getByRole("button", { name: "Save details", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Your details are saved." }),
    ).toBeVisible();
    await page.screenshot({
      path: "artifacts/customer-account-1440.png",
      fullPage: true,
    });
    await page.getByLabel("Current passphrase", { exact: true }).fill(password);
    await page.getByLabel("New passphrase", { exact: true }).fill(nextPassword);
    await page
      .getByLabel("Confirm new passphrase", { exact: true })
      .fill(nextPassword);
    await page
      .getByRole("button", { name: "Update passphrase", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Passphrase updated." }),
    ).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(base + "/account");
      await expect(
        page.getByRole("heading", { name: "Your account.", exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Customer profile at ${width}px overflows`,
      );
      if (width === 390)
        await page.screenshot({
          path: "artifacts/customer-account-390.png",
          fullPage: true,
        });
    }
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(base + "/account/sign-in");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ["/account/sign-in", "/account/create"]) {
        await page.goto(base + route);
        await expect(page.locator(".account-access h1")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${route} at ${width}px overflows`,
        );
        if (width === 390)
          await page.screenshot({
            path: `artifacts/customer-${route.endsWith("create") ? "create" : "sign-in"}-390.png`,
            fullPage: true,
          });
      }
    }
    await page.goto(base + "/account/sign-in");
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Passphrase", { exact: true }).fill(nextPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(base + "/account");
    await expect(
      page.getByText("Welcome back, Updated Customer.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your account.", exact: true }),
    ).toBeVisible();
    await page.goto(base + "/admin");
    await expect(page).toHaveURL(base + "/login");
    await expect(
      page.getByRole("heading", { name: "Sign in", exact: true }),
    ).toBeVisible();
    assert.deepEqual(errors, []);
    console.log(
      "Customer browser checks passed: registration, confirmation validation, login/logout, profile, passphrase rotation, persistence, staff isolation, 320/390/1440px layouts.",
    );
  } finally {
    await context.close();
  }
}
