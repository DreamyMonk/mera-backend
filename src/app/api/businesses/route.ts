import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { requirePlan } from "@/lib/server/plans";
import { businessesRef, listBusinesses } from "@/lib/server/businesses";
import { FieldValue } from "@/lib/server/firebase";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  return Response.json({ businesses: await listBusinesses(user.uid) });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const plan = await requirePlan(user);
  const body = await readJson(req);
  const existing = await businessesRef(user.uid).count().get();
  if (existing.data().count >= plan.maxBusinesses) {
    throw new HttpError(403, "limit_reached", `Your ${plan.name} plan allows ${plan.maxBusinesses} business${plan.maxBusinesses > 1 ? "es" : ""}.`);
  }
  const ref = await businessesRef(user.uid).add({
    name: str(body.name, 80, "Name", true),
    about: str(body.about, 4000, "About"),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return Response.json({ id: ref.id });
});
