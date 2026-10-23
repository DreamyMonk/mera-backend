import "server-only";
import { db, FieldValue } from "./firebase";
import { HttpError } from "./http";
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

export async function recordUsage(uid: string, model: string, t: TokenCounts) {
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
