import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getShopReconLifecycleWorkspace } from "@/server/shop-recon/service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Shop lifecycle workspace could not be loaded."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.includes("capability required") ? 403 : 400 }); }
export async function GET(_: Request, { params }: { params: Promise<{ repairOrderId: string }> }) { try { const { repairOrderId } = await params; return NextResponse.json(await getShopReconLifecycleWorkspace(await getCurrentUser(), repairOrderId)); } catch (error) { return failure(error); } }
