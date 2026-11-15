import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { isRoutePermittedForUser } from "@/server/auth/navigation";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({}, { status: 401, headers });
  if (!isRoutePermittedForUser(user, "/vehicles")) return NextResponse.json({}, { status: 403, headers });

  try {
    const flags = await createEnterpriseCommandRepository().listFeatureFlags(INITIAL_ORGANIZATION.id);
    const relevantCodes = new Set(["VEHICLE_OPERATIONS_MASTER", "INVENTORY_INTAKE", "RETAIL_INVENTORY"]);
    if (flags.some(flag => flag.locationId !== null && relevantCodes.has(flag.code))) {
      return NextResponse.json({ status: "location-scoped" }, { headers });
    }
    const decisions = (["INVENTORY_INTAKE", "RETAIL_INVENTORY"] as const).map(feature =>
      evaluateVehicleOperationsFeature(flags, feature, user.id, null),
    );
    const status = decisions.every(decision => decision.reason === "GENERAL_RELEASE") ? "enabled"
      : decisions.every(decision => !decision.enabled) ? "paused"
      : "limited";
    return NextResponse.json({ status }, { headers });
  } catch {
    return NextResponse.json({}, { status: 503, headers });
  }
}
