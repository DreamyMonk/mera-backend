"use client";

import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alert, Button, Card, Field, Input, MiraLogo, Spinner } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/plans", "Plans"],
  ["/admin/settings", "Settings"],
];

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/session", { method: "POST", body: JSON.stringify({ password }) });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <MiraLogo size={40} />
          <div>
            <h1 className="font-bold">Mira admin</h1>
            <p className="text-sm text-zinc-500">dashboard.dreamymonk.xyz</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <Field label="Admin password">
            <Input type="password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" busy={busy}>Sign in</Button>
        </form>
      </Card>
    </div>
  );
}

// Admin pages read the URL (path, params), so they render inside a Suspense boundary.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-blue-600"><Spinner /></div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<boolean | null>(null);

  const check = () => adminApi<{ admin: boolean }>("/api/admin/session").then((r) => setAdmin(r.admin)).catch(() => setAdmin(false));
  useEffect(() => {
    check();
  }, []);

  if (admin === null) return <div className="flex min-h-dvh items-center justify-center text-blue-600"><Spinner /></div>;
  if (!admin) return <AdminLogin onDone={check} />;

  async function logout() {
    await adminApi("/api/admin/session", { method: "DELETE" });
    setAdmin(false);
  }

  return (
    <div className="min-h-dvh bg-zinc-50 md:flex">
      <aside className="border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <MiraLogo size={32} />
          <span className="font-bold">Mira admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map(([href, label]) => {
            const active = href === "/admin" ? pathname === "/admin" || pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${active ? "bg-blue-50 text-blue-700" : "text-zinc-600 hover:bg-zinc-100"}`}
              >
                {label}
              </Link>
            );
          })}
          <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap text-zinc-500 hover:bg-zinc-100 md:mt-4">
            Sign out
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
