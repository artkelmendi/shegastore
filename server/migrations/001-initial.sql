CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS staff_users(
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','editor')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS staff_sessions(
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON staff_sessions(expires_at);
CREATE TABLE IF NOT EXISTS products(
 id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL, category TEXT NOT NULL,
 price_cents INTEGER NOT NULL CHECK(price_cents >= 0), compare_at_cents INTEGER CHECK(compare_at_cents > price_cents),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 description TEXT NOT NULL DEFAULT '', color TEXT NOT NULL, hex TEXT NOT NULL DEFAULT '#222222',
 image TEXT NOT NULL, gallery_json TEXT NOT NULL DEFAULT '[]', fresh INTEGER NOT NULL DEFAULT 0 CHECK(fresh IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS products_status ON products(status);
CREATE TABLE IF NOT EXISTS product_variants(
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), size TEXT NOT NULL, color TEXT NOT NULL,
 sku TEXT NOT NULL UNIQUE, on_hand INTEGER NOT NULL DEFAULT 0 CHECK(on_hand >= 0),
 reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0 AND reserved <= on_hand),
 tracked INTEGER NOT NULL DEFAULT 0 CHECK(tracked IN (0,1)), version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(product_id,size,color)
);
CREATE INDEX IF NOT EXISTS variants_product ON product_variants(product_id);
CREATE TABLE IF NOT EXISTS stock_movements(
 id TEXT PRIMARY KEY, variant_id TEXT NOT NULL REFERENCES product_variants(id),
 delta INTEGER NOT NULL, quantity_after INTEGER NOT NULL CHECK(quantity_after >= 0),
 reason TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', actor_id TEXT REFERENCES staff_users(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS movements_variant ON stock_movements(variant_id,created_at);
CREATE TRIGGER IF NOT EXISTS stock_history_no_update BEFORE UPDATE ON stock_movements BEGIN SELECT RAISE(ABORT,'Stock history is append-only'); END;
CREATE TRIGGER IF NOT EXISTS stock_history_no_delete BEFORE DELETE ON stock_movements BEGIN SELECT RAISE(ABORT,'Stock history is append-only'); END;
CREATE TABLE IF NOT EXISTS audit_log(
 id TEXT PRIMARY KEY, actor_id TEXT REFERENCES staff_users(id), action TEXT NOT NULL,
 entity_id TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);
