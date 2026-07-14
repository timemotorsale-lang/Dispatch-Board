import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { correctRegistryVehicle, getVehicleRegistryDetail } from "@/server/vehicle-registry/service";
function failure(error: unknown) { const message = error instanceof Error ? error.message : "Vehicle registry request failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : message === "Vehicle was not found." ? 404 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await getVehicleRegistryDetail(await getCurrentUser(), (await context.params).id)); } catch (error) { return failure(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await correctRegistryVehicle(await getCurrentUser(), (await context.params).id, await request.json().catch(() => null))); } catch (error) { return failure(error); } }
