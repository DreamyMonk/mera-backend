"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Brand, Button, Card, Field, Input, OneAuthLogo, PageShell } from "@/components/ui";

function Forgot() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request", email: email.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong. Please try again.");
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
              <p className="mt-2 text-sm text-zinc-500">
                If there&apos;s a OneAuth account for <span className="font-semibold text-zinc-800">{email}</span>, we&apos;ve sent a link to reset its
                password. It expires in 1 hour.
              </p>
              <p className="mt-4 text-xs text-zinc-400">Nothing arrived? Check spam, or try again in a minute.</p>
              <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline">Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold tracking-tight">Forgot your password?</h1>
              <p className="mt-1 text-center text-sm text-zinc-500">Enter your email and we&apos;ll send you a link to choose a new one.</p>
              <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <Field label="Email">
                  <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </Field>
                {error && <Alert>{error}</Alert>}
                <Button type="submit" busy={busy}>Send reset link</Button>
              </form>
              <p className="mt-6 text-center text-sm text-zinc-500">
                Remembered it? <Link href="/login" className="font-semibold text-blue-700 hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </Card>
      </main>
    </PageShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <Forgot />
    </Suspense>
  );
}
