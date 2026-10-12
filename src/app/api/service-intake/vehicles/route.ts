import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { startAddVehicleWorkflow } from "@/server/inventory-workflow-launcher/add-vehicle";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Service intake vehicle creation failed.";
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await startAddVehicleWorkflow(await getCurrentUser(), await request.json().catch(() => null), { enforceRegistryRollout: false }), { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
