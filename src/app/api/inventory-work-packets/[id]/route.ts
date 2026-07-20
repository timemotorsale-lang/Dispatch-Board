import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { getInventoryWorkPacket, setInventoryWorkPacketPosition } from "@/server/inventory-execution/work-packet-service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Inventory Work Packet request failed."; const status = message === "Authentication required." ? 401 : message.includes("authority is required") || message.startsWith("Vehicle capability required") ? 403 : message.includes("not found") ? 404 : error instanceof EnterpriseCommandConflictError || message.includes("already has") ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await getInventoryWorkPacket(await getCurrentUser(), (await context.params).id)); } catch (error) { return failure(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await setInventoryWorkPacketPosition(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null))); } catch (error) { return failure(error); } }
