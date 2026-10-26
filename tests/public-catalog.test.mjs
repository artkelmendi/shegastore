import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { resolve, join } from "node:path";
import { openDatabase } from "../server/database.mjs";
import { createApi } from "../server/index.mjs";
test("public catalog hides internal pricing and staff endpoints require sign-in", async () => {
  const directory = await mkdtemp(resolve("artifacts/public-catalog-test-"));
  const db = openDatabase(join(directory, "test.sqlite"));
  const product = db.prepare("SELECT id FROM products LIMIT 1").get();
  db.prepare(
    "UPDATE products SET price_cents=9900,compare_at_cents=12000 WHERE id=?",
  ).run(product.id);
  const { server } = createApi({
    db,
    mediaDir: join(directory, "media"),
    origin: "http://localhost:5173",
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base + "/api/catalog");
    assert.equal(response.status, 200);
    const data = await response.json();
    assert(data.products.length > 0);
    for (const item of data.products) {
      assert.equal(item.price, null);
      assert.equal(item.oldPrice, undefined);
      assert.equal(item.price_cents, undefined);
      assert.equal(item.compare_at_cents, undefined);
    }
    const staff = await fetch(base + "/api/admin/products");
    assert.equal(staff.status, 401);
    assert.equal(
      db.prepare("SELECT price_cents FROM products WHERE id=?").get(product.id)
        .price_cents,
      9900,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
