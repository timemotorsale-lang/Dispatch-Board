import { NextResponse } from "next/server";
import { isTrustedAppMutation } from "@/lib/app-request-origin";
import { getDealsUser as getCurrentUser } from "@/server/auth/workflow-user";
import { executeVehicleUse, readDealContinuity } from "@/server/deal-continuity/service";
import { dealIdentityFailure } from "@/server/deal-continuity/http";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return NextResponse.json(await readDealContinuity(await getCurrentUser(), id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return dealIdentityFailure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedAppMutation(request)) return NextResponse.json({ error: "Open this assignment in Deals before recording a change." }, { status: 403 });
  try { const { id } = await context.params; return NextResponse.json(await executeVehicleUse(await getCurrentUser(), id, await request.json()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return dealIdentityFailure(error); }
}
