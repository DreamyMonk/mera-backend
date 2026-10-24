"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Brand, Button, Card, Field, Input, OneAuthLogo, PageShell, Spinner } from "@/components/ui";

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/auth/password-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Something went wrong. Please try again.");
  return data as T;
}

function Reset() {
  const code = useSearchParams().get("code") || "";
  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(code ? "" : "This reset link is incomplete. Open it again from the email, or ask for a new one.");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Check the link first, so an expired one says so before anyone types a password.
  useEffect(() => {
    if (!code) return;
    post<{ email: string }>({ action: "check", code })
      .then((r) => setEmail(r.email))
      .catch((err) => setLinkError(err.message));
  }, [code]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await post({ action: "confirm", code, password });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <PageShell>
      <header>
        <Brand />
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <div className="mb-5 flex justify-center">
            <OneAuthLogo width={130} />
          </div>
          {linkError ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Link not valid</h1>
              <div className="mt-4 text-left"><Alert>{linkError}</Alert></div>
              <Link href="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline">Send me a new link</Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Password changed ✓</h1>
              <p className="mt-2 text-sm text-zinc-500">You can now sign in with your new password. For safety, your other devices were signed out.</p>
              <Link
                href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                className="mt-6 inline-flex rounded-xl bg-gradient-to-br from-[#2f80ff] to-[#0b47d1] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25"
              >
                Sign in
              </Link>
            </div>
          ) : !email ? (
            <div className="flex justify-center py-6 text-blue-600"><Spinner /></div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold tracking-tight">Choose a new password</h1>
              <p className="mt-1 text-center text-sm text-zinc-500">
                For <span className="font-semibold text-zinc-800">{email}</span>
              </p>
              <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <Field label="New password" hint="At least 8 characters.">
                  <Input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                </Field>
                <Field label="Repeat new password">
                  <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                </Field>
                {error && <Alert>{error}</Alert>}
                <Button type="submit" busy={busy}>Save new password</Button>
              </form>
            </>
          )}
        </Card>
      </main>
    </PageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}
