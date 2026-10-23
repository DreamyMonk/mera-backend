"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Input, Spinner } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";
import type { UserProfile } from "@/lib/shared/types";

type Row = UserProfile & { planName: string; usedUsd: number; quotaUsd: number };

const date = (ms: number) => (ms ? new Date(ms).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "–");

export default function Users() {
  const [users, setUsers] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<{ users: Row[] }>("/api/admin/users").then((r) => setUsers(r.users)).catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users || []).filter((u) => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.uid.includes(q));
  }, [users, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <Input className="!w-72" placeholder="Search by email or name" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {!users ? (
        <div className="mt-10 text-violet-600"><Spinner /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Usage this month</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((u) => (
                <tr key={u.uid} className="hover:bg-violet-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.uid}`} className="font-semibold text-zinc-900 hover:text-violet-700">
                      {u.name || u.email || u.uid}
                    </Link>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">{u.planName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    ${u.usedUsd.toFixed(2)} <span className="text-zinc-400">/ ${u.quotaUsd.toFixed(2)}</span>
                    {u.quotaOverrideUsd !== null && <span className="ml-1.5"><Badge tone="accent">custom</Badge></span>}
                  </td>
                  <td className="px-4 py-3">{u.status === "blocked" ? <Badge tone="bad">Blocked</Badge> : <Badge tone="good">Active</Badge>}</td>
                  <td className="px-4 py-3 text-zinc-500">{date(u.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-500">{date(u.lastActiveAt)}</td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
