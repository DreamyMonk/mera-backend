import "server-only";

// Transactional email designs. Email apps (Gmail, Outlook, Apple Mail) ignore
// most modern CSS, so these use tables and inline styles only. Two brands:
// OneAuth (account and security emails, blue) and Mira (product emails, with
// the puppy). Every email also has a plain-text version.

export type Email = { subject: string; html: string; text: string };

const APP_URL = (process.env.APP_URL || "https://accounts.dreamymonk.xyz").replace(/\/$/, "");
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const BRANDS = {
  oneauth: { accent: "#1d6bff", accentDark: "#0b47d1", soft: "#eaf2ff", name: "OneAuth" },
  mira: { accent: "#6d5dfc", accentDark: "#4c3fd6", soft: "#f3f0ff", name: "Mira" },
} as const;
type Brand = keyof typeof BRANDS;

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const firstName = (name?: string) => (name || "").trim().split(/\s+/)[0] || "there";

// ---------- Building blocks ----------

function header(brand: Brand) {
  if (brand === "oneauth") {
    return `<img src="${APP_URL}/oneauth-logo.png" width="132" alt="OneAuth by dreamymonk" style="display:block;border:0;width:132px;height:auto;margin:0 auto;">`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="padding-right:10px;vertical-align:middle;"><img src="${APP_URL}/mira-puppy.png" width="52" height="52" alt="" style="display:block;border:0;width:52px;height:52px;"></td>
    <td style="vertical-align:middle;font-family:${FONT};">
      <div style="font-size:22px;font-weight:800;color:#17171f;letter-spacing:-0.3px;line-height:1.1;">Mira</div>
      <div style="font-size:12px;color:#8a8aa0;">your AI co-founder</div>
    </td></tr></table>`;
}

export function button(url: string, label: string, brand: Brand = "oneauth") {
  const b = BRANDS[brand];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;"><tr>
    <td style="border-radius:12px;background:${b.accent};background-image:linear-gradient(135deg,${b.accent},${b.accentDark});">
      <a href="${esc(url)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(label)}</a>
    </td></tr></table>`;
}

function codeBox(code: string, brand: Brand) {
  const b = BRANDS[brand];
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;"><tr>
    <td align="center" style="background:${b.soft};border:1px solid ${b.accent}33;border-radius:14px;padding:22px 12px;">
      <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:800;letter-spacing:12px;color:#0f172a;padding-left:12px;">${esc(code)}</div>
      <div style="font-family:${FONT};font-size:12px;color:#6b7280;margin-top:8px;">Expires in 10 minutes</div>
    </td></tr></table>`;
}

function infoRows(rows: [string, string][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border:1px solid #e9ecf2;border-radius:12px;border-collapse:separate;">
    ${rows
      .map(
        ([k, v], i) => `<tr>
      <td style="padding:11px 16px;font-family:${FONT};font-size:13px;color:#6b7280;${i ? "border-top:1px solid #eef0f5;" : ""}width:38%;">${esc(k)}</td>
      <td style="padding:11px 16px;font-family:${FONT};font-size:14px;color:#111827;font-weight:600;${i ? "border-top:1px solid #eef0f5;" : ""}">${esc(v)}</td></tr>`
      )
      .join("")}
  </table>`;
}

function callout(text: string, tone: "info" | "warn" | "danger" = "info") {
  const t = { info: ["#eef4ff", "#c9dafe", "#1e3a8a"], warn: ["#fff8e6", "#f6d58a", "#7a4b00"], danger: ["#fff1f1", "#f6b6b6", "#991b1b"] }[tone];
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;"><tr>
    <td style="background:${t[0]};border:1px solid ${t[1]};border-radius:12px;padding:13px 16px;font-family:${FONT};font-size:14px;line-height:1.55;color:${t[2]};">${text}</td></tr></table>`;
}

function progress(pct: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const color = clamped >= 100 ? "#e5484d" : clamped >= 90 ? "#f59e0b" : "#6d5dfc";
  const rest = 100 - clamped;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0 6px;border-radius:999px;overflow:hidden;background:#eef0f5;"><tr>
    <td width="${clamped}%" style="height:12px;background:${color};font-size:0;line-height:0;">&nbsp;</td>
    ${rest > 0 ? `<td width="${rest}%" style="height:12px;background:#eef0f5;font-size:0;line-height:0;">&nbsp;</td>` : ""}
  </tr></table>`;
}

function steps(items: [string, string][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;">${items
    .map(
      ([title, body], i) => `<tr>
      <td style="vertical-align:top;padding:8px 14px 8px 0;width:30px;">
        <div style="width:28px;height:28px;border-radius:999px;background:#f3f0ff;color:#6d5dfc;font-family:${FONT};font-size:13px;font-weight:800;line-height:28px;text-align:center;">${i + 1}</div>
      </td>
      <td style="vertical-align:top;padding:8px 0;font-family:${FONT};">
        <div style="font-size:15px;font-weight:700;color:#111827;">${esc(title)}</div>
        <div style="font-size:14px;color:#4b5563;line-height:1.55;margin-top:2px;">${esc(body)}</div>
      </td></tr>`
    )
    .join("")}</table>`;
}

const p = (html: string) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:#374151;">${html}</p>`;
const h1 = (text: string) => `<h1 style="margin:0 0 14px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">${esc(text)}</h1>`;
const small = (html: string) => `<p style="margin:16px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#6b7280;">${html}</p>`;

function layout({ brand, preheader, body, to }: { brand: Brand; preheader: string; body: string; to?: string }) {
  const b = BRANDS[brand];
  const footer =
    brand === "oneauth"
      ? `OneAuth by dreamymonk · <a href="${APP_URL}/account" style="color:#6b7280;">Manage your account</a>`
      : `Mira by dreamymonk · <a href="${APP_URL}/account" style="color:#6b7280;">Your account</a>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(b.name)}</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6fb;"><tr><td align="center" style="padding:32px 14px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">
      <tr><td align="center" style="padding:0 0 22px;">${header(brand)}</td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e6e9f0;border-radius:18px;overflow:hidden;">
        <div style="height:5px;background:${b.accent};background-image:linear-gradient(90deg,${b.accent},${brand === "mira" ? "#f5b544" : b.accentDark});"></div>
        <div style="padding:34px 34px 30px;">${body}</div>
      </td></tr>
      <tr><td align="center" style="padding:22px 10px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#9ca3af;">
        ${footer}${to ? `<br>This email was sent to ${esc(to)}.` : ""}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// ---------- The emails ----------

export function verifyEmail({ name, code, to }: { name?: string; code: string; to: string }): Email {
  return {
    subject: `${code} is your OneAuth verification code`,
    html: layout({
      brand: "oneauth",
      to,
      preheader: `Your code is ${code}. It expires in 10 minutes.`,
      body:
        h1("Verify your email") +
        p(`Hi ${esc(firstName(name))}, enter this code to finish setting up your OneAuth account.`) +
        codeBox(code, "oneauth") +
        small("If you didn't create an account, you can safely ignore this email. Someone may have typed your address by mistake."),
    }),
    text: `Verify your email\n\nHi ${firstName(name)}, your OneAuth verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`,
  };
}

export function twoStepCode({ name, code, to, device, location }: { name?: string; code: string; to: string; device: string; location: string }): Email {
  return {
    subject: `${code} is your OneAuth sign-in code`,
    html: layout({
      brand: "oneauth",
      to,
      preheader: `Your sign-in code is ${code}.`,
      body:
        h1("Your sign-in code") +
        p(`Hi ${esc(firstName(name))}, use this code to finish signing in. 2-step verification is on for your account.`) +
        codeBox(code, "oneauth") +
        infoRows([
          ["Device", device],
          ["Location", location],
        ]) +
        callout("<strong>Didn't try to sign in?</strong> Someone may know your password. Don't share this code, and change your password right away.", "warn"),
    }),
    text: `Your sign-in code is ${code} (expires in 10 minutes).\nDevice: ${device}\nLocation: ${location}\n\nDidn't try to sign in? Don't share this code and change your password.`,
  };
}

export function accountCreated({ name, to, method }: { name?: string; to: string; method: string }): Email {
  return {
    subject: "Your OneAuth account is ready",
    html: layout({
      brand: "oneauth",
      to,
      preheader: "One account for Mira and every dreamymonk app.",
      body:
        h1(`Welcome, ${firstName(name)}!`) +
        p("Your OneAuth account is ready. It's one secure sign-in for Mira and every app we build at dreamymonk.") +
        infoRows([
          ["Email", to],
          ["Signed up with", method],
          ["Created", new Date().toLocaleDateString("en-US", { dateStyle: "long" })],
        ]) +
        callout("<strong>Tip:</strong> turn on 2-step verification in your account's Security settings. We'll email you a code whenever you sign in on a new device.", "info") +
        button(`${APP_URL}/account`, "Open my account", "oneauth"),
    }),
    text: `Welcome, ${firstName(name)}! Your OneAuth account is ready.\nEmail: ${to}\nSigned up with: ${method}\n\nTip: turn on 2-step verification in Security settings.\nOpen your account: ${APP_URL}/account`,
  };
}

export function newSignIn({ name, to, when, device, location, method }: { name?: string; to: string; when: string; device: string; location: string; method: string }): Email {
  return {
    subject: "New sign-in to your OneAuth account",
    html: layout({
      brand: "oneauth",
      to,
      preheader: `Signed in from ${device} · ${location}`,
      body:
        h1("New sign-in to your account") +
        p(`Hi ${esc(firstName(name))}, your OneAuth account was just used to sign in.`) +
        infoRows([
          ["When", when],
          ["Device", device],
          ["Location", location],
          ["Signed in with", method],
        ]) +
        p("If this was you, there's nothing to do.") +
        callout("<strong>Wasn't you?</strong> Reset your password now and turn on 2-step verification so nobody can sign in without a code from your inbox.", "danger") +
        button(`${APP_URL}/account`, "Review security", "oneauth"),
    }),
    text: `New sign-in to your OneAuth account\nWhen: ${when}\nDevice: ${device}\nLocation: ${location}\nMethod: ${method}\n\nWasn't you? Reset your password and turn on 2-step verification: ${APP_URL}/account`,
  };
}

export function passwordReset({ name, to, link, device, location }: { name?: string; to: string; link: string; device: string; location: string }): Email {
  return {
    subject: "Reset your OneAuth password",
    html: layout({
      brand: "oneauth",
      to,
      preheader: "Use this link to choose a new password. It expires in 1 hour.",
      body:
        h1("Reset your password") +
        p(`Hi ${esc(firstName(name))}, we got a request to reset the password for your OneAuth account. Click the button to choose a new one.`) +
        button(link, "Choose a new password", "oneauth") +
        small(`This link expires in 1 hour and can only be used once. If the button doesn't work, copy this link into your browser:<br><a href="${esc(link)}" style="color:#1d6bff;word-break:break-all;">${esc(link)}</a>`) +
        infoRows([
          ["Requested from", device],
          ["Location", location],
        ]) +
        callout("<strong>Didn't ask for this?</strong> You can ignore this email; your password stays the same. Nobody can change it without this link.", "info"),
    }),
    text: `Reset your OneAuth password\n\nChoose a new password: ${link}\nThe link expires in 1 hour.\n\nRequested from ${device}, ${location}. Didn't ask for this? Ignore this email.`,
  };
}

export function passwordChanged({ name, to, when, device, location }: { name?: string; to: string; when: string; device: string; location: string }): Email {
  return {
    subject: "Your OneAuth password was changed",
    html: layout({
      brand: "oneauth",
      to,
      preheader: "Your password was just changed and other sessions were signed out.",
      body:
        h1("Your password was changed") +
        p(`Hi ${esc(firstName(name))}, the password for your OneAuth account was just changed. For your safety, you've been signed out on your other devices.`) +
        infoRows([
          ["When", when],
          ["Device", device],
          ["Location", location],
        ]) +
        callout("<strong>Wasn't you?</strong> Reset your password right away and turn on 2-step verification in your account's Security settings.", "danger") +
        button(`${APP_URL}/forgot-password`, "Secure my account", "oneauth"),
    }),
    text: `Your OneAuth password was changed.\nWhen: ${when}\nDevice: ${device}\nLocation: ${location}\n\nWasn't you? Reset your password: ${APP_URL}/forgot-password`,
  };
}

export function welcomeToMira({ name, to, plan, creditUsd }: { name?: string; to: string; plan: string; creditUsd: number }): Email {
  return {
    subject: "Welcome to Mira 🐾 Your AI co-founder is ready",
    html: layout({
      brand: "mira",
      to,
      preheader: "Three quick ways to get value from Mira today.",
      body:
        `<div style="text-align:center;margin:-6px 0 18px;"><img src="${APP_URL}/mira-puppy.png" width="96" height="96" alt="" style="width:96px;height:96px;border:0;"></div>` +
        `<div style="text-align:center;">${h1(`Welcome to Mira, ${firstName(name)}!`)}</div>` +
        p("Mira is now connected to your browser. It reads your dashboards, works on any site, and thinks like a co-founder: it spots problems, remembers your goals and suggests what to do next.") +
        steps([
          ["Tell Mira about your business", "Open Settings in the Mira panel and describe what you sell, where, and your goals. Every answer gets sharper."],
          ["Ask it to look at a dashboard", "Open your store admin or ads manager and ask: \"What should I fix first?\""],
          ["Turn on Autopilot", "Let Mira check your ads, orders or store on a schedule and send you a report, with one-click fixes."],
        ]) +
        infoRows([
          ["Your plan", plan],
          ["AI usage included", `$${creditUsd.toFixed(2)} every month`],
        ]) +
        small("Pro tip: Suggest mode asks before every action. Switch to Auto in the panel when you're ready to let Mira work on its own; it still checks with you before anything that spends money, publishes, deletes or sends.") +
        button(`${APP_URL}/account`, "Manage my businesses", "mira"),
    }),
    text: `Welcome to Mira, ${firstName(name)}!\n\n1. Tell Mira about your business (Settings in the panel).\n2. Open a dashboard and ask what to fix first.\n3. Turn on Autopilot for scheduled checks.\n\nPlan: ${plan} ($${creditUsd.toFixed(2)} of AI usage each month).\n${APP_URL}/account`,
  };
}

export function usageAlert({ name, to, pct, usedUsd, quotaUsd, plan }: { name?: string; to: string; pct: 50 | 90 | 100; usedUsd: number; quotaUsd: number; plan: string }): Email {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const copy = {
    50: {
      subject: "You've used half of this month's Mira AI",
      title: "Halfway through this month's AI",
      intro: "you've used 50% of the AI included in your plan this month. Nothing to do yet; this is just a heads-up so there are no surprises.",
      note: callout(`Your allowance resets on <strong>${reset}</strong>.`, "info"),
    },
    90: {
      subject: "Heads up: 90% of your Mira AI is used",
      title: "You're at 90% of this month's AI",
      intro: "you've used most of the AI included in your plan this month. When it runs out, Mira pauses until it resets.",
      note: callout(`Running low. Mira pauses at 100% until <strong>${reset}</strong>. Upgrade to keep going without interruption.`, "warn"),
    },
    100: {
      subject: "You've reached this month's Mira AI limit",
      title: "You've reached this month's limit",
      intro: "Mira has used all of the AI included in your plan this month, so chats, insights and Autopilot are paused for now.",
      note: callout(`Everything starts again automatically on <strong>${reset}</strong>, or upgrade your plan to continue right away.`, "danger"),
    },
  }[pct];
  return {
    subject: copy.subject,
    html: layout({
      brand: "mira",
      to,
      preheader: `$${usedUsd.toFixed(2)} of $${quotaUsd.toFixed(2)} used this month.`,
      body:
        h1(copy.title) +
        p(`Hi ${esc(firstName(name))}, ${copy.intro}`) +
        progress(pct) +
        `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td style="font-family:${FONT};font-size:13px;color:#6b7280;">${pct}% used</td>
          <td align="right" style="font-family:${FONT};font-size:13px;color:#111827;font-weight:700;">$${usedUsd.toFixed(2)} of $${quotaUsd.toFixed(2)}</td>
        </tr></table>` +
        copy.note +
        infoRows([
          ["Plan", plan],
          ["Resets on", reset],
        ]) +
        button(`${APP_URL}/plans?next=/account`, pct === 100 ? "Upgrade to keep going" : "See plans", "mira"),
    }),
    text: `${copy.title}\n\n${pct}% used: $${usedUsd.toFixed(2)} of $${quotaUsd.toFixed(2)} (${plan} plan). Resets on ${reset}.\nPlans: ${APP_URL}/plans`,
  };
}

// Sample data for the admin dashboard's previews.
export function samples(to = "you@example.com"): Record<string, Email> {
  const device = "Chrome on Windows";
  const location = "Mumbai, India";
  return {
    "Verify email": verifyEmail({ name: "Sam", code: "482915", to }),
    "2-step sign-in code": twoStepCode({ name: "Sam", code: "730264", to, device, location }),
    "Account created": accountCreated({ name: "Sam", to, method: "Google" }),
    "Reset password": passwordReset({ name: "Sam", to, link: `${APP_URL}/reset-password?code=sample`, device, location }),
    "Password changed": passwordChanged({ name: "Sam", to, when: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), device, location }),
    "New sign-in": newSignIn({ name: "Sam", to, when: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), device, location, method: "Email and password" }),
    "Welcome to Mira": welcomeToMira({ name: "Sam", to, plan: "Free", creditUsd: 2 }),
    "Usage 50%": usageAlert({ name: "Sam", to, pct: 50, usedUsd: 1, quotaUsd: 2, plan: "Free" }),
    "Usage 90%": usageAlert({ name: "Sam", to, pct: 90, usedUsd: 1.8, quotaUsd: 2, plan: "Free" }),
    "Limit reached": usageAlert({ name: "Sam", to, pct: 100, usedUsd: 2, quotaUsd: 2, plan: "Free" }),
  };
}
