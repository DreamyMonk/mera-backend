import { readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { cleanPlan, listPlans } from "@/lib/server/plans";
import { db } from "@/lib/server/firebase";

export const GET = route(async (req: Request) => {
  requireAdmin(req);
  return Response.json({ plans: await listPlans() });
});

export const POST = route(async (req: Request) => {
  requireAdmin(req);
  const plan = cleanPlan(await readJson(req));
  const ref = await db().collection("plans").add({
    name: "New plan",
    description: "",
    priceMonthly: 0,
    monthlyCreditUsd: 5,
    maxBusinesses: 1,
    proactive: true,
    active: false,
    isDefault: false,
    order: 10,
    ...plan,
  });
  return Response.json({ id: ref.id });
});
