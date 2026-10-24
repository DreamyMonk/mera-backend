import { createHash } from "node:crypto";
import { HttpError, readJson, route, str } from "@/lib/server/http";
import { adminAuth, db } from "@/lib/server/firebase";
import { sendInBackground } from "@/lib/server/email/send";
import { passwordChanged, passwordReset } from "@/lib/server/email/templates";
import { deviceFrom, locationFrom } from "@/lib/server/client-info";

const APP_URL = (process.env.APP_URL || "https://accounts.dreamymonk.xyz").replace(/\/$/, "");
const RESEND_MS = 60_000;
const MAX_PER_HOUR = 5;

// Password reset with our own designed emails (instead of Firebase's default).
//   { action: "request", email }          emails a reset link (always answers OK,
//                                          so it never reveals who has an account)
//   { action: "check", code }             is this link still valid? → { email }
//   { action: "confirm", code, password } sets the new password and emails a confirmation
// Firebase signs the account out of its other sessions when the password changes.
export const POST = route(async (req: Request) => {
  const body = await readJson(req);
  if (body.action === "request") return request(req, str(body.email, 200, "Email", true).toLowerCase());
  if (body.action === "check") return Response.json({ email: await resetPassword(str(body.code, 500, "code", true)) });
  if (body.action === "confirm") return confirm(req, str(body.code, 500, "code", true), String(body.password ?? ""));
  throw new HttpError(400, "invalid_request_error", "Unknown action.");
});

async function request(req: Request, email: string) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "invalid_request_error", "Enter a valid email address.");

  // Rate limit per address, quietly: the answer is the same either way.
  const ref = db().collection("resetRequests").doc(createHash("sha256").update(email).digest("hex"));
  const now = Date.now();
  const prev = (await ref.get()).data();
  const windowStart = prev && now - prev.windowStart < 3600_000 ? prev.windowStart : now;
  const count = prev && windowStart === prev.windowStart ? prev.count + 1 : 1;
  if ((prev && now - prev.sentAt < RESEND_MS) || count > MAX_PER_HOUR) return Response.json({ ok: true });
  await ref.set({ sentAt: now, windowStart, count });

  try {
    const user = await adminAuth().getUserByEmail(email);
    if (user.disabled) return Response.json({ ok: true });
    const firebaseLink = await adminAuth().generatePasswordResetLink(email);
    const code = new URL(firebaseLink).searchParams.get("oobCode");
    if (code) {
      const name = (await db().collection("users").doc(user.uid).get()).data()?.name || user.displayName || "";
      await sendInBackground(email, passwordReset({ name, to: email, link: `${APP_URL}/reset-password?code=${encodeURIComponent(code)}`, device: deviceFrom(req), location: locationFrom(req) }));
    }
  } catch {
    // No account with that email (or Firebase refused): answer the same way.
  }
  return Response.json({ ok: true });
}

async function confirm(req: Request, code: string, password: string) {
  if (password.length < 8) throw new HttpError(400, "weak_password", "Use at least 8 characters.");
  if (password.length > 128) throw new HttpError(400, "weak_password", "That password is too long.");
  const email = await resetPassword(code, password);

  // The reset link proved they own the inbox.
  try {
    const user = await adminAuth().getUserByEmail(email);
    await adminAuth().updateUser(user.uid, { emailVerified: true });
    const ref = db().collection("users").doc(user.uid);
    const doc = await ref.get();
    if (doc.exists) await ref.update({ emailVerified: true });
    await sendInBackground(
      email,
      passwordChanged({
        name: doc.data()?.name || user.displayName || "",
        to: email,
        when: `${new Date().toUTCString().replace(" GMT", "")} UTC`,
        device: deviceFrom(req),
        location: locationFrom(req),
      })
    );
  } catch (err) {
    console.error("after password reset", err);
  }
  return Response.json({ ok: true, email });
}

// Firebase's REST endpoint: without a new password it only checks the code.
async function resetPassword(oobCode: string, newPassword?: string): Promise<string> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) throw new HttpError(500, "config_error", "Server setup incomplete: NEXT_PUBLIC_FIREBASE_API_KEY is not set.");
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json", referer: APP_URL },
    body: JSON.stringify(newPassword ? { oobCode, newPassword } : { oobCode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = String(data?.error?.message || "");
    if (/EXPIRED_OOB_CODE/.test(reason)) throw new HttpError(400, "link_expired", "This reset link has expired. Ask for a new one.");
    if (/INVALID_OOB_CODE/.test(reason)) throw new HttpError(400, "link_invalid", "This reset link isn't valid anymore. It may have been used already. Ask for a new one.");
    if (/WEAK_PASSWORD/.test(reason)) throw new HttpError(400, "weak_password", "Choose a stronger password (at least 8 characters).");
    if (/USER_DISABLED/.test(reason)) throw new HttpError(403, "account_blocked", "This account has been blocked.");
    throw new HttpError(502, "reset_failed", "Couldn't reset the password right now. Please try again.");
  }
  return data.email;
}
