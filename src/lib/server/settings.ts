import "server-only";
import { db } from "./firebase";

// App-wide settings the admin can change. The model starts from the
// MIRA_MODEL environment variable and can be overridden from the dashboard.
// The Anthropic API key is only ever read from ANTHROPIC_API_KEY.

export const DEFAULT_MODEL = process.env.MIRA_MODEL || "claude-sonnet-5-5";

let cache: { model: string; at: number } | null = null;

export async function getModel(): Promise<string> {
  if (cache && Date.now() - cache.at < 60_000) return cache.model;
  const doc = await db().collection("settings").doc("app").get();
  const model = (doc.data()?.model as string) || DEFAULT_MODEL;
  cache = { model, at: Date.now() };
  return model;
}

export async function setModel(model: string) {
  await db().collection("settings").doc("app").set({ model }, { merge: true });
  cache = null;
}
