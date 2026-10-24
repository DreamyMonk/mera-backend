"use client";

import { api } from "./firebase";
import type { PendingStep, Plan, UserProfile } from "../shared/types";

export type Me = {
  user: UserProfile;
  pending: PendingStep;
  provider: string;
  plan: Plan | null;
  usage: { month: string; usedUsd: number; quotaUsd: number; requests: number };
  businesses: { id: string; name: string; about: string }[];
};

// Only same-site paths are allowed as a "next" destination.
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

// Where a signed-in visitor has to go first: the email code screen (verify
// their address, or 2-step sign-in), then plan selection, then `next`.
export function routeFor(me: Me, next: string | null) {
  const target = safeNext(next);
  if (me.pending) return `/verify?step=${me.pending}&next=${encodeURIComponent(target)}`;
  if (!me.plan) return `/plans?next=${encodeURIComponent(target)}`;
  return target;
}

// Where to send someone right after they sign in.
export async function destinationAfterLogin(next: string | null) {
  const me = await api<Me>("/api/me");
  if (me.user.status === "blocked") throw new Error("This account has been blocked. Contact support if you think this is a mistake.");
  return routeFor(me, next);
}
