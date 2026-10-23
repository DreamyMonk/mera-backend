import { route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { getPlan } from "@/lib/server/plans";
import { getUsage, quotaUsd } from "@/lib/server/usage";
import { listBusinesses } from "@/lib/server/businesses";

// The signed-in user's account: profile, plan, this month's usage and businesses.
export const GET = route(async (req: Request) => {
  const user = await requireUser(req, { allowBlocked: true });
  const [plan, usage, businesses] = await Promise.all([getPlan(user.planId), getUsage(user.uid), listBusinesses(user.uid)]);
  return Response.json({
    user,
    plan,
    usage: { month: usage.month, usedUsd: usage.costMicros / 1_000_000, quotaUsd: quotaUsd(user, plan), requests: usage.requests },
    businesses,
  });
});
