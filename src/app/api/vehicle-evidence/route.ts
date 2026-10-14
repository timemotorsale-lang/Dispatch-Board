import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { uploadVehicleEvidence } from "@/server/vehicle-360/service";

export async function POST(request: Request) {
  try { return NextResponse.json(await uploadVehicleEvidence(await getCurrentUser(), await request.json().catch(() => null)), { status: 201 }); }
  catch (error) { const message = error instanceof Error ? error.message : "Evidence upload failed."; return NextResponse.json({ error: message }, { status: message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : message === "Vehicle was not found." ? 404 : 400 }); }
}
