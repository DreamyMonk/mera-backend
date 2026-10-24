"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Brand, Button, Card, MiraLogo, PageShell, Spinner } from "@/components/ui";
import { api } from "@/lib/client/firebase";
import { useSignedIn } from "@/lib/client/use-signed-in";
import type { Me } from "@/lib/client/after-login";

type ChromeRuntime = { sendMessage: (id: string, msg: unknown, cb: (res: unknown) => void) => void; lastError?: { message: string } };
declare global {
  interface Window {
    chrome?: { runtime?: ChromeRuntime };
  }
}

// In production only the published extension may receive a sign-in token.
// During development the extension passes its own id in ?ext=.
function extensionId(param: string | null) {
  return process.env.NEXT_PUBLIC_EXTENSION_ID || param || "";
}

function sendToExtension(id: string, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const runtime = window.chrome?.runtime;
    if (!runtime?.sendMessage) return reject(new Error("not-installed"));
    runtime.sendMessage(id, { type: "mira-auth", token }, (res) => {
      if (runtime.lastError || !(res as { ok?: boolean })?.ok) reject(new Error("not-installed"));
      else resolve();
    });
  });
}

function Connect() {
  const router = useRouter();
  const params = useSearchParams();
  const ext = extensionId(params.get("ext"));
  const here = `/extension/connect${params.get("ext") ? `?ext=${encodeURIComponent(params.get("ext")!)}` : ""}`;
  const user = useSignedIn(here);
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "missing">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api<Me>("/api/me")
      .then((data) => (data.plan ? setMe(data) : router.replace(`/plans?next=${encodeURIComponent(here)}`)))
      .catch((err) => setError(err.message));
  }, [user, router, here]);

  async function connect() {
    setError("");
    setState("busy");
    try {
      const { token } = await api<{ token: string }>("/api/extension/token", { method: "POST" });
      await sendToExtension(ext, token);
      setState("done");
    } catch (err) {
      if ((err as Error).message === "not-installed") setState("missing");
      else {
        setError((err as Error).message);
        setState("idle");
      }
    }
  }

  return (
    <PageShell>
      <header>
        <Brand href="/account" />
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-md text-center">
          <div className="flex justify-center">
            <MiraLogo size={88} />
          </div>
          {!me ? (
            <div className="mt-6 flex justify-center text-blue-600">{error ? <Alert>{error}</Alert> : <Spinner />}</div>
          ) : state === "done" ? (
            <>
              <h1 className="mt-5 text-2xl font-bold">You&apos;re connected 🎉</h1>
              <p className="mt-2 text-zinc-600">Mira is signed in as {me.user.email}. You can close this tab and open Mira from your toolbar.</p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-bold">Connect Mira to your account</h1>
              <p className="mt-2 text-zinc-600">
                The Mira extension will be signed in as <span className="font-semibold text-zinc-900">{me.user.email}</span> on the {me.plan?.name} plan.
              </p>
              {state === "missing" && (
                <div className="mt-5 text-left">
                  <Alert tone="info">
                    We couldn&apos;t reach the Mira extension. Make sure it&apos;s installed and turned on in Chrome, then open this page from the
                    &quot;Sign in&quot; button in Mira&apos;s side panel.
                  </Alert>
                </div>
              )}
              {error && <div className="mt-5 text-left"><Alert>{error}</Alert></div>}
              <Button className="mt-6 w-full" onClick={connect} busy={state === "busy"} disabled={!ext}>
                Connect extension
              </Button>
              {!ext && <p className="mt-3 text-xs text-zinc-500">Open this page from the Mira extension&apos;s side panel.</p>}
            </>
          )}
        </Card>
      </main>
    </PageShell>
  );
}

export default function ConnectPage() {
  return (
    <Suspense>
      <Connect />
    </Suspense>
  );
}
