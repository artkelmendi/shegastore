import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { openDatabase } from "../server/database.mjs";
import { createApi } from "../server/index.mjs";
test("staff sessions, catalogue editing and atomic stock history", async (t) => {
  const directory = await mkdtemp(resolve("artifacts/api-test-"));
  const db = openDatabase(join(directory, "test.sqlite"));
  const { server } = createApi({
    db,
    mediaDir: join(directory, "media"),
    origin: "http://localhost:5173",
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  const password = `Test workspace ${randomUUID()}`;
  const request = async (
    path,
    {
      method = "GET",
      body,
      authenticated = true,
      origin = "http://localhost:5173",
    } = {},
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: origin,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { response, data, status: response.status };
  };
  try {
    assert.equal(
      (await request("/api/admin/products", { authenticated: false })).status,
      401,
    );
    assert.equal(
      (
        await request("/api/auth/setup", {
          method: "POST",
          origin: "https://untrusted.example",
          body: {},
        })
      ).status,
      403,
    );
    const setup = await request("/api/auth/setup", {
      method: "POST",
      body: { name: "Test Operator", email: "operator@example.test", password },
    });
    assert.equal(setup.status, 200);
    cookie = setup.response.headers.get("set-cookie").split(";")[0];
    assert.match(setup.response.headers.get("set-cookie"), /HttpOnly/);
    assert.match(setup.response.headers.get("set-cookie"), /SameSite=Strict/);
    assert.equal(setup.data.user.role, "admin");
    assert.equal(setup.data.user.password_hash, undefined);
    const user = db.prepare("SELECT * FROM staff_users").get();
    assert.ok(user.password_hash.startsWith("scrypt$"));
    assert.ok(!user.password_hash.includes(password));
    assert.notEqual(
      db.prepare("SELECT token_hash FROM staff_sessions").get().token_hash,
      cookie.split("=")[1],
    );
    assert.equal(
      (
        await request("/api/auth/setup", {
          method: "POST",
          body: {
            name: "Other Operator",
            email: "other@example.test",
            password,
          },
        })
      ).status,
      409,
    );
    const source = await request("/api/admin/products");
    assert.equal(source.data.products.length, 8);
    assert.ok(
      source.data.products.every((p) =>
        p.variants.every((v) => v.tracked === 0 && v.on_hand === 0),
      ),
    );
    const product = {
      id: "test-special-tee",
      name: "Special test tee",
      brand: "DIESEL",
      category: "T-Shirts",
      price_cents: 5300,
      compare_at_cents: null,
      status: "draft",
      description: "Test product description.",
      color: "Black",
      hex: "#222222",
      image: "diesel-special-117",
      gallery: ["diesel-special-117"],
      fresh: true,
      sizes: ["S", "M"],
    };
    assert.equal(
      (
        await request("/api/admin/products", {
          method: "POST",
          body: { ...product, price_cents: -1 },
        })
      ).status,
      422,
    );
    const create = await request("/api/admin/products", {
      method: "POST",
      body: product,
    });
    assert.equal(create.status, 201);
    assert.equal(create.data.product.variants.length, 2);
    assert.ok(
      !(await request("/api/catalog")).data.products.some(
        (p) => p.id === product.id,
      ),
    );
    const publish = await request(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      body: { ...create.data.product, status: "published" },
    });
    assert.equal(publish.status, 200);
    assert.ok(
      (await request("/api/catalog")).data.products.some(
        (p) => p.id === product.id,
      ),
    );
    assert.equal(
      (
        await request(`/api/admin/products/${product.id}`, {
          method: "PATCH",
          body: { ...create.data.product, status: "published" },
        })
      ).status,
      409,
      "stale edit is rejected",
    );
    const variant = publish.data.product.variants[0];
    const adjustment = {
      operation: "set",
      amount: 6,
      reason: "Stock count",
      note: "Counted for the test.",
      version: variant.version,
    };
    assert.equal(
      (
        await request(`/api/admin/variants/${variant.id}/stock`, {
          method: "POST",
          body: adjustment,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(`/api/admin/variants/${variant.id}/stock`, {
          method: "POST",
          body: adjustment,
        })
      ).status,
      409,
      "stale stock write is rejected",
    );
    let latest = db
      .prepare("SELECT * FROM product_variants WHERE id=?")
      .get(variant.id);
    assert.equal(latest.on_hand, 6);
    assert.equal(latest.tracked, 1);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM stock_movements").get().n,
      1,
    );
    assert.equal(
      (
        await request(`/api/admin/variants/${variant.id}/stock`, {
          method: "POST",
          body: {
            ...adjustment,
            operation: "remove",
            amount: 7,
            version: latest.version,
          },
        })
      ).status,
      422,
    );
    assert.equal(
      db
        .prepare("SELECT on_hand FROM product_variants WHERE id=?")
        .get(variant.id).on_hand,
      6,
    );
    db.prepare("UPDATE product_variants SET reserved=2 WHERE id=?").run(
      variant.id,
    );
    assert.equal(
      (
        await request(`/api/admin/variants/${variant.id}/stock`, {
          method: "POST",
          body: { ...adjustment, amount: 1, version: latest.version },
        })
      ).status,
      422,
      "reserved stock is protected",
    );
    assert.throws(
      () => db.prepare("DELETE FROM stock_movements").run(),
      /append-only/,
    );
    const publicPiece = (await request("/api/catalog")).data.products.find(
      (p) => p.id === product.id,
    );
    assert.equal(publicPiece.stock.S.available, 4);
    assert.equal(publicPiece.stock.S.tracked, true);
    assert.equal(publicPiece.sku, undefined);
    assert.equal(
      (
        await request("/api/admin/media", {
          method: "POST",
          body: { data: Buffer.from("<svg/>").toString("base64") },
        })
      ).status,
      415,
    );
    const photo = await readFile("public/images/real/diesel-special-117.webp");
    const upload = await request("/api/admin/media", {
      method: "POST",
      body: { data: photo.toString("base64") },
    });
    assert.equal(upload.status, 201);
    const media = await fetch(base + upload.data.image);
    assert.equal(media.headers.get("content-type"), "image/webp");
    assert.equal(media.headers.get("x-content-type-options"), "nosniff");
    const log = await request("/api/admin/activity");
    assert.ok(log.data.activity.some((a) => a.action === "stock.adjusted"));
    assert.equal(log.data.movements[0].quantity_after, 6);
    assert.equal(
      (
        await request(`/api/admin/products/${product.id}`, {
          method: "PATCH",
          body: { ...publish.data.product, status: "archived" },
        })
      ).status,
      200,
    );
    assert.ok(
      !(await request("/api/catalog")).data.products.some(
        (p) => p.id === product.id,
      ),
    );
    await request("/api/auth/logout", { method: "POST" });
    assert.equal((await request("/api/admin/products")).status, 401);
    assert.equal(
      (
        await request("/api/auth/login", {
          method: "POST",
          body: {
            email: user.email,
            password: "An incorrect long test password",
          },
        })
      ).status,
      401,
    );
    const login = await request("/api/auth/login", {
      method: "POST",
      body: { email: user.email, password },
    });
    assert.equal(login.status, 200);
    cookie = login.response.headers.get("set-cookie").split(";")[0];
    db.prepare("UPDATE staff_sessions SET expires_at=0").run();
    assert.equal((await request("/api/admin/products")).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
});
