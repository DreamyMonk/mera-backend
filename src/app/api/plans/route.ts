import { connection } from "next/server";
import { route } from "@/lib/server/http";
import { listPlans } from "@/lib/server/plans";

// Public list of plans users can pick from. Always read live, never prerendered.
export const GET = route(async () => {
  await connection();
  return Response.json({ plans: await listPlans(true) });
});
