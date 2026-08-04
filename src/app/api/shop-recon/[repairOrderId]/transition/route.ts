import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { completeShopReconStage } from "@/server/shop-recon/service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Stage could not be completed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("capability required") || message.includes("authority") ? 403 : /version|Idempotency/.test(message) ? 409 : 400 }); }
export async function POST(request: Request, { params }: { params: Promise<{ repairOrderId: string }> }) { try { const { repairOrderId } = await params; return NextResponse.json(await completeShopReconStage(await getCurrentUser(), repairOrderId, await request.json())); } catch (error) { return failure(error); } }
