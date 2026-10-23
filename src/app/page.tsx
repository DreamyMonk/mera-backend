"use client";

import Link from "next/link";
import { Brand, PageShell } from "@/components/ui";
import { useUser } from "@/lib/client/firebase";

const FEATURES = [
  ["Sees your dashboards", "Mira reads any store admin, ad manager or marketplace, so there's nothing to connect."],
  ["Acts for you", "It clicks, types and fills in forms. You choose whether it asks first or works on its own."],
  ["Thinks like a co-founder", "It spots problems on its own, remembers your goals and checks in every morning."],
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

      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="mb-5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Chrome extension</span>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">Your AI co-founder, right in your browser</h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600">
          Mira helps you run and grow your online store: it reads your dashboards, fixes what&apos;s wrong and tells you what to do next.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={user ? "/account" : "/login?mode=signup"}
            className="rounded-xl bg-gradient-to-br from-[#6d5dfc] to-[#c056f2] px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/30"
          >
            {user ? "Go to my account" : "Create a free account"}
          </Link>
          {!user && (
            <Link href="/login" className="rounded-xl border border-zinc-200 bg-white px-6 py-3 font-semibold">
              Sign in
            </Link>
          )}
        </div>

        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-zinc-200 bg-white/80 p-5">
              <h3 className="font-semibold text-zinc-900">{title}</h3>
              <p className="mt-1.5 text-sm text-zinc-600">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
