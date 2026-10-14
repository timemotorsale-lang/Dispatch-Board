import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { publishShopReconStageEvidence } from "@/server/shop-recon/service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Operational stage evidence could not be published."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("capability required") || message.includes("required to publish") ? 403 : /version|Idempotency/.test(message) ? 409 : 400 }); }
export async function POST(request: Request, { params }: { params: Promise<{ repairOrderId: string }> }) { try { const { repairOrderId } = await params; return NextResponse.json(await publishShopReconStageEvidence(await getCurrentUser(), repairOrderId, await request.json()), { status: 201 }); } catch (error) { return failure(error); } }
