import { HttpError, route } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { chatsRef } from "@/lib/server/businesses";

// One chat's full transcript.
export const GET = route(async (req: Request, ctx: RouteContext<"/api/admin/users/[uid]/chats/[chatId]">) => {
  requireAdmin(req);
  const { uid, chatId } = await ctx.params;
  const doc = await chatsRef(uid).doc(chatId).get();
  if (!doc.exists) throw new HttpError(404, "not_found_error", "Chat not found.");
  return Response.json({ chat: { id: doc.id, ...doc.data() } });
});
