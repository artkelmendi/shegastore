import { backup } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { openDatabase } from "../server/database.mjs";
import { products } from "../src/data.js";

// Explicit local operation: archive the previous catalog, preserve users and stock
// history, and publish the supplied campaign collection. Never runs on startup.
if (!process.argv.includes("--apply")) {
  console.log(
    `Ready to replace the public local catalog with ${products.length} campaign products. Run with --apply.`,
  );
  process.exit(0);
}
const db = openDatabase();
try {
  const snapshot = resolve("var", `before-campaign-${Date.now()}.sqlite`);
  await backup(db, snapshot);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE products SET status='archived', updated_at=CURRENT_TIMESTAMP",
    ).run();
    const insert =
      db.prepare(`INSERT INTO products(id,name,brand,category,price_cents,compare_at_cents,status,description,color,hex,image,gallery_json,fresh)
      VALUES(?,?,?,?,?,?, 'published',?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,category=excluded.category,
      price_cents=excluded.price_cents,compare_at_cents=excluded.compare_at_cents,status='published',
      description=excluded.description,color=excluded.color,hex=excluded.hex,image=excluded.image,
      gallery_json=excluded.gallery_json,fresh=excluded.fresh,updated_at=CURRENT_TIMESTAMP`);
    const variant = db.prepare(
      "INSERT OR IGNORE INTO product_variants(id,product_id,size,color,sku) VALUES(?,?,?,?,?)",
    );
    for (const p of products) {
      insert.run(
        p.id,
        p.name,
        p.brand,
        p.category,
        p.price * 100,
        p.oldPrice ? p.oldPrice * 100 : null,
        p.description,
        p.color,
        p.hex,
        p.image,
        JSON.stringify(p.gallery),
        p.fresh ? 1 : 0,
      );
      for (const size of p.sizes)
        variant.run(
          randomUUID(),
          p.id,
          size,
          p.color,
          `${p.id}-${size}`.toUpperCase(),
        );
    }
    db.exec("COMMIT");
    console.log(
      `Published ${products.length} campaign products locally. Previous products archived; backup: ${snapshot}`,
    );
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
} finally {
  db.close();
}
