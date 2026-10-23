import { HttpError, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { adminAuth, db } from "@/lib/server/firebase";
import { toProfile } from "@/lib/server/users";
import { getPlan } from "@/lib/server/plans";
import { quotaUsd } from "@/lib/server/usage";
import { chatsRef, listBusinesses, listNotes, toChatSummary } from "@/lib/server/businesses";

type Ctx = RouteContext<"/api/admin/users/[uid]">;

async function load(uid: string) {
  const snap = await db().collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpError(404, "not_found_error", "User not found.");
  return toProfile(uid, snap.data()!);
}

// Everything about one user: profile, plan, usage history, businesses with notes, chats.
export const GET = route(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const { uid } = await ctx.params;
  const user = await load(uid);
  const [plan, usageSnap, businesses, chatsSnap] = await Promise.all([
    getPlan(user.planId),
    db().collection("users").doc(uid).collection("usage").get(),
    listBusinesses(uid),
    chatsRef(uid).get(),
  ]);
  const withNotes = await Promise.all(businesses.map(async (b) => ({ ...b, notes: await listNotes(uid, b.id) })));
  const usage = usageSnap.docs
    .map((d) => ({ month: d.id, usedUsd: (d.data().costMicros || 0) / 1_000_000, requests: d.data().requests || 0 }))
    .sort((a, b) => b.month.localeCompare(a.month));
  const chats = chatsSnap.docs.map((d) => toChatSummary(d.id, d.data())).sort((a, b) => b.updatedAt - a.updatedAt);
  return Response.json({ user, plan, quotaUsd: quotaUsd(user, plan), usage, businesses: withNotes, chats });
});

// Block/unblock, change plan, or set a custom monthly quota (null = plan default).
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const { uid } = await ctx.params;
  await load(uid);
  const body = await readJson(req);
  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "blocked") throw new HttpError(400, "invalid_request_error", "status must be active or blocked.");
    update.status = body.status;
    // Blocking also disables sign-in and ends existing sessions.
    await adminAuth().updateUser(uid, { disabled: body.status === "blocked" });
    if (body.status === "blocked") await adminAuth().revokeRefreshTokens(uid);
  }
  if (body.planId !== undefined) {
    if (body.planId !== null && !(await getPlan(String(body.planId)))) throw new HttpError(404, "not_found_error", "Plan not found.");
    update.planId = body.planId;
  }
  if (body.quotaOverrideUsd !== undefined) {
    const value = body.quotaOverrideUsd === null || body.quotaOverrideUsd === "" ? null : Number(body.quotaOverrideUsd);
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new HttpError(400, "invalid_request_error", "Quota must be a positive number.");
    update.quotaOverrideUsd = value;
  }
  if (Object.keys(update).length) await db().collection("users").doc(uid).update(update);
  return Response.json({ ok: true });
});
