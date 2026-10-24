import "server-only";
import { adminAuth, db, FieldValue } from "./firebase";
import { HttpError } from "./http";
import { emailConfigured, sendInBackground } from "./email/send";
import { accountCreated, newSignIn } from "./email/templates";
import { deviceFrom, locationFrom, signInMethod } from "./client-info";
import type { PendingStep, UserProfile } from "../shared/types";

export function toProfile(uid: string, data: FirebaseFirestore.DocumentData): UserProfile {
  return {
    uid,
    email: data.email || "",
    name: data.name || "",
    photoURL: data.photoURL || "",
    planId: data.planId ?? null,
    status: data.status === "blocked" ? "blocked" : "active",
    quotaOverrideUsd: typeof data.quotaOverrideUsd === "number" ? data.quotaOverrideUsd : null,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
    lastActiveAt: data.lastActiveAt?.toMillis?.() ?? 0,
    emailVerified: !!data.emailVerified,
    twoFactor: !!data.twoFactor,
  };
}

export type SignedIn = UserProfile & {
  provider: string; // "password", "google.com", or "custom" (the extension)
  authTime: number; // when this sign-in happened (seconds); identifies the session
  pending: PendingStep;
};

const PENDING_ERRORS: Record<Exclude<PendingStep, null>, [string, string]> = {
  verify_email: ["email_not_verified", "Verify your email to continue. We sent a code to your inbox."],
  two_factor: ["two_factor_required", "Enter the sign-in code we emailed you to continue."],
};

// Verifies the Firebase ID token in "Authorization: Bearer <token>", creates the
// user's profile on first use, and enforces account rules:
// - blocked accounts are refused;
// - email-and-password accounts must verify their email with a code;
// - with 2-step verification on, each new sign-in must enter an emailed code.
// The extension's own session (a custom token) is only issued to a fully
// verified sign-in, so it skips the code checks.
// Pass { allowPending: true } for the routes that complete those steps.
export async function requireUser(req: Request, { allowBlocked = false, allowPending = false } = {}): Promise<SignedIn> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "authentication_error", "Please sign in to Mira.");

  const auth = adminAuth(); // outside the try: server setup errors must not look like an expired session
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    throw new HttpError(401, "authentication_error", "Your session expired. Please sign in again.");
  }
  const provider = decoded.firebase?.sign_in_provider || "";
  const authTime = decoded.auth_time;

  const ref = db().collection("users").doc(decoded.uid);
  let snap = await ref.get();
  if (!snap.exists) {
    const emailVerified = provider !== "password" && !!decoded.email_verified;
    await ref.set({
      email: decoded.email || "",
      name: decoded.name || "",
      photoURL: decoded.picture || "",
      planId: null,
      status: "active",
      quotaOverrideUsd: null,
      emailVerified,
      twoFactor: false,
      verifiedSessions: [],
      lastSignInAuthTime: authTime,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
    snap = await ref.get();
    // Email-and-password accounts get this after they verify their address.
    if (emailVerified && decoded.email) {
      await sendInBackground(decoded.email, accountCreated({ name: decoded.name, to: decoded.email, method: signInMethod(provider) }));
    }
  }

  const data = snap.data()!;
  // Google (and addresses we already confirmed) arrive verified: record it, so
  // accounts from before email verification existed aren't asked again.
  if (!data.emailVerified && decoded.email_verified) {
    data.emailVerified = true;
    await ref.update({ emailVerified: true });
  }
  const user = toProfile(decoded.uid, data);
  if (user.status === "blocked" && !allowBlocked) {
    throw new HttpError(403, "account_blocked", "Your Mira account has been blocked. Contact support if you think this is a mistake.");
  }

  // Codes can only be required once email sending is set up (RESEND_API_KEY);
  // until then nobody gets stuck waiting for an email that can't be sent.
  let pending: PendingStep = null;
  if (provider !== "custom" && emailConfigured()) {
    if (!user.emailVerified) pending = "verify_email";
    else if (user.twoFactor && !(data.verifiedSessions || []).includes(authTime)) pending = "two_factor";
  }
  if (pending && !allowPending) {
    const [code, message] = PENDING_ERRORS[pending];
    throw new HttpError(403, code, message);
  }

  // A new sign-in on the web: send a security alert (once per sign-in).
  if (provider !== "custom" && user.emailVerified && authTime > (data.lastSignInAuthTime || 0)) {
    const isNew = await db().runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (authTime <= (fresh.data()?.lastSignInAuthTime || 0)) return false;
      tx.update(ref, { lastSignInAuthTime: authTime });
      return true;
    });
    if (isNew) {
      await sendInBackground(
        user.email,
        newSignIn({
          name: user.name,
          to: user.email,
          when: `${new Date(authTime * 1000).toUTCString().replace(" GMT", "")} UTC`,
          device: deviceFrom(req),
          location: locationFrom(req),
          method: signInMethod(provider),
        })
      );
    }
  }

  return { ...user, provider, authTime, pending };
}

// Marks this sign-in as having passed 2-step verification (keeps the latest 20).
export async function markSessionVerified(uid: string, authTime: number) {
  const ref = db().collection("users").doc(uid);
  await db().runTransaction(async (tx) => {
    const sessions: number[] = (await tx.get(ref)).data()?.verifiedSessions || [];
    tx.update(ref, { verifiedSessions: [...sessions.filter((t) => t !== authTime), authTime].slice(-20) });
  });
}

export async function touch(uid: string) {
  await db().collection("users").doc(uid).update({ lastActiveAt: FieldValue.serverTimestamp() });
}
