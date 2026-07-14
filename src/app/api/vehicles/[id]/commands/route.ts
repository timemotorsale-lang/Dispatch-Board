import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { addVehicleCustodyEvent, addVehicleExternalIdentity, addVehicleOdometerObservation, addVehicleRelationship, resolveVehicleDuplicate } from "@/server/vehicle-registry/service";
const handlers = { ADD_RELATIONSHIP: addVehicleRelationship, ADD_EXTERNAL_IDENTITY: addVehicleExternalIdentity, RECORD_ODOMETER: addVehicleOdometerObservation, RECORD_CUSTODY: addVehicleCustodyEvent, RESOLVE_DUPLICATE: resolveVehicleDuplicate } as const;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Vehicle command must be an object.");
    const action = String((body as Record<string, unknown>).action ?? "") as keyof typeof handlers; const handler = handlers[action]; if (!handler) throw new Error("Vehicle registry action is invalid.");
    return NextResponse.json(await handler(await getCurrentUser(), (await context.params).id, body));
  } catch (error) { const message = error instanceof Error ? error.message : "Vehicle command failed."; const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400; return NextResponse.json({ error: message }, { status }); }
}
