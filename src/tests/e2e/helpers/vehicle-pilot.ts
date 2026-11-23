import { vehiclePilotFeatureCode } from "@/lib/vehicle-pilot";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { assertLaborStagingTarget } from "../../../../scripts/lib/labor-staging-target.mjs";

export async function configureSyntheticVehiclePilot(mode: "OFF" | "PILOT" | "GENERAL", allowedUserIds: string[] = []) {
  const connection = process.env.DATABASE_URL ?? "";
  const target = new URL(connection);
  const schema = target.searchParams.get("schema") ?? "";
  if (target.hostname !== "127.0.0.1" || !/^dispatch_board_e2e_[a-z0-9_]+$/.test(schema)) {
    if (process.env.LABOR_STAGING_CONFIRM !== "isolated") throw new Error("Use a disposable Vehicle Pilot test schema.");
    assertLaborStagingTarget(connection);
  }

  const pilot = { organizationId: INITIAL_ORGANIZATION.id, locationId: null, code: vehiclePilotFeatureCode };
  const data = { mode, rolloutPercent: mode === "GENERAL" ? 100 : 0, allowedUserIds };
  const existing = await prisma.vehicleOperationsFeatureFlag.findFirst({ where: pilot });
  if (existing) await prisma.vehicleOperationsFeatureFlag.update({ where: { id: existing.id }, data });
  else await prisma.vehicleOperationsFeatureFlag.create({ data: { ...pilot, ...data } });
}
