import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { launchReceiptToRecon } from "@/server/inventory-execution/receipt-to-recon-service";
function failure(error: unknown) { const message = error instanceof Error ? error.message : "Receipt-to-recon launch failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Manager authority") ? 403 : message.includes("not found") ? 404 : error instanceof EnterpriseCommandConflictError || message.includes("already has") || message.includes("version") ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const result = await launchReceiptToRecon(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null)); return NextResponse.json(result, { status: result.duplicate ? 200 : 201 }); } catch (error) { return failure(error); } }
