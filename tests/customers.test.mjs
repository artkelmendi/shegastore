import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../server/database.mjs";
import { createApi } from "../server/index.mjs";
import { products as seedProducts } from "../src/data.js";

test("customer migration preserves the existing staff database", async () => {
  const directory = await mkdtemp(resolve("artifacts/migration-test-"));
  const file = join(directory, "legacy.sqlite");
  const legacy = new DatabaseSync(file);
  legacy.exec(await readFile("server/migrations/001-initial.sql", "utf8"));
  legacy
    .prepare(
      "INSERT INTO staff_users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)",
    )
    .run(
      randomUUID(),
      "legacy@example.test",
      "Existing staff",
      "test-migration-hash",
      "admin",
    );
  legacy.close();
  for (let i = 0; i < 2; i++) {
    const db = openDatabase(file);
    assert.equal(
      db.prepare("SELECT name FROM staff_users").get().name,
      "Existing staff",
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM products").get().n,
      seedProducts.length,
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM customers").get().n, 0);
    assert.deepEqual(
      db
        .prepare("SELECT version FROM schema_migrations ORDER BY version")
        .all()
        .map((r) => r.version),
      [1, 2],
    );
    db.close();
  }
});

test("customer registration, profile, password rotation and staff isolation", async () => {
  const directory = await mkdtemp(resolve("artifacts/customer-api-test-"));
  const db = openDatabase(join(directory, "test.sqlite"));
  const { server } = createApi({
    db,
    mediaDir: join(directory, "media"),
    origin: "http://localhost:5173",
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const password = `Customer ${randomUUID()}`,
    staffPassword = `Staff ${randomUUID()}`,
    nextPassword = `Updated ${randomUUID()}`;
  const email = "person@example.test";
  const request = async (
    path,
    {
      method = "GET",
      body,
      cookie = "",
      origin = "http://localhost:5173",
    } = {},
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: origin,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      headers: response.headers,
    };
  };
  try {
    assert.equal((await request("/api/customer/session")).data.customer, null);
    assert.equal(
      (
        await request("/api/customer/profile", {
          method: "PATCH",
          body: { name: "Guest", version: 1 },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request("/api/customer/register", {
          method: "POST",
          origin: "https://untrusted.example",
          body: { name: "Blocked", email, password },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/api/customer/register", {
          method: "POST",
          body: { name: "Short", email, password: "too short" },
        })
      ).status,
      422,
    );
    const signup = await request("/api/customer/register", {
      method: "POST",
      body: {
        name: "Customer One",
        email: email.toUpperCase(),
        password,
        role: "admin",
        active: false,
      },
    });
    assert.equal(signup.status, 200);
    assert.match(signup.cookie, /^shega_customer=/);
    assert.match(signup.headers.get("set-cookie"), /HttpOnly/);
    assert.match(signup.headers.get("set-cookie"), /SameSite=Strict/);
    assert.equal(signup.data.customer.email, email);
    assert.equal(signup.data.customer.role, undefined);
    assert.equal(signup.data.customer.password_hash, undefined);
    const customer = db.prepare("SELECT * FROM customers").get();
    assert.ok(
      customer.password_hash.startsWith("scrypt$") &&
        !customer.password_hash.includes(password),
    );
    assert.notEqual(
      db.prepare("SELECT token_hash FROM customer_sessions").get().token_hash,
      signup.cookie.split("=")[1],
    );
    assert.equal(
      (await request("/api/auth/session", { cookie: signup.cookie })).data
        .configured,
      false,
      "customer registration never provisions staff",
    );
    assert.equal(
      (await request("/api/admin/products", { cookie: signup.cookie })).status,
      401,
    );
    assert.equal(
      (
        await request("/api/admin/products", {
          cookie: signup.cookie.replace("shega_customer=", "shega_staff="),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request("/api/customer/register", {
          method: "POST",
          body: { name: "Duplicate", email, password },
        })
      ).status,
      409,
    );
    const other = await request("/api/customer/register", {
      method: "POST",
      body: { name: "Other customer", email: "other@example.test", password },
    });
    assert.equal(other.status, 200);
    const profile = await request("/api/customer/profile", {
      method: "PATCH",
      cookie: signup.cookie,
      body: {
        name: "Updated Customer",
        version: 1,
        id: other.data.customer.id,
        email: "tampered@example.test",
        role: "admin",
      },
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.data.customer.name, "Updated Customer");
    assert.equal(profile.data.customer.email, email);
    assert.equal(
      db
        .prepare("SELECT name FROM customers WHERE id=?")
        .get(other.data.customer.id).name,
      "Other customer",
    );
    assert.equal(
      (
        await request("/api/customer/profile", {
          method: "PATCH",
          cookie: signup.cookie,
          body: { name: "Stale", version: 1 },
        })
      ).status,
      409,
    );
    const staff = await request("/api/auth/setup", {
      method: "POST",
      body: { name: "Staff Operator", email, password: staffPassword },
    });
    assert.equal(
      staff.status,
      200,
      "same email can have separate customer and staff credentials",
    );
    assert.equal(
      (await request("/api/customer/session", { cookie: staff.cookie })).data
        .customer,
      null,
    );
    assert.equal(
      (
        await request("/api/customer/session", {
          cookie: staff.cookie.replace("shega_staff=", "shega_customer="),
        })
      ).data.customer,
      null,
    );
    assert.equal(
      (
        await request("/api/customer/login", {
          method: "POST",
          body: { email, password: staffPassword },
        })
      ).status,
      401,
    );
    const secondSession = await request("/api/customer/login", {
      method: "POST",
      body: { email, password },
    });
    assert.equal(secondSession.status, 200);
    assert.equal(
      (
        await request("/api/customer/password", {
          method: "POST",
          cookie: signup.cookie,
          body: {
            currentPassword: "Incorrect old passphrase",
            newPassword: nextPassword,
          },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request("/api/customer/password", {
          method: "POST",
          cookie: signup.cookie,
          body: { currentPassword: password, newPassword: password },
        })
      ).status,
      422,
    );
    const rotated = await request("/api/customer/password", {
      method: "POST",
      cookie: signup.cookie,
      body: { currentPassword: password, newPassword: nextPassword },
    });
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.cookie, signup.cookie);
    assert.equal(
      (await request("/api/customer/session", { cookie: signup.cookie })).data
        .customer,
      null,
    );
    assert.equal(
      (await request("/api/customer/session", { cookie: secondSession.cookie }))
        .data.customer,
      null,
    );
    assert.equal(
      (await request("/api/customer/session", { cookie: rotated.cookie })).data
        .customer.name,
      "Updated Customer",
    );
    assert.equal(
      (await request("/api/auth/session", { cookie: staff.cookie })).data.user
        .role,
      "admin",
      "customer password rotation cannot revoke a staff session",
    );
    assert.equal(
      (
        await request("/api/customer/login", {
          method: "POST",
          body: { email, password },
        })
      ).status,
      401,
    );
    const newLogin = await request("/api/customer/login", {
      method: "POST",
      body: { email, password: nextPassword },
    });
    assert.equal(newLogin.status, 200);
    await request("/api/customer/logout", {
      method: "POST",
      cookie: newLogin.cookie,
    });
    assert.equal(
      (await request("/api/customer/session", { cookie: newLogin.cookie })).data
        .customer,
      null,
    );
    db.prepare(
      "UPDATE customer_sessions SET expires_at=0 WHERE customer_id=?",
    ).run(customer.id);
    assert.equal(
      (await request("/api/customer/session", { cookie: rotated.cookie })).data
        .customer,
      null,
    );
    assert.equal(
      (await request("/api/customer/session", { cookie: other.cookie })).data
        .customer.name,
      "Other customer",
    );
    let rateLimited = false;
    for (let i = 0; i < 11; i++) {
      const response = await request("/api/customer/login", {
        method: "POST",
        body: { email, password: "Deliberately incorrect passphrase" },
      });
      if (response.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert.ok(rateLimited);
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});
