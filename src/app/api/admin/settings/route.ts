import { HttpError, readJson, route, str } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/admin-session";
import { DEFAULT_MODEL, getModel, setModel } from "@/lib/server/settings";

export const GET = route(async (req: Request) => {
  requireAdmin(req);
  return Response.json({ model: await getModel(), defaultModel: DEFAULT_MODEL, apiKeySet: !!process.env.ANTHROPIC_API_KEY });
});

export const PATCH = route(async (req: Request) => {
  requireAdmin(req);
  const model = str((await readJson(req)).model, 80, "Model", true);
  if (!/^claude-[a-z0-9.-]+$/.test(model)) throw new HttpError(400, "invalid_request_error", "That doesn't look like a Claude model id.");
  await setModel(model);
  return Response.json({ ok: true, model });
});
