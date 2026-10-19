import { NextResponse } from "next/server";
import { evaluateCronRequestAuthorization } from "@/server/services/scheduler-attempts";
import { evaluatePurchaseOperations } from "@/server/inventory-transfer/purchase-operations";

export const maxDuration = 120;
export async function POST(request: Request) {
  if (!evaluateCronRequestAuthorization(request, process.env.CRON_SECRET).isAuthorized) return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  try { return NextResponse.json(await evaluatePurchaseOperations()); }
  catch { return NextResponse.json({ error: "Import operations check failed. Check owner, permissions, and alert delivery." }, { status: 503 }); }
}
