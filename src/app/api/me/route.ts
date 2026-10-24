import { route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { getPlan } from "@/lib/server/plans";
import { getUsage, quotaUsd } from "@/lib/server/usage";
import { listBusinesses } from "@/lib/server/businesses";

// The signed-in user's account: profile, plan, this month's usage and businesses.
export const GET = route(async (req: Request) => {
  const { provider, authTime, pending, ...user } = await requireUser(req, { allowBlocked: true, allowPending: true });
  const [plan, usage, businesses] = await Promise.all([getPlan(user.planId), getUsage(user.uid), listBusinesses(user.uid)]);
  void authTime;
  return Response.json({
    user,
    pending, // "verify_email" | "two_factor" | null: what this sign-in still has to do
    provider,
    plan,
    usage: { month: usage.month, usedUsd: usage.costMicros / 1_000_000, quotaUsd: quotaUsd(user, plan), requests: usage.requests },
    businesses,
  });
});
