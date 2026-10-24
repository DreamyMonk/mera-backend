"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Input, Spinner } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";

type Preview = { name: string; subject: string; html: string };
type Data = { configured: boolean; from: string; emails: Preview[] };

export default function Emails() {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState(0);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    adminApi<Data>("/api/admin/emails").then(setData).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  async function sendTest() {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    try {
      await adminApi("/api/admin/emails", { method: "POST", body: JSON.stringify({ name: data.emails[selected].name, to }) });
      setMsg({ ok: true, text: `Sent "${data.emails[selected].name}" to ${to}.` });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  if (!data) return msg ? <Alert>{msg.text}</Alert> : <div className="text-blue-600"><Spinner /></div>;
  const email = data.emails[selected];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Emails</h1>
          <p className="text-sm text-zinc-500">Sent from {data.from} through Resend.</p>
        </div>
        {data.configured ? <Badge tone="good">Resend connected</Badge> : <Badge tone="bad">RESEND_API_KEY missing</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="!p-2">
          <ul className="flex flex-col gap-0.5">
            {data.emails.map((e, i) => (
              <li key={e.name}>
                <button
                  onClick={() => setSelected(i)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${i === selected ? "bg-blue-50 font-semibold text-blue-700" : "text-zinc-700 hover:bg-zinc-100"}`}
                >
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="!p-4">
            <p className="text-xs text-zinc-500">Subject</p>
            <p className="font-semibold">{email.subject}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input className="!w-72" type="email" placeholder="Send a test to…" value={to} onChange={(e) => setTo(e.target.value)} />
              <Button onClick={sendTest} busy={busy} disabled={!to || !data.configured}>Send test</Button>
            </div>
            {msg && <div className="mt-3"><Alert tone={msg.ok ? "success" : "error"}>{msg.text}</Alert></div>}
          </Card>
          <iframe title={email.name} srcDoc={email.html} className="h-[760px] w-full rounded-2xl border border-zinc-200 bg-white" sandbox="" />
        </div>
      </div>
    </div>
  );
}
