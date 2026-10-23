import { route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { chatsRef, toChatSummary } from "@/lib/server/businesses";

// Lists the user's synced chats, optionally for one business.
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  const businessId = new URL(req.url).searchParams.get("businessId");
  let query: FirebaseFirestore.Query = chatsRef(user.uid);
  if (businessId) query = query.where("businessId", "==", businessId);
  const snap = await query.get();
  const chats = snap.docs.map((d) => toChatSummary(d.id, d.data())).sort((a, b) => b.updatedAt - a.updatedAt);
  return Response.json({ chats: chats.slice(0, 200) });
});
