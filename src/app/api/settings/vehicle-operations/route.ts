import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { getVehicleOperationsFoundation, rollbackVehicleOperationsFeature, updateVehicleOperationsFeature } from "@/server/enterprise-command/service";

function response(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}
export async function GET() { try { return NextResponse.json(await getVehicleOperationsFoundation(await getCurrentUser())); } catch (error) { return response(error, "Unable to load Vehicle Operations foundation."); } }
export async function PATCH(request: Request) { try { const body = await request.json().catch(() => null), rollback = body && typeof body === "object" && !Array.isArray(body) && String((body as Record<string, unknown>).action ?? "").toUpperCase() === "ROLLBACK"; return NextResponse.json({ flag: rollback ? await rollbackVehicleOperationsFeature(await getCurrentUser(), body) : await updateVehicleOperationsFeature(await getCurrentUser(), body) }); } catch (error) { return response(error, "Unable to update Vehicle Operations rollout."); } }
