import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { controlInventoryWorkSession } from "@/server/inventory-execution/work-time-service";
function failure(error: unknown) { const message = error instanceof Error ? error.message : "Work-session request failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Only the assigned") ? 403 : message.includes("not found") ? 404 : error instanceof EnterpriseCommandConflictError ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await controlInventoryWorkSession(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null))); } catch (error) { return failure(error); } }
