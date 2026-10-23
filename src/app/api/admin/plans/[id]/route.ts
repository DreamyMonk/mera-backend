import { HttpError, readJson, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { cleanPlan } from "@/lib/server/plans";
import { db } from "@/lib/server/firebase";

type Ctx = RouteContext<"/api/admin/plans/[id]">;

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const { id } = await ctx.params;
  const ref = db().collection("plans").doc(id);
  if (!(await ref.get()).exists) throw new HttpError(404, "not_found_error", "Plan not found.");
  await ref.update(cleanPlan(await readJson(req)));
  return Response.json({ ok: true });
});

// A plan that users are on can't be deleted; make it inactive instead.
export const DELETE = route(async (req: Request, ctx: Ctx) => {
  requireAdmin(req);
  const { id } = await ctx.params;
  const inUse = await db().collection("users").where("planId", "==", id).count().get();
  if (inUse.data().count > 0) {
    throw new HttpError(400, "invalid_request_error", `${inUse.data().count} user(s) are on this plan. Move them or mark the plan inactive instead.`);
  }
  await db().collection("plans").doc(id).delete();
  return Response.json({ ok: true });
});
