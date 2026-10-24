import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { samples } from "@/lib/server/email/templates";
import { emailConfigured, sendEmail } from "@/lib/server/email/send";

// GET: every email design rendered with sample data, for previews.
export const GET = route(async (req: Request) => {
  requireAdmin(req);
  const all = samples();
  return Response.json({
    configured: emailConfigured(),
    from: process.env.EMAIL_FROM || "Mira by dreamymonk <no-reply@dreamymonk.xyz>",
    emails: Object.entries(all).map(([name, e]) => ({ name, subject: e.subject, html: e.html })),
  });
});

// POST { name, to }: sends one sample email, to check how it looks in a real inbox.
export const POST = route(async (req: Request) => {
  requireAdmin(req);
  const body = await readJson(req);
  const to = str(body.to, 200, "Email address", true);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new HttpError(400, "invalid_request_error", "Enter a valid email address.");
  const email = samples(to)[str(body.name, 60, "name", true)];
  if (!email) throw new HttpError(404, "not_found_error", "Unknown email.");
  const sent = await sendEmail(to, { ...email, subject: `[Test] ${email.subject}` });
  if (!sent.ok) throw new HttpError(502, "email_failed", sent.error || "Couldn't send.");
  return Response.json({ ok: true });
});
