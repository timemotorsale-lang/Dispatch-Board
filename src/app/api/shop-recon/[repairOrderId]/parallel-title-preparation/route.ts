import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTitlePreparation, startTitlePreparation, updateTitlePreparation } from "@/server/shop-recon/parallel-title-preparation-service";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Parallel title preparation could not be updated.";
  return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : /capability required|Only the/.test(message) ? 403 : /version|Idempotency/.test(message) ? 409 : 400 });
}
export async function GET(_request: Request, { params }: { params: Promise<{ repairOrderId: string }> }) {
  try { return NextResponse.json(await getTitlePreparation(await getCurrentUser(), (await params).repairOrderId)); } catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ repairOrderId: string }> }) {
  try { return NextResponse.json(await startTitlePreparation(await getCurrentUser(), (await params).repairOrderId, await request.json()), { status: 201 }); } catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ repairOrderId: string }> }) {
  try { return NextResponse.json(await updateTitlePreparation(await getCurrentUser(), (await params).repairOrderId, await request.json())); } catch (error) { return failure(error); }
}
