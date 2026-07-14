import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { getVehicleOperationsFoundation, updateVehicleOperationsFeature } from "@/server/enterprise-command/service";

function response(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Authentication required." ? 401 : message.startsWith("Vehicle capability required") ? 403 : error instanceof EnterpriseCommandConflictError ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}
export async function GET() { try { return NextResponse.json(await getVehicleOperationsFoundation(await getCurrentUser())); } catch (error) { return response(error, "Unable to load Vehicle Operations foundation."); } }
export async function PATCH(request: Request) { try { return NextResponse.json({ flag: await updateVehicleOperationsFeature(await getCurrentUser(), await request.json().catch(() => null)) }); } catch (error) { return response(error, "Unable to update Vehicle Operations rollout."); } }
