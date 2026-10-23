import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { listNotes, requireBusiness } from "@/lib/server/businesses";
import { FieldValue } from "@/lib/server/firebase";

const CATEGORIES = new Set(["goal", "fact", "decision", "follow_up"]);
const MAX_NOTES = 100;

export const GET = route(async (req: Request, ctx: RouteContext<"/api/businesses/[id]/notes">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await requireBusiness(user.uid, id);
  return Response.json({ notes: await listNotes(user.uid, id) });
});

export const POST = route(async (req: Request, ctx: RouteContext<"/api/businesses/[id]/notes">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const ref = await requireBusiness(user.uid, id);
  const body = await readJson(req);
  const notes = ref.collection("notes");
  if ((await notes.count().get()).data().count >= MAX_NOTES) {
    throw new HttpError(400, "limit_reached", `Mira keeps up to ${MAX_NOTES} notes per business. Delete some old ones first.`);
  }
  const category = CATEGORIES.has(String(body.category)) ? String(body.category) : "fact";
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(body.due || "")) ? String(body.due) : "";
  const doc = await notes.add({
    text: str(body.text, 500, "Note", true),
    category,
    due,
    date: new Date().toISOString().slice(0, 10),
    createdAt: FieldValue.serverTimestamp(),
  });
  return Response.json({ id: doc.id });
});

// Deletes every note for the business.
export const DELETE = route(async (req: Request, ctx: RouteContext<"/api/businesses/[id]/notes">) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const ref = await requireBusiness(user.uid, id);
  const snap = await ref.collection("notes").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  return Response.json({ ok: true });
});
