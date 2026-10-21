import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { executeVehicleUse, readDealContinuity } from "@/server/deal-continuity/service";
import { dealIdentityFailure } from "@/server/deal-continuity/http";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return NextResponse.json(await readDealContinuity(await getCurrentUser(), id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return dealIdentityFailure(error); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return NextResponse.json(await executeVehicleUse(await getCurrentUser(), id, await request.json()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return dealIdentityFailure(error); }
}
