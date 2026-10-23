import { HttpError, readJson, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { requireBusiness } from "@/lib/server/businesses";

type Ctx = RouteContext<"/api/businesses/[id]/notes/[noteId]">;

async function noteRef(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  const { id, noteId } = await ctx.params;
  const ref = (await requireBusiness(user.uid, id)).collection("notes").doc(noteId);
  if (!(await ref.get()).exists) throw new HttpError(404, "not_found_error", "Note not found.");
  return ref;
}

// Marks a follow-up as handled so it stops coming back.
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const ref = await noteRef(req, ctx);
  const body = await readJson(req);
  if (body.clearDue) await ref.update({ due: "", category: "decision" });
  return Response.json({ ok: true });
});

export const DELETE = route(async (req: Request, ctx: Ctx) => {
  const ref = await noteRef(req, ctx);
  await ref.delete();
  return Response.json({ ok: true });
});
