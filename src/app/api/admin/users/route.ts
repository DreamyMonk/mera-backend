import { route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { db } from "@/lib/server/firebase";
import { toProfile } from "@/lib/server/users";
import { listPlans } from "@/lib/server/plans";
import { monthKey, quotaUsd } from "@/lib/server/usage";

// Newest 500 users with this month's usage.
export const GET = route(async (req: Request) => {
  requireAdmin(req);
  const snap = await db().collection("users").orderBy("createdAt", "desc").limit(500).get();
  const plans = new Map((await listPlans()).map((p) => [p.id, p]));
  const month = monthKey();
  const usageDocs = snap.empty ? [] : await db().getAll(...snap.docs.map((d) => d.ref.collection("usage").doc(month)));
  const users = snap.docs.map((d, i) => {
    const user = toProfile(d.id, d.data());
    const plan = user.planId ? plans.get(user.planId) ?? null : null;
    return {
      ...user,
      planName: plan?.name ?? "No plan",
      usedUsd: (usageDocs[i]?.data()?.costMicros || 0) / 1_000_000,
      quotaUsd: quotaUsd(user, plan),
    };
  });
  return Response.json({ users });
});
