import { route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { db } from "@/lib/server/firebase";
import { monthKey } from "@/lib/server/usage";

export const GET = route(async (req: Request) => {
  requireAdmin(req);
  const users = db().collection("users");
  const since = new Date(Date.now() - 30 * 86400000);
  const [total, blocked, active30, month] = await Promise.all([
    users.count().get(),
    users.where("status", "==", "blocked").count().get(),
    users.where("lastActiveAt", ">=", since).count().get(),
    db().collection("stats").doc(monthKey()).get(),
  ]);
  return Response.json({
    users: total.data().count,
    blocked: blocked.data().count,
    active30: active30.data().count,
    month: monthKey(),
    monthCostUsd: (month.data()?.costMicros || 0) / 1_000_000,
    monthRequests: month.data()?.requests || 0,
  });
});
