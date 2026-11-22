import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { listVehicleWorkActions } from "@/server/repair-order/resume-service";
import { createRegistryVehicle, listVehicleRegistry } from "@/server/vehicle-registry/service";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "Vehicle registry request failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();
    const registry = await listVehicleRegistry(user, {
      page: searchParams.get("page"), pageSize: searchParams.get("pageSize"),
      query: searchParams.get("query") ?? searchParams.get("q"),
    });
    if (!user || searchParams.get("includeWork") !== "1") return NextResponse.json(registry);
    const work = await listVehicleWorkActions(user, registry.items.map(item => item.id));
    return NextResponse.json({ ...registry, items: registry.items.map(item => ({ ...item, work: work[item.id] })) });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) { try { const result = await createRegistryVehicle(await getCurrentUser(), await request.json().catch(() => null)); return NextResponse.json(result, { status: result.duplicate ? 200 : 201 }); } catch (error) { return failure(error); } }
