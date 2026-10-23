import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { businessesRef, chatsRef, deleteAll, requireBusiness } from "@/lib/server/businesses";
import { FieldValue } from "@/lib/server/firebase";

export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/businesses/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const ref = await requireBusiness(user.uid, id);
  const body = await readJson(req);
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (body.name !== undefined) update.name = str(body.name, 80, "Name", true);
  if (body.about !== undefined) update.about = str(body.about, 4000, "About");
  await ref.update(update);
  return Response.json({ ok: true });
});

// Deletes a business with its notes and chats. The last business can't be deleted.
export const DELETE = route(async (req: Request, ctx: RouteContext<"/api/businesses/[id]">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const ref = await requireBusiness(user.uid, id);
  if ((await businessesRef(user.uid).count().get()).data().count <= 1) {
    throw new HttpError(400, "invalid_request_error", "You need at least one business.");
  }
  await deleteAll(ref.collection("notes"));
  await deleteAll(chatsRef(user.uid).where("businessId", "==", id));
  await ref.delete();
  return Response.json({ ok: true });
});
