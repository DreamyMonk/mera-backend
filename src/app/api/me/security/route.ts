import { HttpError, readJson, route } from "@/lib/server/http";
import { markSessionVerified, requireUser } from "@/lib/server/users";
import { db } from "@/lib/server/firebase";

// PATCH { twoFactor: boolean }: turns 2-step verification on or off.
// Turning it on keeps the current sign-in verified, so nobody is locked out.
export const PATCH = route(async (req: Request) => {
  const user = await requireUser(req);
  const { twoFactor } = await readJson(req);
  if (typeof twoFactor !== "boolean") throw new HttpError(400, "invalid_request_error", "twoFactor must be true or false.");
  if (user.provider === "custom") throw new HttpError(403, "permission_error", "Change security settings on the website.");
  if (twoFactor) await markSessionVerified(user.uid, user.authTime);
  await db().collection("users").doc(user.uid).update({ twoFactor });
  return Response.json({ ok: true, twoFactor });
});
