import { route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { requirePlan } from "@/lib/server/plans";
import { adminAuth } from "@/lib/server/firebase";

// Hands the extension a one-time Firebase custom token. The extension signs in
// with it and from then on refreshes its own session.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  await requirePlan(user);
  const token = await adminAuth().createCustomToken(user.uid);
  return Response.json({ token });
});
