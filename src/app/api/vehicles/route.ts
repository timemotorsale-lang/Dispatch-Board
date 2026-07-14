import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createRegistryVehicle, listVehicleRegistry } from "@/server/vehicle-registry/service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Vehicle registry request failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET(request: Request) { try { const url = new URL(request.url); return NextResponse.json(await listVehicleRegistry(await getCurrentUser(), { page: url.searchParams.get("page"), pageSize: url.searchParams.get("pageSize"), query: url.searchParams.get("query") })); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { const result = await createRegistryVehicle(await getCurrentUser(), await request.json().catch(() => null)); return NextResponse.json(result, { status: result.duplicate ? 200 : 201 }); } catch (error) { return failure(error); } }
