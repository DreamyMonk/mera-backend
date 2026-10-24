import "server-only";
import { Resend } from "resend";
import type { Email } from "./templates";

// Sends email through Resend. Without RESEND_API_KEY (e.g. local development)
// emails are logged instead of sent, so nothing else breaks.

const FROM = process.env.EMAIL_FROM || "Mira by dreamymonk <no-reply@dreamymonk.xyz>";
let client: Resend | null = null;

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

export async function sendEmail(to: string, email: Email): Promise<{ ok: boolean; error?: string }> {
  if (!to) return { ok: false, error: "No email address." };
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set; would send "${email.subject}" to ${to}`);
    return { ok: false, error: "Email isn't set up on the server (RESEND_API_KEY)." };
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  try {
    const { error } = await client.emails.send({ from: FROM, to, subject: email.subject, html: email.html, text: email.text });
    if (error) {
      console.error("[email] Resend error", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false, error: (err as Error).message };
  }
}

// For notifications that must never break the request that triggered them.
export function sendInBackground(to: string, email: Email) {
  return sendEmail(to, email).catch(() => ({ ok: false }));
}
