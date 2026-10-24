import "server-only";
import { createRequire } from "node:module";
import type * as AdminApp from "firebase-admin/app";
import type * as AdminAuth from "firebase-admin/auth";
import type * as AdminFirestore from "firebase-admin/firestore";
import { HttpError } from "./http";

// The Firebase Admin SDK is loaded on first use rather than at import time.
// If it can't load on the host (missing files, wrong Node.js version...), the
// API answers with the real reason instead of crashing with an empty 500.
const load = createRequire(import.meta.url);

type Sdk = { app: typeof AdminApp; auth: typeof AdminAuth; firestore: typeof AdminFirestore };
let sdk: Sdk | null = null;

function firebaseSdk(): Sdk {
  if (sdk) return sdk;
  try {
    sdk = { app: load("firebase-admin/app"), auth: load("firebase-admin/auth"), firestore: load("firebase-admin/firestore") };
    return sdk;
  } catch (err) {
    console.error("Couldn't load firebase-admin", err);
    throw new HttpError(500, "config_error", `Server problem: the Firebase library couldn't load on Node.js ${process.version} (${(err as Error).message}).`);
  }
}

// FIREBASE_SERVICE_ACCOUNT holds the service account JSON, either as-is or base64-encoded.
// Setup mistakes surface as clear messages instead of a bare 500.
function app(): AdminApp.App {
  const { getApps, initializeApp, cert } = firebaseSdk().app;
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

export const adminAuth = () => firebaseSdk().auth.getAuth(app());
export const db = () => firebaseSdk().firestore.getFirestore(app());

// The Firestore sentinels the routes use, loaded lazily like the rest.
export const FieldValue = {
  serverTimestamp: () => firebaseSdk().firestore.FieldValue.serverTimestamp(),
  increment: (n: number) => firebaseSdk().firestore.FieldValue.increment(n),
};
