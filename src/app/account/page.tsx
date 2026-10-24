"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Alert, Badge, Brand, Button, Card, Field, Input, PageShell, Spinner, Textarea, UsageBar } from "@/components/ui";
import { api, auth } from "@/lib/client/firebase";
import { useSignedIn } from "@/lib/client/use-signed-in";
import type { Me } from "@/lib/client/after-login";

type Business = Me["businesses"][number];

function BusinessRow({ business, canDelete, onChange }: { business: Business; canDelete: boolean; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(business.name);
  const [about, setAbout] = useState(business.about);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/businesses/${business.id}`, { method: "PATCH", body: JSON.stringify({ name, about }) });
      setEditing(false);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Delete "${business.name}" with all its notes and chats?`)) return;
    try {
      await api(`/api/businesses/${business.id}`, { method: "DELETE" });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!editing) {
    return (
      <li className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="font-semibold">{business.name}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{business.about || "No description yet. Tell Mira about this business so its advice fits."}</p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setEditing(true)}>Edit</Button>
          {canDelete && <Button variant="ghost" className="!px-3 !py-1.5 hover:!border-red-300 hover:!text-red-600" onClick={remove}>Delete</Button>}
        </div>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-3 py-4">
      <Field label="Business name">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>
      <Field label="About this business" hint="What you sell, where, who your customers are, budgets and goals. Mira reads this in every chat.">
        <Textarea rows={4} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={4000} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button onClick={save} busy={busy}>Save</Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </li>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const user = useSignedIn("/account");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const [version, setVersion] = useState(0); // bump to reload after a change
  const load = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!user) return;
    api<Me>("/api/me")
      .then((data) => (!data.plan && data.user.status !== "blocked" ? router.replace("/plans?next=/account") : setMe(data)))
      .catch((err) => setError(err.message));
  }, [user, router, version]);

  async function addBusiness() {
    setError("");
    try {
      await api("/api/businesses", { method: "POST", body: JSON.stringify({ name: newName || "New business" }) });
      setNewName("");
      setAdding(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function logout() {
    await signOut(auth());
    router.replace("/login");
  }

  if (!me) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-blue-600">{error ? <Alert>{error}</Alert> : <Spinner />}</div>
      </PageShell>
    );
  }

  const atLimit = me.businesses.length >= (me.plan?.maxBusinesses ?? 1);

  return (
    <PageShell>
      <header className="flex items-center justify-between">
        <Brand href="/account" />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:inline">{me.user.email}</span>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      </header>

      <main className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hi{me.user.name ? `, ${me.user.name.split(" ")[0]}` : ""} 👋</h1>
            <p className="text-zinc-500">Manage your Mira account and businesses.</p>
          </div>

          {me.user.status === "blocked" && <Alert>Your account has been blocked. Contact support if you think this is a mistake.</Alert>}
          {error && <Alert>{error}</Alert>}

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your businesses</h2>
              <span className="text-sm text-zinc-500">{me.businesses.length} of {me.plan?.maxBusinesses ?? 1}</span>
            </div>
            <ul className="mt-2 divide-y divide-zinc-100">
              {me.businesses.map((b) => (
                <BusinessRow key={b.id} business={b} canDelete={me.businesses.length > 1} onChange={load} />
              ))}
            </ul>
            {adding ? (
              <div className="mt-2 flex gap-2">
                <Input autoFocus placeholder="Business name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
                <Button onClick={addBusiness}>Add</Button>
                <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" className="mt-2" disabled={atLimit} onClick={() => setAdding(true)} title={atLimit ? "Upgrade your plan to add more businesses" : ""}>
                + Add a business
              </Button>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plan</h2>
              <Badge tone="accent">{me.plan?.name ?? "None"}</Badge>
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-700">AI usage this month</p>
            <div className="mt-2">
              <UsageBar used={me.usage.usedUsd} quota={me.usage.quotaUsd} />
            </div>
            <Link href="/plans?next=/account" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
              Change plan
            </Link>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white">
            <h2 className="text-lg font-semibold">Chrome extension</h2>
            <p className="mt-1 text-sm text-zinc-600">Sign the Mira extension in to this account to start working with it.</p>
            <Link
              href="/extension/connect"
              className="mt-4 inline-flex rounded-xl bg-gradient-to-br from-[#2f80ff] to-[#0b47d1] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25"
            >
              Connect the extension
            </Link>
          </Card>
        </div>
      </main>
    </PageShell>
  );
}
