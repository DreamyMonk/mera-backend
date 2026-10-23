import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";

// The admin dashboard has a single password, set in the ADMIN_PASSWORD
// environment variable. Logging in sets a signed, httpOnly cookie. The cookie is
// signed with ADMIN_SESSION_SECRET (or the password itself), so changing the
// password signs everyone out.

export const ADMIN_COOKIE = "mira_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;

function secret() {
  const key = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!key) throw new HttpError(500, "api_error", "ADMIN_PASSWORD is not set on the server.");
  return key;
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new HttpError(500, "api_error", "ADMIN_PASSWORD is not set on the server.");
  // Compare HMACs so the comparison takes the same time whatever the lengths.
  return safeEqual(sign(`pw:${password}`), sign(`pw:${expected}`));
}

export function createSession() {
  const expires = Date.now() + SESSION_MS;
  return { value: `${expires}.${sign(`session:${expires}`)}`, maxAge: SESSION_MS / 1000 };
}

function readCookie(req: Request, name: string) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

export function isAdmin(req: Request) {
  const value = readCookie(req, ADMIN_COOKIE);
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  try {
    return safeEqual(sig, sign(`session:${expires}`));
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request) {
  if (!isAdmin(req)) throw new HttpError(401, "authentication_error", "Admin login required.");
}
