import "server-only";
import { adminAuth, db, FieldValue } from "./firebase";
import { HttpError } from "./http";
import type { UserProfile } from "../shared/types";

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
  };
}

// Verifies the Firebase ID token in "Authorization: Bearer <token>", creates the
// user's profile on first use, and rejects blocked accounts.
export async function requireUser(req: Request, { allowBlocked = false } = {}): Promise<UserProfile> {
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

  const ref = db().collection("users").doc(decoded.uid);
  let snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: decoded.email || "",
      name: decoded.name || "",
      photoURL: decoded.picture || "",
      planId: null,
      status: "active",
      quotaOverrideUsd: null,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
    snap = await ref.get();
  }
  const user = toProfile(decoded.uid, snap.data()!);
  if (user.status === "blocked" && !allowBlocked) {
    throw new HttpError(403, "account_blocked", "Your Mira account has been blocked. Contact support if you think this is a mistake.");
  }
  return user;
}

export async function touch(uid: string) {
  await db().collection("users").doc(uid).update({ lastActiveAt: FieldValue.serverTimestamp() });
}
