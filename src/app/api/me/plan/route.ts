import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { getPlan } from "@/lib/server/plans";
import { ensureBusiness } from "@/lib/server/businesses";
import { db } from "@/lib/server/firebase";

// Picks a plan. Only free plans can be chosen here until payments are added.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const { planId } = await readJson(req);
  const plan = await getPlan(str(planId, 100, "planId", true));
  if (!plan || !plan.active) throw new HttpError(404, "not_found_error", "That plan isn't available.");
  if (plan.priceMonthly > 0) throw new HttpError(400, "payment_required", "Paid plans are coming soon.");
  await db().collection("users").doc(user.uid).update({ planId: plan.id });
  await ensureBusiness(user.uid);
  return Response.json({ ok: true, plan });
});
