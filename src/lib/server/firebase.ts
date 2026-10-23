import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export { FieldValue, Timestamp } from "firebase-admin/firestore";

// FIREBASE_SERVICE_ACCOUNT holds the service account JSON, either as-is or base64-encoded.
function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set.");
  const json = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  return initializeApp({ credential: cert(json) });
}

export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());
