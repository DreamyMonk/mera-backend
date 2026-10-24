"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Badge, Brand, Button, PageShell, Spinner } from "@/components/ui";
import { api } from "@/lib/client/firebase";
import { safeNext, type Me } from "@/lib/client/after-login";
import { useSignedIn } from "@/lib/client/use-signed-in";
import type { Plan } from "@/lib/shared/types";

function PlanPicker() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const user = useSignedIn(`/plans?next=${encodeURIComponent(next)}`);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([api<{ plans: Plan[] }>("/api/plans"), api<Me>("/api/me")])
      .then(([p, me]) => {
        // Email verification or 2-step comes before choosing a plan.
        if (me.pending) return router.replace(`/verify?step=${me.pending}&next=${encodeURIComponent(`/plans?next=${encodeURIComponent(next)}`)}`);
        setPlans(p.plans);
        setCurrent(me.user.planId);
      })
      .catch((err) => setError(err.message));
  }, [user, router, next]);

  async function choose(plan: Plan) {
    setError("");
    setBusy(plan.id);
    try {
      await api("/api/me/plan", { method: "POST", body: JSON.stringify({ planId: plan.id }) });
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  }

  return (
    <PageShell>
      <header>
        <Brand />
      </header>
      <main className="flex flex-1 flex-col items-center py-12">
        <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
        <p className="mt-2 text-zinc-500">You can change it any time.</p>
        {error && <div className="mt-6 w-full max-w-md"><Alert>{error}</Alert></div>}
        {!plans ? (
          <div className="mt-16 text-blue-600"><Spinner /></div>
        ) : (
          <div className="mt-10 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const paid = plan.priceMonthly > 0;
              const isCurrent = plan.id === current;
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${plan.isDefault ? "border-blue-400 ring-4 ring-blue-100" : "border-zinc-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    {isCurrent ? <Badge tone="good">Current</Badge> : plan.isDefault && <Badge tone="accent">Recommended</Badge>}
                  </div>
                  <p className="mt-3 text-3xl font-bold">
                    {paid ? `$${plan.priceMonthly}` : "Free"}
                    {paid && <span className="text-base font-medium text-zinc-500">/month</span>}
                  </p>
                  {plan.description && <p className="mt-2 text-sm text-zinc-600">{plan.description}</p>}
                  <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-zinc-700">
                    <li>✓ ${plan.monthlyCreditUsd} of AI usage each month</li>
                    <li>✓ Up to {plan.maxBusinesses} business{plan.maxBusinesses > 1 ? "es" : ""}</li>
                    <li>{plan.proactive ? "✓ Proactive insights and daily check-ins" : "– No proactive insights"}</li>
                    <li>✓ Password vault on your device</li>
                  </ul>
                  <Button className="mt-6" variant={paid ? "ghost" : "primary"} disabled={paid || !!busy} busy={busy === plan.id} onClick={() => choose(plan)}>
                    {paid ? "Coming soon" : isCurrent ? "Continue with this plan" : `Choose ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </PageShell>
  );
}

export default function PlansPage() {
  return (
    <Suspense>
      <PlanPicker />
    </Suspense>
  );
}
