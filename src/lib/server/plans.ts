import "server-only";
import { db } from "./firebase";
import { HttpError } from "./http";
import type { Plan, UserProfile } from "../shared/types";

const FREE_PLAN: Omit<Plan, "id"> = {
  name: "Free",
  description: "Everything you need to try Mira with one business.",
  priceMonthly: 0,
  monthlyCreditUsd: 2,
  maxBusinesses: 1,
  proactive: true,
  active: true,
  isDefault: true,
  order: 0,
};

function toPlan(id: string, data: FirebaseFirestore.DocumentData): Plan {
  return { ...FREE_PLAN, ...data, id } as Plan;
}

// Creates the Free plan the first time the app runs.
export async function listPlans(activeOnly = false): Promise<Plan[]> {
  const snap = await db().collection("plans").get();
  if (snap.empty) {
    await db().collection("plans").doc("free").set(FREE_PLAN);
    return [{ id: "free", ...FREE_PLAN }];
  }
  return snap.docs
    .map((d) => toPlan(d.id, d.data()))
    .filter((p) => !activeOnly || p.active)
    .sort((a, b) => a.order - b.order || a.priceMonthly - b.priceMonthly);
}

export async function getPlan(id: string | null): Promise<Plan | null> {
  if (!id) return null;
  const doc = await db().collection("plans").doc(id).get();
  return doc.exists ? toPlan(doc.id, doc.data()!) : null;
}

export async function requirePlan(user: UserProfile): Promise<Plan> {
  const plan = await getPlan(user.planId);
  if (!plan) throw new HttpError(402, "plan_required", "Choose a plan at accounts.dreamymonk.xyz to start using Mira.");
  return plan;
}

export function cleanPlan(input: Record<string, unknown>): Partial<Omit<Plan, "id">> {
  const out: Partial<Omit<Plan, "id">> = {};
  const num = (v: unknown, field: string, min = 0) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min) throw new HttpError(400, "invalid_request_error", `${field} must be a number of at least ${min}.`);
    return n;
  };
  if (input.name !== undefined) {
    const name = String(input.name).trim().slice(0, 40);
    if (!name) throw new HttpError(400, "invalid_request_error", "Plan name is required.");
    out.name = name;
  }
  if (input.description !== undefined) out.description = String(input.description).trim().slice(0, 300);
  if (input.priceMonthly !== undefined) out.priceMonthly = num(input.priceMonthly, "Price");
  if (input.monthlyCreditUsd !== undefined) out.monthlyCreditUsd = num(input.monthlyCreditUsd, "Monthly AI credit");
  if (input.maxBusinesses !== undefined) out.maxBusinesses = Math.floor(num(input.maxBusinesses, "Max businesses", 1));
  if (input.order !== undefined) out.order = Math.floor(num(input.order, "Order"));
  if (input.proactive !== undefined) out.proactive = Boolean(input.proactive);
  if (input.active !== undefined) out.active = Boolean(input.active);
  if (input.isDefault !== undefined) out.isDefault = Boolean(input.isDefault);
  return out;
}
