import {
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(derive);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
export async function checkPassword(password, stored) {
  const [algorithm, salt, key] = (stored || "").split("$");
  if (algorithm !== "scrypt") return false;
  const actual = await scrypt(password, Buffer.from(salt, "hex"), 64, options);
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
