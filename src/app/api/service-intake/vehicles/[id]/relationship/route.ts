import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { addVehicleRelationship } from "@/server/vehicle-registry/service";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Service intake vehicle relationship failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Service intake vehicle relationship must be an object.");
    const input = body as Record<string, unknown>;
    if (input.sourceCode !== "SERVICE_INTAKE") throw new Error("Service intake vehicle relationship source is invalid.");
    if (input.relationshipType !== "SERVICE_ONLY") throw new Error("Service intake can only add a service-only customer relationship.");
    if (typeof input.customerId !== "string" || !input.customerId.trim()) throw new Error("Service intake vehicle relationship requires a customer.");
    const { id } = await context.params;
    return NextResponse.json(await addVehicleRelationship(await getCurrentUser(), id, input, { enforceRollout: false }));
  } catch (error) {
    return failure(error);
  }
}
