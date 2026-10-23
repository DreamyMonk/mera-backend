// Claude proxy for the Mira extension. The extension uses the Anthropic SDK
// with this server as its base URL and the user's Firebase ID token as the
// bearer token. Here we check the account, plan and monthly quota, choose the
// model and attach the server's API key, then stream Claude's response back
// while counting tokens for billing.

import Anthropic from "@anthropic-ai/sdk";
import { HttpError, errorResponse, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/users";
import { requirePlan } from "@/lib/server/plans";
import { assertQuota, recordUsage, usageMeter } from "@/lib/server/usage";
import { getModel } from "@/lib/server/settings";

export const maxDuration = 300;

const ALLOWED_BETAS = new Set(["thinking-display-updates-2026-08-18", "server-side-fallback-2026-07-01"]);
const ALLOWED_FIELDS = new Set([
  "max_tokens", "messages", "system", "tools", "tool_choice", "thinking", "output_config",
  "cache_control", "stream", "stop_sequences", "fallbacks", "metadata",
]);
// Custom tools (no type) and the browser toolset only; no server-side tools that bill extra.
const allowedTool = (t: { type?: string }) => !t.type || t.type === "custom" || t.type === "browser_toolset_20260801";
const MAX_TOKENS = 64000;

let client: Anthropic | null = null;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(500, "api_error", "ANTHROPIC_API_KEY is not set on the server.");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const plan = await requirePlan(user);
    await assertQuota(user, plan);

    const body = await readJson(req);
    const params: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) if (ALLOWED_FIELDS.has(key)) params[key] = value;
    if (!Array.isArray(params.messages)) throw new HttpError(400, "invalid_request_error", "messages is required.");
    if (Array.isArray(params.tools) && !params.tools.every(allowedTool)) {
      throw new HttpError(400, "invalid_request_error", "That tool isn't available in Mira.");
    }

    const model = await getModel();
    params.model = model;
    params.max_tokens = Math.min(Number(params.max_tokens) || 4096, MAX_TOKENS);
    params.betas = (req.headers.get("anthropic-beta") || "")
      .split(",")
      .map((b) => b.trim())
      .filter((b) => ALLOWED_BETAS.has(b));
    if (params.fallbacks && !(params.betas as string[]).includes("server-side-fallback-2026-07-01")) delete params.fallbacks;

    let upstream: Response;
    try {
      upstream = await anthropic().beta.messages.create(params as unknown as Anthropic.Beta.MessageCreateParams).asResponse();
    } catch (err) {
      if (err instanceof Anthropic.APIError && err.status) {
        return Response.json(err.error ?? { type: "error", error: { type: "api_error", message: err.message } }, { status: err.status });
      }
      throw err;
    }

    if (params.stream && upstream.body) {
      const meter = usageMeter();
      const body = upstream.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            controller.enqueue(chunk);
            meter.push(chunk);
          },
          async flush() {
            await recordUsage(user.uid, model, meter.counts()).catch((e) => console.error("usage", e));
          },
        })
      );
      return new Response(body, {
        status: upstream.status,
        headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform" },
      });
    }

    const data = await upstream.json();
    const meter = usageMeter();
    meter.apply(data.usage);
    await recordUsage(user.uid, model, meter.counts()).catch((e) => console.error("usage", e));
    return Response.json(data, { status: upstream.status });
  } catch (err) {
    return errorResponse(err);
  }
}
