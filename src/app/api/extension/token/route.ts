import { route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { requirePlan } from "@/lib/server/plans";
import { adminAuth, db, FieldValue } from "@/lib/server/firebase";
import { sendInBackground } from "@/lib/server/email/send";
import { welcomeToMira } from "@/lib/server/email/templates";
import { quotaUsd } from "@/lib/server/usage";

// Hands the extension a one-time Firebase custom token. The extension signs in
// with it and from then on refreshes its own session. Only a fully verified
// sign-in gets here (requireUser enforces email verification and 2-step).
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  const plan = await requirePlan(user);
  const token = await adminAuth().createCustomToken(user.uid);

  // The first time Mira is connected, send the welcome email.
  const ref = db().collection("users").doc(user.uid);
  const first = await db().runTransaction(async (tx) => {
    if ((await tx.get(ref)).data()?.miraWelcomedAt) return false;
    tx.update(ref, { miraWelcomedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (first) await sendInBackground(user.email, welcomeToMira({ name: user.name, to: user.email, plan: plan.name, creditUsd: quotaUsd(user, plan) }));

  return Response.json({ token });
});
