import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { respondInventoryHandoff } from "@/server/inventory-execution/closeout-service";
function failure(error: unknown) { const message = error instanceof Error ? error.message : "Handoff response failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Only the proposed") ? 403 : message.includes("not found") ? 404 : error instanceof EnterpriseCommandConflictError || message.includes("version") || message.includes("already been") ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await respondInventoryHandoff(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null))); } catch (error) { return failure(error); } }
