"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, Badge, Button, Card, Field, Input, Spinner, UsageBar } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";
import type { Business, ChatSummary, Note, Plan, UserProfile } from "@/lib/shared/types";

type Detail = {
  user: UserProfile;
  plan: Plan | null;
  quotaUsd: number;
  usage: { month: string; usedUsd: number; requests: number }[];
  businesses: (Business & { notes: Note[] })[];
  chats: ChatSummary[];
};

const when = (ms: number) => (ms ? new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "–");

export default function UserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [quota, setQuota] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [version, setVersion] = useState(0); // bump to reload after a change

  useEffect(() => {
    Promise.all([adminApi<Detail>(`/api/admin/users/${uid}`), adminApi<{ plans: Plan[] }>("/api/admin/plans")])
      .then(([d, p]) => {
        setData(d);
        setPlans(p.plans);
        setQuota(d.user.quotaOverrideUsd === null ? "" : String(d.user.quotaOverrideUsd));
      })
      .catch((err) => setError(err.message));
  }, [uid, version]);

  async function update(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError("");
    setSaved("");
    try {
      await adminApi(`/api/admin/users/${uid}`, { method: "PATCH", body: JSON.stringify(body) });
      setSaved(label);
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy("");
  }

  if (!data) return error ? <Alert>{error}</Alert> : <div className="text-blue-600"><Spinner /></div>;
  const { user } = data;
  const blocked = user.status === "blocked";
  const thisMonth = data.usage.find((u) => u.month === new Date().toISOString().slice(0, 7));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/users" className="text-sm text-blue-700 hover:underline">← All users</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{user.name || user.email}</h1>
          {blocked ? <Badge tone="bad">Blocked</Badge> : <Badge tone="good">Active</Badge>}
        </div>
        <p className="text-sm text-zinc-500">
          {user.email} · joined {when(user.createdAt)} · last active {when(user.lastActiveAt)}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">Saved: {saved}.</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Access</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {blocked ? "This user can't sign in or use Mira." : "Blocking signs the user out everywhere and stops all Mira requests."}
          </p>
          <Button
            className="mt-4 w-full"
            variant={blocked ? "primary" : "danger"}
            busy={busy === "access"}
            onClick={() => (blocked || confirm(`Block ${user.email}?`)) && update({ status: blocked ? "active" : "blocked" }, "access")}
          >
            {blocked ? "Unblock user" : "Block user"}
          </Button>
        </Card>

        <Card>
          <h2 className="font-semibold">Plan</h2>
          <select
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
            value={user.planId ?? ""}
            onChange={(e) => update({ planId: e.target.value || null }, "plan")}
            disabled={busy === "plan"}
          >
            <option value="">No plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.active ? "" : " (inactive)"}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-zinc-500">Plan quota: ${data.plan?.monthlyCreditUsd ?? 0}/month · up to {data.plan?.maxBusinesses ?? 0} businesses</p>
        </Card>

        <Card>
          <h2 className="font-semibold">Monthly quota</h2>
          <div className="mt-3">
            <UsageBar used={thisMonth?.usedUsd ?? 0} quota={data.quotaUsd} />
          </div>
          <div className="mt-4 flex items-end gap-2">
            <Field label="Custom quota (US$)" hint="Leave empty to use the plan's quota.">
              <Input type="number" min={0} step="0.5" value={quota} onChange={(e) => setQuota(e.target.value)} placeholder={String(data.plan?.monthlyCreditUsd ?? 0)} />
            </Field>
            <Button className="mb-5" busy={busy === "quota"} onClick={() => update({ quotaOverrideUsd: quota === "" ? null : Number(quota) }, "quota")}>
              Save
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold">Chats ({data.chats.length})</h2>
          <ul className="mt-3 divide-y divide-zinc-100">
            {data.chats.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/users/${uid}/chats/${c.id}`} className="flex items-start justify-between gap-4 py-3 hover:text-blue-700">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="truncate text-sm text-zinc-500">{c.preview || "No reply yet"}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{data.businesses.find((b) => b.id === c.businessId)?.name ?? "Deleted business"} · {c.itemCount} items</p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">{when(c.updatedAt)}</span>
                </Link>
              </li>
            ))}
            {!data.chats.length && <li className="py-6 text-center text-sm text-zinc-500">No chats yet.</li>}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="font-semibold">Usage history</h2>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-zinc-100">
                {data.usage.map((u) => (
                  <tr key={u.month}>
                    <td className="py-2 text-zinc-600">{u.month}</td>
                    <td className="py-2 text-right tabular-nums">${u.usedUsd.toFixed(2)}</td>
                    <td className="py-2 text-right text-zinc-500 tabular-nums">{u.requests} req</td>
                  </tr>
                ))}
                {!data.usage.length && <tr><td className="py-3 text-zinc-500">No usage yet.</td></tr>}
              </tbody>
            </table>
          </Card>

          <Card>
            <h2 className="font-semibold">Businesses ({data.businesses.length})</h2>
            <ul className="mt-3 flex flex-col gap-4">
              {data.businesses.map((b) => (
                <li key={b.id}>
                  <p className="font-medium">{b.name}</p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap text-zinc-500">{b.about || "No description."}</p>
                  {b.notes.length > 0 && (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-blue-700">{b.notes.length} memory notes</summary>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {b.notes.map((n) => (
                          <li key={n.id} className="text-zinc-600">
                            <Badge tone="accent">{n.category.replace("_", " ")}</Badge> {n.text}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
