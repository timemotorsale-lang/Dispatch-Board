import { PrismaClient } from "@prisma/client";

import { SHOP_RECON_PILOT_CONTRACT_VERSION, SHOP_RECON_PILOT_SCENARIOS } from "../src/server/shop-recon/pilot";

const prisma = new PrismaClient();

function pilotSeedEnabled() {
  return process.env.ENABLE_DEMO_DATA === "true" && process.env.ENABLE_SHOP_RECON_PILOT_SEED === "true";
}

function plusHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * 60 * 60 * 1_000);
}

async function main() {
  if (!pilotSeedEnabled()) {
    console.log(
      "Shop & Recon pilot seed skipped. Set ENABLE_DEMO_DATA=true and ENABLE_SHOP_RECON_PILOT_SEED=true to create demo pilot records."
    );
    return;
  }

  const [organization, location, brock, eli, walter] = await Promise.all([
    prisma.organization.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, code: true } }),
    prisma.location.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { name: { startsWith: "Brock", mode: "insensitive" }, isActive: true }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { name: { startsWith: "Eli", mode: "insensitive" }, isActive: true }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { OR: [{ email: "casey.mechanic@local.test" }, { name: { startsWith: "Walter", mode: "insensitive" } }], isActive: true }, select: { id: true, name: true } }),
  ]);

  if (!organization || !location || !brock || !eli || !walter) {
    throw new Error("Run the foundation development seed first; the pilot requires the organization, location, Brock, Eli and Walter.");
  }

  if (walter.name !== "Walter Hernandez") {
    await prisma.user.update({ where: { id: walter.id }, data: { name: "Walter Hernandez" } });
    await prisma.schedulableResource.updateMany({ where: { userId: walter.id }, data: { name: "Walter Hernandez" } });
  }

  const now = new Date();
  const customer = await prisma.customer.upsert({
    where: { organizationId_customerNumber: { organizationId: organization.id, customerNumber: "PILOT-CUST-001" } },
    update: { displayName: "Jordan Pilot", email: "jordan.pilot@example.test", phoneNumber: "+16125550101", status: "ACTIVE", sourceCode: "SHOP_RECON_PILOT" },
    create: { id: "pilot-shop-customer", organizationId: organization.id, customerNumber: "PILOT-CUST-001", displayName: "Jordan Pilot", email: "jordan.pilot@example.test", phoneNumber: "+16125550101", status: "ACTIVE", sourceCode: "SHOP_RECON_PILOT", ownerUserId: eli.id },
  });

  const customerVehicle = await prisma.vehicle.upsert({
    where: { organizationId_vehicleNumber: { organizationId: organization.id, vehicleNumber: "PILOT-CUST-VEH" } },
    update: { year: 2018, make: "Honda", model: "Accord", color: "Silver", vin: "1HGCV1F30JA000101", vinRaw: "1HGCV1F30JA000101", vinState: "LEGACY_UNVERIFIED", status: "ACTIVE", externalReference: "SHOP_RECON_PILOT_CUSTOMER" },
    create: { id: "pilot-shop-customer-vehicle", organizationId: organization.id, vehicleNumber: "PILOT-CUST-VEH", year: 2018, make: "Honda", model: "Accord", color: "Silver", vin: "1HGCV1F30JA000101", vinRaw: "1HGCV1F30JA000101", vinState: "LEGACY_UNVERIFIED", status: "ACTIVE", externalReference: "SHOP_RECON_PILOT_CUSTOMER", canonicalOrigins: { pilot: SHOP_RECON_PILOT_CONTRACT_VERSION } },
  });

  const inventoryVehicle = await prisma.vehicle.upsert({
    where: { organizationId_vehicleNumber: { organizationId: organization.id, vehicleNumber: "PILOT-INV-VEH" } },
    update: { year: 2020, make: "Ford", model: "Escape", color: "Blue", vin: "1FMCU9G60LUA00101", vinRaw: "1FMCU9G60LUA00101", vinState: "LEGACY_UNVERIFIED", status: "ACTIVE", externalReference: "SHOP_RECON_PILOT_INVENTORY", stockNumber: "PILOT-INV-001", stockNumberNormalized: "PILOT-INV-001" },
    create: { id: "pilot-shop-inventory-vehicle", organizationId: organization.id, vehicleNumber: "PILOT-INV-VEH", year: 2020, make: "Ford", model: "Escape", color: "Blue", vin: "1FMCU9G60LUA00101", vinRaw: "1FMCU9G60LUA00101", vinState: "LEGACY_UNVERIFIED", status: "ACTIVE", externalReference: "SHOP_RECON_PILOT_INVENTORY", stockNumber: "PILOT-INV-001", stockNumberNormalized: "PILOT-INV-001", canonicalOrigins: { pilot: SHOP_RECON_PILOT_CONTRACT_VERSION } },
  });

  const inventoryUnit = await prisma.inventoryUnit.upsert({
    where: { organizationId_inventoryNumber: { organizationId: organization.id, inventoryNumber: "PILOT-INV-001" } },
    update: {},
    create: { id: "pilot-shop-inventory-unit", organizationId: organization.id, vehicleId: inventoryVehicle.id, inventoryNumber: "PILOT-INV-001", lifecycleStage: "RECONDITIONING", operatingState: "ACTIVE", financialAcquiredAt: now, stageStartedAt: now, ownerUserId: brock.id, locationId: location.id, targetAt: plusHours(now, 72), nextAction: "Complete the governed Shop & Recon pilot before frontline readiness.", version: 1 },
  });

  const records = [
    { scenario: SHOP_RECON_PILOT_SCENARIOS[0], id: "pilot-shop-customer-order", visitId: "pilot-shop-customer-visit", vehicleId: customerVehicle.id, customerId: customer.id, inventoryUnitId: null, intakeSource: "WALK_IN" as const, ownerUserId: brock.id, concern: "Operational pilot: verify intermittent brake vibration and complete the governed customer repair path.", promisedAt: plusHours(now, 28), transportMode: "DROP_OFF" as const, targetAt: plusHours(now, 24) },
    { scenario: SHOP_RECON_PILOT_SCENARIOS[1], id: "pilot-shop-inventory-order", visitId: "pilot-shop-inventory-visit", vehicleId: inventoryVehicle.id, customerId: null, inventoryUnitId: inventoryUnit.id, intakeSource: "INVENTORY_RECON" as const, ownerUserId: brock.id, concern: "Operational pilot: inspect steering pull and prepare the inventory vehicle for frontline readiness.", promisedAt: null, transportMode: "INTERNAL_TRANSPORT" as const, targetAt: plusHours(now, 48) },
  ];

  for (const record of records) {
    let order = await prisma.repairOrder.findUnique({ where: { organizationId_repairOrderNumber: { organizationId: organization.id, repairOrderNumber: record.scenario.repairOrderNumber } }, select: { id: true, shopReconLifecycle: { select: { stage: true, operatingState: true } } } });
    if (!order) {
      const visit = await prisma.serviceVisit.upsert({ where: { id: record.visitId }, update: {}, create: { id: record.visitId, organizationId: organization.id, locationId: location.id, vehicleId: record.vehicleId, customerId: record.customerId, inventoryUnitId: record.inventoryUnitId, origin: record.scenario.workLane, intakeSource: record.intakeSource, arrivedAt: now, concernSummary: record.concern, promisedAt: record.promisedAt, promiseNotes: "Shop & Recon operational pilot commitment.", consentStatus: record.customerId ? "DOCUMENTED" : "NOT_REQUIRED", consentReference: record.customerId ? "PILOT-CONSENT-001" : null, consentedAt: record.customerId ? now : null, keysReceivedCount: 1, keyTag: record.scenario.repairOrderNumber, transportMode: record.transportMode, intakeNotes: `${SHOP_RECON_PILOT_CONTRACT_VERSION}; controlled training record.`, sourceSnapshot: { pilotScenarioId: record.scenario.id, pilotContractVersion: SHOP_RECON_PILOT_CONTRACT_VERSION }, createdByUserId: eli.id } });
      order = await prisma.repairOrder.create({ data: { id: record.id, organizationId: organization.id, locationId: location.id, serviceVisitId: visit.id, repairOrderNumber: record.scenario.repairOrderNumber, vehicleId: record.vehicleId, customerId: record.customerId, inventoryUnitId: record.inventoryUnitId, origin: record.scenario.workLane, intakeSource: record.intakeSource, stage: "INTAKE", operatingState: "ACTIVE", openedAt: now, stageStartedAt: now, ownerUserId: record.ownerUserId, targetAt: record.targetAt, nextAction: "Begin the controlled pilot at Shop Entry.", version: 1, externalSystemCode: "SHOP_RECON_PILOT", externalReference: record.scenario.id }, select: { id: true, shopReconLifecycle: { select: { stage: true, operatingState: true } } } });
    }
    if (!order.shopReconLifecycle) {
      await prisma.shopReconLifecycle.create({ data: { organizationId: organization.id, locationId: location.id, repairOrderId: order.id, stage: "SERVICE_RECON_JOB_INTAKE", operatingState: "ACTIVE", stageStartedAt: now, ownerUserId: record.ownerUserId, zoneCode: "PRE_ARRIVAL_COORDINATION", targetAt: plusHours(now, 1), nextAction: "Complete the Service / Recon job intake and establish the accountable intake owner.", blockerCodes: [], version: 0, scopeVersion: 1 } });
    }
    console.log(`${record.scenario.repairOrderNumber}: ${order.shopReconLifecycle?.stage ?? "SERVICE_RECON_JOB_INTAKE"} (${order.shopReconLifecycle?.operatingState ?? "ACTIVE"})`);
  }

  console.log(`Shop & Recon pilots ready at ${location.name} for ${brock.name}, Eli backup, and Walter Hernandez. Re-running preserves lifecycle progress.`);
}

main().catch(error => { console.error("Shop & Recon pilot seed failed.", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
