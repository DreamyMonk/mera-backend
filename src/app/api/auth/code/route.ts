import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { checkCode, sendCode, type CodePurpose } from "@/lib/server/codes";

const PURPOSES = new Set<CodePurpose>(["verify_email", "two_factor"]);

// POST { action: "send" | "verify", purpose, code? }: emailed one-time codes
// for verifying an email address and for 2-step sign-in.
export const POST = route(async (req: Request) => {
  const user = await requireUser(req, { allowPending: true });
  const body = await readJson(req);
  const purpose = str(body.purpose, 20, "purpose", true) as CodePurpose;
  if (!PURPOSES.has(purpose)) throw new HttpError(400, "invalid_request_error", "Unknown code type.");

  // Nothing to do if this step is already done (e.g. verified in another tab).
  if (user.pending !== purpose) return Response.json({ ok: true, done: true });

  if (body.action === "send") {
    await sendCode(user, purpose, req);
    return Response.json({ ok: true, sentTo: user.email });
  }
  if (body.action === "verify") {
    const code = str(body.code, 12, "code", true).replace(/\D/g, "");
    if (code.length !== 6) throw new HttpError(400, "wrong_code", "Enter the 6-digit code from the email.");
    await checkCode(user, purpose, code);
    return Response.json({ ok: true, done: true });
  }
  throw new HttpError(400, "invalid_request_error", "Unknown action.");
});
