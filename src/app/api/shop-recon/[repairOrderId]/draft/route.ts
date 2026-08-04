import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { saveShopReconStageDraft } from "@/server/shop-recon/service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Stage draft could not be saved."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : /version|Idempotency/.test(message) ? 409 : 400 }); }
export async function POST(request: Request, { params }: { params: Promise<{ repairOrderId: string }> }) { try { const { repairOrderId } = await params; return NextResponse.json(await saveShopReconStageDraft(await getCurrentUser(), repairOrderId, await request.json()), { status: 201 }); } catch (error) { return failure(error); } }
