import "server-only";
import { db, FieldValue } from "./firebase";
import { HttpError } from "./http";
import { sendInBackground } from "./email/send";
import { usageAlert } from "./email/templates";
import type { Plan, Usage, UserProfile } from "../shared/types";

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

// US dollars per million tokens. Override with MIRA_PRICES, e.g.
// {"claude-sonnet-5-5":{"input":2,"output":10,"cacheRead":0.2,"cacheWrite":2.5}}
const DEFAULT_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

function prices(model: string) {
  let table = DEFAULT_PRICES;
  try {
    if (process.env.MIRA_PRICES) table = { ...DEFAULT_PRICES, ...JSON.parse(process.env.MIRA_PRICES) };
  } catch {
    // Ignore a malformed override and keep the defaults.
  }
  return table[model] || DEFAULT_PRICES["claude-sonnet-5-5"];
}

export type TokenCounts = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };

export function costMicros(model: string, t: TokenCounts) {
  const p = prices(model);
  // $ per million tokens × tokens = micro-dollars.
  return Math.round(t.inputTokens * p.input + t.outputTokens * p.output + t.cacheReadTokens * p.cacheRead + t.cacheWriteTokens * p.cacheWrite);
}

const emptyUsage = (month: string): Usage => ({ month, costMicros: 0, requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });

export async function getUsage(uid: string, month = monthKey()): Promise<Usage> {
  const doc = await db().collection("users").doc(uid).collection("usage").doc(month).get();
  return { ...emptyUsage(month), ...(doc.data() || {}), month } as Usage;
}

export function quotaUsd(user: UserProfile, plan: Plan | null) {
  return user.quotaOverrideUsd ?? plan?.monthlyCreditUsd ?? 0;
}

export async function assertQuota(user: UserProfile, plan: Plan) {
  const usage = await getUsage(user.uid);
  const limit = quotaUsd(user, plan);
  if (usage.costMicros >= limit * 1_000_000) {
    throw new HttpError(429, "quota_exceeded", "You've used this month's Mira AI allowance. Upgrade your plan or wait until next month.");
  }
}

// After recording usage, emails the user once per month as they cross 50%,
// 90% and 100% of their allowance. A transaction marks each level so parallel
// requests never send the same alert twice; if usage jumps past several
// levels at once, only the highest is emailed.
const ALERT_LEVELS = [50, 90, 100] as const;

async function usageAlerts(user: UserProfile, plan: Plan | null) {
  const quota = quotaUsd(user, plan);
  if (quota <= 0 || !user.email) return;
  const ref = db().collection("users").doc(user.uid).collection("usage").doc(monthKey());
  const { level, used } = await db().runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() || {};
    const usedUsd = (data.costMicros || 0) / 1_000_000;
    const sent: Record<string, boolean> = data.alerts || {};
    const crossed = ALERT_LEVELS.filter((l) => usedUsd >= (quota * l) / 100 && !sent[l]);
    if (!crossed.length) return { level: null, used: usedUsd };
    tx.set(ref, { alerts: { ...sent, ...Object.fromEntries(crossed.map((l) => [l, true])) } }, { merge: true });
    return { level: crossed[crossed.length - 1], used: usedUsd };
  });
  if (level) {
    await sendInBackground(user.email, usageAlert({ name: user.name, to: user.email, pct: level, usedUsd: used, quotaUsd: quota, plan: plan?.name || "Free" }));
  }
}

export async function recordUsage(user: UserProfile, plan: Plan | null, model: string, t: TokenCounts) {
  const uid = user.uid;
  const cost = costMicros(model, t);
  const month = monthKey();
  const inc = {
    costMicros: FieldValue.increment(cost),
    requests: FieldValue.increment(1),
    inputTokens: FieldValue.increment(t.inputTokens),
    outputTokens: FieldValue.increment(t.outputTokens),
    cacheReadTokens: FieldValue.increment(t.cacheReadTokens),
    cacheWriteTokens: FieldValue.increment(t.cacheWriteTokens),
  };
  const batch = db().batch();
  batch.set(db().collection("users").doc(uid).collection("usage").doc(month), inc, { merge: true });
  batch.set(db().collection("stats").doc(month), { costMicros: inc.costMicros, requests: inc.requests }, { merge: true });
  batch.update(db().collection("users").doc(uid), { lastActiveAt: FieldValue.serverTimestamp() });
  await batch.commit();
  await usageAlerts(user, plan).catch((err) => console.error("usage alert", err));
}

// Reads token counts out of a streamed (SSE) Messages API response as it passes through.
export function usageMeter() {
  const decoder = new TextDecoder();
  let buffer = "";
  const counts: TokenCounts = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const apply = (u: Record<string, number | null | undefined> | undefined) => {
    if (!u) return;
    if (typeof u.input_tokens === "number") counts.inputTokens = u.input_tokens;
    if (typeof u.output_tokens === "number") counts.outputTokens = u.output_tokens;
    if (typeof u.cache_read_input_tokens === "number") counts.cacheReadTokens = u.cache_read_input_tokens;
    if (typeof u.cache_creation_input_tokens === "number") counts.cacheWriteTokens = u.cache_creation_input_tokens;
  };
  return {
    push(chunk: Uint8Array) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const event = JSON.parse(line.slice(5));
          if (event.type === "message_start") apply(event.message?.usage);
          else if (event.type === "message_delta") apply(event.usage);
        } catch {
          // Not JSON (or a partial line); skip it.
        }
      }
    },
    counts: () => counts,
    apply,
  };
}
