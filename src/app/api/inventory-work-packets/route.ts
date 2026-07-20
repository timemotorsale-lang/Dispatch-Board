import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createInventoryWorkPacket } from "@/server/inventory-execution/work-packet-service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Inventory Work Packet request failed."; const status = message === "Authentication required." ? 401 : message.includes("authority is required") || message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError || message.includes("already has") ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function POST(request: Request) { try { const result = await createInventoryWorkPacket(await getCurrentUser(), await request.json().catch(() => null)); return NextResponse.json(result, { status: result.duplicate ? 200 : 201 }); } catch (error) { return failure(error); } }
