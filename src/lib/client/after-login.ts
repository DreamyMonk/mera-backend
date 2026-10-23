"use client";

import { api } from "./firebase";
import type { Plan, UserProfile } from "../shared/types";

export type Me = {
  user: UserProfile;
  plan: Plan | null;
  usage: { month: string; usedUsd: number; quotaUsd: number; requests: number };
  businesses: { id: string; name: string; about: string }[];
};

// Only same-site paths are allowed as a "next" destination.
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

// Where to send someone right after they sign in.
export async function destinationAfterLogin(next: string | null) {
  const me = await api<Me>("/api/me");
  if (me.user.status === "blocked") throw new Error("This account has been blocked. Contact support if you think this is a mistake.");
  const target = safeNext(next);
  return me.plan ? target : `/plans?next=${encodeURIComponent(target)}`;
}
