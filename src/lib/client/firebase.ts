"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = !!config.apiKey;

export function auth() {
  return getAuth(getApps()[0] ?? initializeApp(config));
}

// The signed-in Firebase user; `undefined` while Firebase is still loading.
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(firebaseConfigured ? undefined : null);
  useEffect(() => {
    if (firebaseConfigured) return onAuthStateChanged(auth(), setUser);
  }, []);
  return user;
}

const API_TIMEOUT_MS = 30_000;

// Rejects if `promise` takes longer than `ms`, so the UI never spins forever.
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([promise, new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(message)), ms)))]).finally(() => clearTimeout(timer));
}

// Calls this app's API as the signed-in user.
export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const current = firebaseConfigured ? auth().currentUser : null;
  const token = current ? await current.getIdToken() : "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch (err) {
    const timedOut = (err as Error).name === "AbortError";
    throw new Error(timedOut ? "The server is taking too long to answer. Please try again." : "Couldn't reach the server. Check your internet connection.");
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `The Mira server had a problem (error ${res.status}). Please try again; if it keeps happening, check the server logs.`;
    throw Object.assign(new Error(message), { code: data?.error?.type, status: res.status });
  }
  return data as T;
}

// Calls the admin API (authenticated by the admin cookie, not Firebase).
export async function adminApi<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || `Request failed (${res.status})`), { status: res.status });
  return data as T;
}
