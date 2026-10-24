import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { adminAuth, db } from "./firebase";
import { HttpError } from "./http";
import { sendEmail, sendInBackground } from "./email/send";
import { accountCreated, twoStepCode, verifyEmail } from "./email/templates";
import { deviceFrom, locationFrom, signInMethod } from "./client-info";
import { markSessionVerified, type SignedIn } from "./users";

// One-time codes sent by email: to verify an email address, and for 2-step
// sign-in. Only a keyed hash of each code is stored; codes expire after 10
// minutes, allow 5 attempts, and can be re-sent at most every 45 seconds.

export type CodePurpose = "verify_email" | "two_factor";

const TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 6;

function secret() {
  const key = process.env.OTP_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!key) throw new HttpError(500, "config_error", "Server setup incomplete: set OTP_SECRET.");
  return key;
}

const hash = (uid: string, purpose: CodePurpose, code: string) => createHmac("sha256", secret()).update(`${uid}:${purpose}:${code}`).digest("hex");
const codeRef = (uid: string, purpose: CodePurpose) => db().collection("users").doc(uid).collection("codes").doc(purpose);

export async function sendCode(user: SignedIn, purpose: CodePurpose, req: Request) {
  const ref = codeRef(user.uid, purpose);
  const now = Date.now();
  const prev = (await ref.get()).data();
  if (prev && now - prev.sentAt < RESEND_MS) {
    throw new HttpError(429, "rate_limited", `Please wait ${Math.ceil((RESEND_MS - (now - prev.sentAt)) / 1000)} seconds before asking for another code.`);
  }
  const windowStart = prev && now - prev.windowStart < 3600_000 ? prev.windowStart : now;
  const sends = prev && windowStart === prev.windowStart ? prev.sends + 1 : 1;
  if (sends > MAX_SENDS_PER_HOUR) throw new HttpError(429, "rate_limited", "Too many codes requested. Please try again in an hour.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await ref.set({ hash: hash(user.uid, purpose, code), expiresAt: now + TTL_MS, attempts: 0, sentAt: now, windowStart, sends });

  const email =
    purpose === "verify_email"
      ? verifyEmail({ name: user.name, code, to: user.email })
      : twoStepCode({ name: user.name, code, to: user.email, device: deviceFrom(req), location: locationFrom(req) });
  const sent = await sendEmail(user.email, email);
  if (!sent.ok) throw new HttpError(502, "email_failed", `We couldn't send the email: ${sent.error}`);
}

export async function checkCode(user: SignedIn, purpose: CodePurpose, code: string) {
  const ref = codeRef(user.uid, purpose);
  const data = (await ref.get()).data();
  if (!data || Date.now() > data.expiresAt) throw new HttpError(400, "code_expired", "That code has expired. Ask for a new one.");
  if (data.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "too_many_attempts", "Too many wrong codes. Ask for a new one.");

  const expected = Buffer.from(data.hash, "hex");
  const given = Buffer.from(hash(user.uid, purpose, String(code).trim()), "hex");
  if (!timingSafeEqual(expected, given)) {
    await ref.update({ attempts: data.attempts + 1 });
    const left = MAX_ATTEMPTS - data.attempts - 1;
    throw new HttpError(400, "wrong_code", left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one.");
  }
  await ref.delete();

  // Proving access to the inbox also counts as this sign-in's second step.
  await markSessionVerified(user.uid, user.authTime);
  if (purpose === "verify_email") {
    await db().collection("users").doc(user.uid).update({ emailVerified: true, lastSignInAuthTime: user.authTime });
    await adminAuth().updateUser(user.uid, { emailVerified: true }).catch(() => {});
    await sendInBackground(user.email, accountCreated({ name: user.name, to: user.email, method: signInMethod(user.provider) }));
  }
}
