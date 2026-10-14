import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { executeEnterpriseVehicleCommand } from "@/server/enterprise-command/service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Enterprise command payload must be an object.");
    const raw = body as Record<string, unknown>;
    const result = await executeEnterpriseVehicleCommand(await getCurrentUser(), {
      commandType: String(raw.commandType ?? ""), domain: String(raw.domain ?? "VEHICLE_OPERATIONS"),
      expectedVersion: Number(raw.expectedVersion), idempotencyKey: String(raw.idempotencyKey ?? ""),
      locationId: typeof raw.locationId === "string" ? raw.locationId : null,
      payload: raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload) ? raw.payload as Record<string, unknown> : {},
      reason: String(raw.reason ?? ""), subjectId: String(raw.subjectId ?? ""), subjectType: String(raw.subjectType ?? "")
    });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to execute enterprise command.";
    const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
