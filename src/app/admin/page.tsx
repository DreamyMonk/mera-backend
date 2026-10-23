"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Spinner } from "@/components/ui";
import { adminApi } from "@/lib/client/firebase";

type Stats = { users: number; blocked: number; active30: number; month: string; monthCostUsd: number; monthRequests: number };

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminApi<Stats>("/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <div className="text-violet-600"><Spinner /></div>;

  const tiles = [
    ["Users", stats.users.toLocaleString()],
    ["Active in last 30 days", stats.active30.toLocaleString()],
    ["Blocked", stats.blocked.toLocaleString()],
    [`AI cost in ${stats.month}`, `$${stats.monthCostUsd.toFixed(2)}`],
    [`Claude requests in ${stats.month}`, stats.monthRequests.toLocaleString()],
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map(([label, value]) => (
          <Card key={label} className="!p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
