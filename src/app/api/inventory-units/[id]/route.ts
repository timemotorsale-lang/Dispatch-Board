import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { getInventoryUnitDetail, updateInventoryUnitControl } from "@/server/inventory-unit/service";
function failure(error: unknown) { const message = error instanceof Error ? error.message : "Inventory unit request failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : message === "Inventory unit was not found." ? 404 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await getInventoryUnitDetail(await getCurrentUser(), (await context.params).id)); } catch (error) { return failure(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await updateInventoryUnitControl(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null))); } catch (error) { return failure(error); } }
