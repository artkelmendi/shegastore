import { randomUUID } from "node:crypto";
import { hashPassword, checkPassword, newToken, tokenHash } from "./auth.mjs";

export function createCustomerHandler({
  db,
  send,
  body,
  fail,
  text,
  email,
  transaction,
  secure,
  limit,
}) {
  // Customer identities and cookies never participate in staff authentication.
  const cookieName = "shega_customer";
  const cookie = (value = "", age = 0) =>
    `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const readToken = (req) =>
    (req.headers.cookie || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
  const publicCustomer = ({ id, email, name, version, created_at }) => ({
    id,
    email,
    name,
    version,
    created_at,
  });
  const findCustomer = (req) => {
    const token = readToken(req);
    if (!token || token.length > 128) return null;
    return db
      .prepare(
        "SELECT c.* FROM customer_sessions s JOIN customers c ON c.id=s.customer_id WHERE s.token_hash=? AND s.expires_at>? AND c.active=1",
      )
      .get(tokenHash(token), Date.now());
  };
  const session = (req, res, customer) => {
    const token = newToken(),
      previous = readToken(req);
    transaction(() => {
      if (previous)
        db.prepare("DELETE FROM customer_sessions WHERE token_hash=?").run(
          tokenHash(previous),
        );
      db.prepare("DELETE FROM customer_sessions WHERE expires_at<=?").run(
        Date.now(),
      );
      db.prepare(
        "INSERT INTO customer_sessions(token_hash,customer_id,expires_at) VALUES(?,?,?)",
      ).run(tokenHash(token), customer.id, Date.now() + 8 * 3600000);
    });
    send(
      res,
      200,
      { customer: publicCustomer(customer) },
      { "Set-Cookie": cookie(token, 8 * 3600) },
    );
  };
  const passphrase = (value) => {
    if (typeof value !== "string" || value.length < 15 || value.length > 128)
      fail(422, "Use a passphrase of 15–128 characters.");
    return value;
  };
  return async (req, res, path, method) => {
    if (!path.startsWith("/api/customer/")) return false;
    if (method === "GET" && path === "/api/customer/session") {
      const customer = findCustomer(req);
      send(res, 200, { customer: customer ? publicCustomer(customer) : null });
      return true;
    }
    if (
      method === "POST" &&
      ["/api/customer/register", "/api/customer/login"].includes(path)
    ) {
      limit(req, "customer-auth");
      const input = await body(req),
        address = email(input.email),
        password = passphrase(input.password);
      if (path.endsWith("/register")) {
        const name = text(input.name, "Name", 2, 80);
        if (db.prepare("SELECT 1 FROM customers WHERE email=?").get(address))
          fail(
            409,
            "An account could not be created with these details. Try signing in instead.",
          );
        const hash = await hashPassword(password),
          id = randomUUID();
        transaction(() => {
          // Hashing is asynchronous: recheck the unique email before insertion.
          if (db.prepare("SELECT 1 FROM customers WHERE email=?").get(address))
            fail(
              409,
              "An account could not be created with these details. Try signing in instead.",
            );
          db.prepare(
            "INSERT INTO customers(id,email,name,password_hash) VALUES(?,?,?,?)",
          ).run(id, address, name, hash);
        });
        session(
          req,
          res,
          db.prepare("SELECT * FROM customers WHERE id=?").get(id),
        );
      } else {
        const stored = db
          .prepare("SELECT * FROM customers WHERE email=? AND active=1")
          .get(address);
        const dummy =
          "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
        if (
          !(await checkPassword(password, stored?.password_hash || dummy)) ||
          !stored
        )
          fail(401, "Email or passphrase is incorrect.");
        session(req, res, stored);
      }
      return true;
    }
    if (method === "POST" && path === "/api/customer/logout") {
      const token = readToken(req);
      if (token)
        db.prepare("DELETE FROM customer_sessions WHERE token_hash=?").run(
          tokenHash(token),
        );
      send(res, 200, { ok: true }, { "Set-Cookie": cookie() });
      return true;
    }
    const customer = findCustomer(req);
    if (!customer) fail(401, "Sign in to your account to continue.");
    if (method === "PATCH" && path === "/api/customer/profile") {
      const input = await body(req),
        name = text(input.name, "Name", 2, 80);
      if (!Number.isInteger(input.version) || input.version < 1)
        fail(422, "Reload your account before saving.");
      const updated = db
        .prepare(
          "UPDATE customers SET name=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",
        )
        .run(name, customer.id, input.version);
      if (!updated.changes)
        fail(
          409,
          "Your account changed in another window. Reload before saving.",
        );
      send(res, 200, {
        customer: publicCustomer(
          db.prepare("SELECT * FROM customers WHERE id=?").get(customer.id),
        ),
      });
      return true;
    }
    if (method === "POST" && path === "/api/customer/password") {
      limit(req, "customer-password");
      const input = await body(req);
      const current = passphrase(input.currentPassword),
        next = passphrase(input.newPassword);
      if (!(await checkPassword(current, customer.password_hash)))
        fail(401, "Your current passphrase is incorrect.");
      if (current === next) fail(422, "Choose a different passphrase.");
      const hash = await hashPassword(next);
      transaction(() => {
        const updated = db
          .prepare(
            "UPDATE customers SET password_hash=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND password_hash=?",
          )
          .run(hash, customer.id, customer.password_hash);
        if (!updated.changes)
          fail(
            409,
            "Your passphrase was changed in another window. Sign in again.",
          );
        db.prepare("DELETE FROM customer_sessions WHERE customer_id=?").run(
          customer.id,
        );
      });
      session(
        req,
        res,
        db.prepare("SELECT * FROM customers WHERE id=?").get(customer.id),
      );
      return true;
    }
    fail(404, "Account endpoint not found.");
  };
}
