import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { chatsRef, requireBusiness } from "@/lib/server/businesses";
import type { TranscriptItem } from "@/lib/shared/types";

const KINDS = new Set(["user", "assistant", "step", "stepError", "note", "error"]);
const MAX_ITEMS = 400;
const MAX_TEXT = 4000;

type Ctx = RouteContext<"/api/chats/[id]">;

// Saves (creates or replaces) a chat's transcript. The extension syncs chats
// here after each turn; screenshots stay on the user's device.
export const PUT = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  if (!/^[\w-]{8,64}$/.test(id)) throw new HttpError(400, "invalid_request_error", "Invalid chat id.");
  const body = await readJson(req);
  const businessId = str(body.businessId, 64, "businessId", true);
  await requireBusiness(user.uid, businessId);
  const items = Array.isArray(body.transcript) ? (body.transcript as TranscriptItem[]) : [];
  const transcript = items
    .filter((t) => t && KINDS.has(t.kind) && typeof t.text === "string")
    .slice(-MAX_ITEMS)
    .map((t) => ({ kind: t.kind, text: t.text.slice(0, MAX_TEXT), at: Number(t.at) || 0 }));
  await chatsRef(user.uid).doc(id).set({
    businessId,
    title: str(body.title, 120, "title") || "Untitled chat",
    createdAt: Number(body.createdAt) || Date.now(),
    updatedAt: Date.now(),
    transcript,
  });
  return Response.json({ ok: true });
});

export const DELETE = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  await chatsRef(user.uid).doc(id).delete();
  return Response.json({ ok: true });
});
