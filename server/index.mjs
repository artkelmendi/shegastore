import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { openDatabase, productRecord, publicProduct } from "./database.mjs";
import { hashPassword, checkPassword, newToken, tokenHash } from "./auth.mjs";
import { createCustomerHandler } from "./customers.mjs";
const brands = ["BOSS", "DIESEL", "EMPORIO ARMANI", "HUGO"];
const categories = ["T-Shirts", "Hoodies", "Sweatshirts"];
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const text = (value, label, min = 1, max = 120) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    fail(422, `${label} must contain ${min}–${max} characters.`);
  return value.trim();
};
const integer = (value, label, min = 0, max = 10000000) => {
  if (!Number.isInteger(value) || value < min || value > max)
    fail(422, `${label} must be a whole number between ${min} and ${max}.`);
  return value;
};
const email = (v) => {
  const s = text(v, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    fail(422, "Enter a valid email address.");
  return s;
};
const image = (v) => {
  const s = text(v, "Image", 1, 1000);
  if (
    !/^[a-zA-Z0-9-]+$/.test(s) &&
    !/^\/api\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(s)
  )
    fail(
      422,
      "Choose an existing product photo or upload a JPEG, PNG or WebP.",
    );
  return s;
};
async function body(req) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    fail(415, "Use application/json.");
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 6 * 1024 * 1024) fail(413, "Request is too large.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Use a JSON object.");
    return value;
  } catch {
    fail(400, "Invalid JSON.");
  }
}
export function createApi({
  db = openDatabase(),
  origin = process.env.APP_ORIGIN || "http://localhost:5173",
  mediaDir = process.env.MEDIA_PATH ||
    fileURLToPath(new URL("../var/media/", import.meta.url)),
  allowSetup = process.env.NODE_ENV !== "production",
} = {}) {
  const origins = new Set([
    origin,
    ...(process.env.NODE_ENV !== "production" ? ["http://127.0.0.1:5173"] : []),
  ]);
  const attempts = new Map();
  const cookieName = "shega_staff";
  const secure = process.env.NODE_ENV === "production";
  const cookie = (token = "", age = 0) =>
    `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const send = (res, status, data, headers = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    });
    res.end(JSON.stringify(data));
  };
  const audit = (user, action, id, summary) =>
    db
      .prepare(
        "INSERT INTO audit_log(id,actor_id,action,entity_id,summary) VALUES(?,?,?,?,?)",
      )
      .run(randomUUID(), user.id, action, id, summary);
  const transaction = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const limit = (req, bucket) => {
    const key = `${bucket}:${req.socket.remoteAddress}`,
      now = Date.now();
    let rate = attempts.get(key);
    if (!rate || rate.until < now) {
      rate = { count: 0, until: now + 15 * 60000 };
      attempts.set(key, rate);
    }
    if (++rate.count > 10)
      fail(429, "Too many attempts. Try again in 15 minutes.");
  };
  const customerHandler = createCustomerHandler({
    db,
    send,
    body,
    fail,
    text,
    email,
    transaction,
    secure,
    limit,
  });
  const findUser = (req) => {
    const raw = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (!raw || raw.length > 128) return null;
    return db
      .prepare(
        "SELECT u.id,u.email,u.name,u.role FROM staff_sessions s JOIN staff_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
      )
      .get(tokenHash(raw), Date.now());
  };
  const session = (res, user) => {
    const token = newToken();
    db.prepare("DELETE FROM staff_sessions WHERE expires_at<=?").run(
      Date.now(),
    );
    db.prepare(
      "INSERT INTO staff_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
    ).run(tokenHash(token), user.id, Date.now() + 8 * 3600000);
    send(res, 200, { user }, { "Set-Cookie": cookie(token, 8 * 3600) });
  };
  const validateProduct = (input) => {
    const name = text(input.name, "Product name", 2, 120),
      id = text(input.id, "URL handle", 2, 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
      fail(
        422,
        "Use lowercase letters, numbers and hyphens for the URL handle.",
      );
    if (!brands.includes(input.brand) || !categories.includes(input.category))
      fail(422, "Choose a brand and category.");
    if (!["draft", "published", "archived"].includes(input.status))
      fail(422, "Choose a product status.");
    const price = integer(input.price_cents, "Price", 1);
    const compare =
      input.compare_at_cents == null
        ? null
        : integer(input.compare_at_cents, "Original price", price + 1);
    const color = text(input.color, "Colour", 1, 40);
    if (!/^#[a-f0-9]{6}$/i.test(input.hex)) fail(422, "Choose a valid colour.");
    const gallery =
      Array.isArray(input.gallery) && input.gallery.length
        ? input.gallery.map(image)
        : [image(input.image)];
    if (gallery.length > 8) fail(422, "Use up to eight product photos.");
    return {
      id,
      name,
      brand: input.brand,
      category: input.category,
      price_cents: price,
      compare_at_cents: compare,
      status: input.status,
      description: text(input.description, "Description", 0, 3000),
      color,
      hex: input.hex,
      image: image(input.image),
      gallery,
      fresh: input.fresh ? 1 : 0,
    };
  };
  const productValues = (p) => [
    p.name,
    p.brand,
    p.category,
    p.price_cents,
    p.compare_at_cents,
    p.status,
    p.description,
    p.color,
    p.hex,
    p.image,
    JSON.stringify(p.gallery),
    p.fresh,
  ];
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const path = url.pathname;
      const method = req.method;
      if (
        process.env.NODE_ENV !== "production" &&
        !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "")
      )
        fail(403, "Request host is not allowed.");
      if (!["GET", "HEAD"].includes(method) && !origins.has(req.headers.origin))
        fail(403, "Request origin is not allowed.");
      if (
        method === "GET" &&
        /^\/api\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(path)
      ) {
        const name = path.split("/").at(-1);
        let bytes;
        try {
          bytes = await readFile(join(mediaDir, name));
        } catch {
          fail(404, "Photo not found.");
        }
        res.writeHead(200, {
          "Content-Type": name.endsWith(".png")
            ? "image/png"
            : name.endsWith(".webp")
              ? "image/webp"
              : "image/jpeg",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        return res.end(bytes);
      }
      if (method === "GET" && path === "/api/health")
        return send(res, 200, { ok: true, service: "shega-workspace" });
      if (method === "GET" && path === "/api/catalog")
        return send(res, 200, {
          products: db
            .prepare(
              "SELECT * FROM products WHERE status='published' ORDER BY rowid",
            )
            .all()
            .map((p) => publicProduct(db, p)),
        });
      if (method === "GET" && path === "/api/auth/session")
        return send(res, 200, {
          user: findUser(req),
          configured: !!db.prepare("SELECT 1 FROM staff_users LIMIT 1").get(),
          setupAllowed: allowSetup,
        });
      if (await customerHandler(req, res, path, method)) return;
      if (
        method === "POST" &&
        (path === "/api/auth/login" || path === "/api/auth/setup")
      ) {
        limit(req, "staff-auth");
        const input = await body(req);
        const address = email(input.email);
        const password = input.password;
        if (
          typeof password !== "string" ||
          password.length < 15 ||
          password.length > 128
        )
          fail(422, "Use a passphrase of 15–128 characters.");
        if (path.endsWith("/setup")) {
          if (
            !allowSetup ||
            !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
              req.socket.remoteAddress,
            )
          )
            fail(403, "Initial setup is available only in local development.");
          const name = text(input.name, "Name", 2, 80);
          if (db.prepare("SELECT 1 FROM staff_users LIMIT 1").get())
            fail(
              409,
              "The workspace has already been set up. Sign in instead.",
            );
          const hash = await hashPassword(password);
          const user = {
            id: randomUUID(),
            email: address,
            name,
            role: "admin",
          };
          transaction(() => {
            if (db.prepare("SELECT 1 FROM staff_users LIMIT 1").get())
              fail(409, "The workspace has already been set up.");
            db.prepare(
              "INSERT INTO staff_users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)",
            ).run(user.id, user.email, user.name, hash, user.role);
            audit(
              user,
              "account.created",
              user.id,
              "First administrator created",
            );
          });
          return session(res, user);
        }
        const stored = db
          .prepare("SELECT * FROM staff_users WHERE email=? AND active=1")
          .get(address);
        const dummy =
          "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
        if (
          !(await checkPassword(password, stored?.password_hash || dummy)) ||
          !stored
        )
          fail(401, "Email or password is incorrect.");
        const { id, name, role } = stored;
        return session(res, { id, name, role, email: stored.email });
      }
      if (method === "POST" && path === "/api/auth/logout") {
        const raw = (req.headers.cookie || "")
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith(`${cookieName}=`))
          ?.slice(cookieName.length + 1);
        if (raw)
          db.prepare("DELETE FROM staff_sessions WHERE token_hash=?").run(
            tokenHash(raw),
          );
        return send(res, 200, { ok: true }, { "Set-Cookie": cookie() });
      }
      const user = findUser(req);
      if (!user) fail(401, "Sign in to the workspace.");
      if (!["admin", "editor"].includes(user.role))
        fail(403, "Staff access is required.");
      if (method === "GET" && path === "/api/admin/products")
        return send(res, 200, {
          products: db
            .prepare("SELECT * FROM products ORDER BY updated_at DESC,id")
            .all()
            .map((p) => productRecord(db, p)),
        });
      if (method === "GET" && path === "/api/admin/activity")
        return send(res, 200, {
          activity: db
            .prepare(
              "SELECT a.*,u.name AS actor FROM audit_log a LEFT JOIN staff_users u ON u.id=a.actor_id ORDER BY a.rowid DESC LIMIT 50",
            )
            .all(),
          movements: db
            .prepare(
              "SELECT m.*,v.sku,v.size,p.name AS product,u.name AS actor FROM stock_movements m JOIN product_variants v ON v.id=m.variant_id JOIN products p ON p.id=v.product_id LEFT JOIN staff_users u ON u.id=m.actor_id ORDER BY m.rowid DESC LIMIT 50",
            )
            .all(),
        });
      if (method === "POST" && path === "/api/admin/media") {
        const input = await body(req);
        if (
          typeof input.data !== "string" ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)
        )
          fail(422, "Choose a valid image.");
        const bytes = Buffer.from(input.data, "base64");
        if (bytes.length > 4 * 1024 * 1024)
          fail(413, "Use an image smaller than 4 MB.");
        const ext = bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "png"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? "jpg"
            : bytes.toString("ascii", 0, 4) === "RIFF" &&
                bytes.toString("ascii", 8, 12) === "WEBP"
              ? "webp"
              : null;
        if (!ext) fail(415, "Use a JPEG, PNG or WebP photo.");
        await mkdir(mediaDir, { recursive: true });
        const filename = `${randomUUID()}.${ext}`;
        await writeFile(join(mediaDir, filename), bytes, { flag: "wx" });
        return send(res, 201, { image: `/api/media/${filename}` });
      }
      if (method === "POST" && path === "/api/admin/products") {
        const input = await body(req),
          p = validateProduct(input);
        if (
          !Array.isArray(input.sizes) ||
          !input.sizes.length ||
          input.sizes.length > 12
        )
          fail(422, "Choose at least one size.");
        const sizes = [
          ...new Set(input.sizes.map((s) => text(s, "Size", 1, 12))),
        ];
        if (sizes.some((s) => !/^[A-Za-z0-9 -]+$/.test(s)))
          fail(422, "Use letters and numbers for sizes.");
        transaction(() => {
          if (db.prepare("SELECT 1 FROM products WHERE id=?").get(p.id))
            fail(409, "That URL handle is already in use.");
          db.prepare(
            "INSERT INTO products(id,name,brand,category,price_cents,compare_at_cents,status,description,color,hex,image,gallery_json,fresh) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
          ).run(p.id, ...productValues(p));
          for (const size of sizes)
            db.prepare(
              "INSERT INTO product_variants(id,product_id,size,color,sku,tracked) VALUES(?,?,?,?,?,1)",
            ).run(
              randomUUID(),
              p.id,
              size,
              p.color,
              `${p.id}-${size}`.toUpperCase(),
            );
          audit(user, "product.created", p.id, `Added ${p.name}`);
        });
        return send(res, 201, {
          product: productRecord(
            db,
            db.prepare("SELECT * FROM products WHERE id=?").get(p.id),
          ),
        });
      }
      const productMatch = path.match(/^\/api\/admin\/products\/([a-z0-9-]+)$/);
      if (productMatch && method === "PATCH") {
        const input = await body(req);
        const p = validateProduct({ ...input, id: productMatch[1] });
        integer(input.version, "Product version", 1);
        transaction(() => {
          const previous = db
            .prepare("SELECT color FROM products WHERE id=?")
            .get(p.id);
          const result = db
            .prepare(
              "UPDATE products SET name=?,brand=?,category=?,price_cents=?,compare_at_cents=?,status=?,description=?,color=?,hex=?,image=?,gallery_json=?,fresh=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",
            )
            .run(...productValues(p), p.id, input.version);
          if (!result.changes)
            fail(
              409,
              "This product changed since you opened it. Reload before saving.",
            );
          if (previous.color !== p.color)
            db.prepare(
              "UPDATE product_variants SET color=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE product_id=?",
            ).run(p.color, p.id);
          audit(
            user,
            "product.updated",
            p.id,
            `Updated ${p.name} · ${p.status}`,
          );
        });
        return send(res, 200, {
          product: productRecord(
            db,
            db.prepare("SELECT * FROM products WHERE id=?").get(p.id),
          ),
        });
      }
      const stockMatch = path.match(
        /^\/api\/admin\/variants\/([a-f0-9-]+)\/stock$/,
      );
      if (method === "POST" && stockMatch) {
        const input = await body(req);
        const amount = integer(input.amount, "Quantity", 0, 1000000);
        integer(input.version, "Stock version", 1);
        if (!["add", "remove", "set"].includes(input.operation))
          fail(422, "Choose an adjustment type.");
        const reason = text(input.reason, "Reason", 2, 80),
          note = text(input.note || "", "Note", 0, 500);
        transaction(() => {
          const v = db
            .prepare("SELECT * FROM product_variants WHERE id=?")
            .get(stockMatch[1]);
          if (!v) fail(404, "Size not found.");
          if (v.version !== input.version)
            fail(409, "This stock count changed. Reload before adjusting.");
          const next =
            input.operation === "set"
              ? amount
              : v.on_hand + (input.operation === "remove" ? -amount : amount);
          if (next < v.reserved || next < 0)
            fail(
              422,
              "The adjustment would reduce stock below zero or reserved units.",
            );
          db.prepare(
            "UPDATE product_variants SET on_hand=?,tracked=1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",
          ).run(next, v.id, v.version);
          db.prepare(
            "INSERT INTO stock_movements(id,variant_id,delta,quantity_after,reason,note,actor_id) VALUES(?,?,?,?,?,?,?)",
          ).run(
            randomUUID(),
            v.id,
            next - v.on_hand,
            next,
            reason,
            note,
            user.id,
          );
          audit(
            user,
            "stock.adjusted",
            v.id,
            `${v.sku}: ${v.on_hand} → ${next} · ${reason}`,
          );
        });
        return send(res, 200, { ok: true });
      }
      fail(404, "Endpoint not found.");
    } catch (error) {
      if (!res.headersSent) {
        const status = error.status || 500;
        if (status === 500) console.error("API error:", error);
        send(res, status, {
          error:
            status === 500
              ? "The workspace could not complete this request."
              : error.message,
        });
      } else res.end();
    }
  });
  return { server, db };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server } = createApi();
  const port = Number(process.env.API_PORT || 8787);
  server.listen(port, "127.0.0.1", () =>
    console.log(`Shega API ready on http://127.0.0.1:${port}`),
  );
}
