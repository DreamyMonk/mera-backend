"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";
import type { Plan } from "@/lib/shared/types";

type Draft = Omit<Plan, "id"> & { id?: string };

const NEW_PLAN: Draft = { name: "", description: "", priceMonthly: 0, monthlyCreditUsd: 5, maxBusinesses: 1, proactive: true, active: true, isDefault: false, order: 10 };

function PlanForm({ initial, onSaved, onCancel }: { initial: Draft; onSaved: () => void; onCancel: () => void }) {
  const [plan, setPlan] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setPlan((p) => ({ ...p, [key]: value }));

  async function save() {
    setBusy(true);
    setError("");
    try {
      const { id, ...body } = plan;
      await adminApi(id ? `/api/admin/plans/${id}` : "/api/admin/plans", { method: id ? "PATCH" : "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="border-violet-300 ring-4 ring-violet-50">
      <h2 className="font-semibold">{plan.id ? `Edit ${initial.name}` : "New plan"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={plan.name} onChange={(e) => set("name", e.target.value)} maxLength={40} /></Field>
        <Field label="Price per month (US$)" hint="0 = free. Paid plans show as 'coming soon' until payments are added.">
          <Input type="number" min={0} step="1" value={plan.priceMonthly} onChange={(e) => set("priceMonthly", Number(e.target.value))} />
        </Field>
        <Field label="Monthly AI credit (US$)" hint="How much Claude usage each user gets per month, at cost.">
          <Input type="number" min={0} step="0.5" value={plan.monthlyCreditUsd} onChange={(e) => set("monthlyCreditUsd", Number(e.target.value))} />
        </Field>
        <Field label="Max businesses"><Input type="number" min={1} value={plan.maxBusinesses} onChange={(e) => set("maxBusinesses", Number(e.target.value))} /></Field>
        <Field label="Sort order" hint="Lower shows first."><Input type="number" value={plan.order} onChange={(e) => set("order", Number(e.target.value))} /></Field>
        <div className="flex flex-col justify-center gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={plan.proactive} onChange={(e) => set("proactive", e.target.checked)} /> Proactive insights</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={plan.active} onChange={(e) => set("active", e.target.checked)} /> Active (users can pick it)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={plan.isDefault} onChange={(e) => set("isDefault", e.target.checked)} /> Highlight as recommended</label>
        </div>
      </div>
      <div className="mt-4">
        <Field label="Description"><Textarea rows={2} value={plan.description} onChange={(e) => set("description", e.target.value)} maxLength={300} /></Field>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-4 flex gap-2">
        <Button onClick={save} busy={busy}>Save plan</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => adminApi<{ plans: Plan[] }>("/api/admin/plans").then((r) => setPlans(r.plans)).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(plan: Plan) {
    if (!confirm(`Delete the ${plan.name} plan?`)) return;
    setError("");
    try {
      await adminApi(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
        {!editing && <Button onClick={() => setEditing(NEW_PLAN)}>+ New plan</Button>}
      </div>
      {error && <Alert>{error}</Alert>}
      {editing && (
        <PlanForm
          key={editing.id ?? "new"}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {!plans ? (
        <div className="text-violet-600"><Spinner /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <div className="flex gap-1.5">
                  {p.isDefault && <Badge tone="accent">Recommended</Badge>}
                  {p.active ? <Badge tone="good">Active</Badge> : <Badge>Inactive</Badge>}
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold">{p.priceMonthly > 0 ? `$${p.priceMonthly}/mo` : "Free"}</p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-zinc-600">
                <li>${p.monthlyCreditUsd} AI credit / month</li>
                <li>Up to {p.maxBusinesses} business{p.maxBusinesses > 1 ? "es" : ""}</li>
                <li>Proactive insights: {p.proactive ? "yes" : "no"}</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                <Button variant="ghost" className="hover:!border-red-300 hover:!text-red-600" onClick={() => remove(p)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
