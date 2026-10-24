"use client";

import Link from "next/link";
import { Brand, MiraLogo, OneAuthLogo, PageShell } from "@/components/ui";
import { useUser } from "@/lib/client/firebase";

const MIRA_FEATURES = [
  ["Sees your dashboards", "Reads any store admin, ad manager or marketplace, so there's nothing to connect."],
  ["Acts for you", "Clicks, types and fills in forms. You choose whether it asks first or works on its own."],
  ["Thinks like a co-founder", "Spots problems on its own, remembers your goals and runs Autopilot checks for you."],
];

export default function Home() {
  const user = useUser();
  return (
    <PageShell>
      <header className="flex items-center justify-between">
        <Brand />
        {user ? (
          <Link href="/account" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
            My account
          </Link>
        ) : (
          <Link href="/login" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold">
            Sign in
          </Link>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-14 text-center">
        <OneAuthLogo width={220} />
        <h1 className="mt-8 max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">One secure account for every dreamymonk app</h1>
        <p className="mt-3 max-w-xl text-lg text-zinc-600">Sign in once with Google or email, and use it for Mira and everything else we build.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={user ? "/account" : "/login?mode=signup"}
            className="rounded-xl bg-gradient-to-br from-[#2f80ff] to-[#0b47d1] px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30"
          >
            {user ? "Go to my account" : "Create a free account"}
          </Link>
          {!user && (
            <Link href="/login" className="rounded-xl border border-zinc-200 bg-white px-6 py-3 font-semibold">
              Sign in
            </Link>
          )}
        </div>

        <section className="mt-16 w-full rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 text-left sm:p-8">
          <div className="flex items-center gap-4">
            <MiraLogo size={64} />
            <div>
              <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase">Chrome extension</p>
              <h2 className="text-xl font-bold text-zinc-900">Mira, your AI co-founder in the browser</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {MIRA_FEATURES.map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-zinc-200 bg-white/80 p-5">
                <h3 className="font-semibold text-zinc-900">{title}</h3>
                <p className="mt-1.5 text-sm text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
