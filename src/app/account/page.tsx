"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Alert, Badge, Brand, Button, Card, Field, Input, PageShell, Spinner, Textarea, UsageBar } from "@/components/ui";
import { api, auth } from "@/lib/client/firebase";
import { useSignedIn } from "@/lib/client/use-signed-in";
import { routeFor, type Me } from "@/lib/client/after-login";

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

// Email verification status and the 2-step verification switch.
function SecurityCard({ me, onChange }: { me: Me; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const on = me.user.twoFactor;
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Changing the password works through the same emailed link as "Forgot password".
  async function sendReset() {
    setResetBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request", email: me.user.email }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || "Couldn't send the email.");
      setResetSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setResetBusy(false);
  }

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      await api("/api/me/security", { method: "PATCH", body: JSON.stringify({ twoFactor: !on }) });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Security</h2>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-600">Email</span>
        {me.user.emailVerified ? <Badge tone="good">Verified</Badge> : <Badge tone="bad">Not verified</Badge>}
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">2-step verification</p>
            <p className="mt-0.5 text-xs text-zinc-500">We&apos;ll email you a code each time you sign in on a new device or browser.</p>
          </div>
          <button
            role="switch"
            aria-checked={on}
            aria-label="2-step verification"
            disabled={busy}
            onClick={toggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-blue-600" : "bg-zinc-300"} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Password</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {resetSent ? "Check your inbox for a link to choose a new password." : me.provider === "google.com" ? "Add a password to also sign in with your email." : "We'll email you a link to choose a new one."}
          </p>
        </div>
        <Button variant="ghost" className="!px-3 !py-1.5 shrink-0" busy={resetBusy} disabled={resetSent} onClick={sendReset}>
          {me.provider === "google.com" ? "Set password" : "Change"}
        </Button>
      </div>
    </Card>
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
      .then((data) => (data.user.status !== "blocked" && routeFor(data, "/account") !== "/account" ? router.replace(routeFor(data, "/account")) : setMe(data)))
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

          <SecurityCard me={me} onChange={load} />

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
