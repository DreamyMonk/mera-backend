import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpError } from "./http";

export { FieldValue, Timestamp } from "firebase-admin/firestore";

// FIREBASE_SERVICE_ACCOUNT holds the service account JSON, either as-is or base64-encoded.
// Setup mistakes surface as clear messages instead of a bare 500.
function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) throw new HttpError(500, "config_error", "Server setup incomplete: FIREBASE_SERVICE_ACCOUNT is not set.");
  let json;
  try {
    json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    throw new HttpError(500, "config_error", "Server setup incomplete: FIREBASE_SERVICE_ACCOUNT isn't valid JSON (paste the whole key file on one line, or base64-encode it).");
  }
  try {
    return initializeApp({ credential: cert(json) });
  } catch (err) {
    throw new HttpError(500, "config_error", `Server setup incomplete: the Firebase service account key was rejected (${(err as Error).message}).`);
  }
}

export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());
