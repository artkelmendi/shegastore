import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { products as samples } from "../src/data.js";
export function openDatabase(
  path = process.env.DATABASE_PATH ||
    fileURLToPath(new URL("../var/shega.sqlite", import.meta.url)),
) {
  const filename = resolve(path);
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  for (const migration of ["001-initial.sql", "002-customers.sql"]) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(
        readFileSync(
          new URL(`./migrations/${migration}`, import.meta.url),
          "utf8",
        ).replace(/^\uFEFF/, ""),
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }
  if (!db.prepare("SELECT 1 FROM products LIMIT 1").get()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const p of samples) {
        db.prepare(
          "INSERT INTO products(id,name,brand,category,price_cents,compare_at_cents,status,description,color,hex,image,gallery_json,fresh) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          p.id,
          p.name,
          p.brand,
          p.category,
          p.price * 100,
          p.oldPrice ? p.oldPrice * 100 : null,
          "published",
          p.description,
          p.color,
          p.hex,
          p.image,
          JSON.stringify(p.gallery || [p.image]),
          p.fresh ? 1 : 0,
        );
        for (const size of p.sizes)
          db.prepare(
            "INSERT INTO product_variants(id,product_id,size,color,sku) VALUES(?,?,?,?,?)",
          ).run(
            randomUUID(),
            p.id,
            size,
            p.color,
            `${p.id}-${size}`.toUpperCase(),
          );
      }
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
export function productRecord(db, row) {
  if (!row) return null;
  return {
    ...row,
    gallery: JSON.parse(row.gallery_json),
    variants: db
      .prepare(
        "SELECT * FROM product_variants WHERE product_id=? ORDER BY rowid",
      )
      .all(row.id),
    gallery_json: undefined,
  };
}
export function publicProduct(db, row) {
  const p = productRecord(db, row);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price_cents / 100,
    oldPrice: p.compare_at_cents ? p.compare_at_cents / 100 : undefined,
    image: p.image,
    alternate: p.gallery[1],
    gallery: p.gallery,
    color: p.color,
    hex: p.hex,
    sizes: p.variants.map((v) => v.size),
    fresh: !!p.fresh,
    description: p.description,
    stock: Object.fromEntries(
      p.variants.map((v) => [
        v.size,
        { available: v.on_hand - v.reserved, tracked: !!v.tracked },
      ]),
    ),
  };
}
