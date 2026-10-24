"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { Alert, Brand, Button, Card, OneAuthLogo, PageShell, Spinner } from "@/components/ui";
import { api, auth } from "@/lib/client/firebase";
import { destinationAfterLogin, safeNext } from "@/lib/client/after-login";
import { useSignedIn } from "@/lib/client/use-signed-in";

const RESEND_SECONDS = 45;
const COPY = {
  verify_email: { title: "Check your email", intro: "We sent a 6-digit code to", why: "This confirms the address belongs to you." },
  two_factor: { title: "2-step verification", intro: "Enter the sign-in code we sent to", why: "2-step verification is on for your account." },
} as const;

function Verify() {
  const router = useRouter();
  const params = useSearchParams();
  const step = params.get("step") === "two_factor" ? "two_factor" : "verify_email";
  const next = safeNext(params.get("next"));
  const user = useSignedIn(`/verify?step=${step}&next=${encodeURIComponent(next)}`);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [wait, setWait] = useState(0);
  const sentOnce = useRef(false);

  async function continueOn() {
    router.replace(await destinationAfterLogin(next));
  }

  async function send() {
    setError("");
    try {
      const r = await api<{ done?: boolean; sentTo?: string }>("/api/auth/code", { method: "POST", body: JSON.stringify({ action: "send", purpose: step }) });
      if (r.done && !r.sentTo) return continueOn(); // already verified
      setSentTo(r.sentTo || "");
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Send the first code as soon as we know who's signed in.
  useEffect(() => {
    if (!user || sentOnce.current) return;
    sentOnce.current = true;
    send();
  });

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(value = code) {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/code", { method: "POST", body: JSON.stringify({ action: "verify", purpose: step, code: value }) });
      await continueOn();
    } catch (err) {
      setError((err as Error).message);
      setCode("");
      setBusy(false);
    }
  }

  function onChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verify(digits); // finish as soon as the last digit is typed or pasted
  }

  const copy = COPY[step];

  return (
    <PageShell>
      <header>
        <Brand />
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-md text-center">
          <div className="mb-5 flex justify-center">
            <OneAuthLogo width={130} />
          </div>
          {!user ? (
            <div className="flex justify-center py-6 text-blue-600"><Spinner /></div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
              <p className="mt-2 text-sm text-zinc-500">
                {copy.intro} <span className="font-semibold text-zinc-800">{sentTo || user.email}</span>. {copy.why}
              </p>
              <form
                className="mt-6"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  verify();
                }}
              >
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="6-digit code"
                  value={code}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="••••••"
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-4 text-center font-mono text-3xl font-bold tracking-[0.5em] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                {error && <div className="mt-4 text-left"><Alert>{error}</Alert></div>}
                <Button type="submit" className="mt-5 w-full" busy={busy} disabled={code.length !== 6}>
                  Verify
                </Button>
              </form>
              <div className="mt-5 flex items-center justify-center gap-4 text-sm">
                <button className="font-semibold text-blue-700 disabled:text-zinc-400" disabled={wait > 0} onClick={send}>
                  {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                </button>
                <span className="text-zinc-300">·</span>
                <button
                  className="text-zinc-500 hover:text-zinc-800"
                  onClick={async () => {
                    await signOut(auth());
                    router.replace("/login");
                  }}
                >
                  Use another account
                </button>
              </div>
              <p className="mt-4 text-xs text-zinc-400">Can&apos;t find it? Check your spam or promotions folder. Codes expire after 10 minutes.</p>
            </>
          )}
        </Card>
      </main>
    </PageShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
