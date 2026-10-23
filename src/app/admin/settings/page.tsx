"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";

type Settings = { model: string; defaultModel: string; apiKeySet: boolean };

const SUGGESTED = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    adminApi<Settings>("/api/admin/settings")
      .then((s) => {
        setSettings(s);
        setModel(s.model);
      })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await adminApi("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ model }) });
      setMsg({ ok: true, text: "Saved. All Mira users switch to this model within a minute." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  if (!settings) return msg ? <Alert>{msg.text}</Alert> : <div className="text-violet-600"><Spinner /></div>;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <h2 className="font-semibold">Claude model</h2>
        <p className="mt-1 text-sm text-zinc-500">The model every Mira user talks to. Default from MIRA_MODEL: {settings.defaultModel}.</p>
        <div className="mt-4 flex flex-col gap-3">
          <Field label="Model id">
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((m) => (
              <button key={m} onClick={() => setModel(m)} className="rounded-full border border-zinc-200 px-3 py-1 text-xs hover:border-violet-400">
                {m}
              </button>
            ))}
          </div>
          {msg && <Alert tone={msg.ok ? "success" : "error"}>{msg.text}</Alert>}
          <Button className="self-start" onClick={save} busy={busy}>Save model</Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Anthropic API key</h2>
          {settings.apiKeySet ? <Badge tone="good">Set</Badge> : <Badge tone="bad">Missing</Badge>}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          The key is read from the ANTHROPIC_API_KEY environment variable on the server and is never shown or sent to users. Change it in your Vercel
          project settings, then redeploy.
        </p>
      </Card>
    </div>
  );
}
