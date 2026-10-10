import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { comparePricing } from "./pricing-domain";
import { summarizeRecordedCosts } from "./cost-domain";
import { nextJourneyStep, vehicleJourneySteps } from "./journey-domain";
import { evaluatePricingAccess } from "./pricing-access";

export async function getVehicleJourney(actor: AuthenticatedUser | null, vehicleId: string, input: { database?: PrismaClient; organizationId?: string; foundationRepository?: EnterpriseCommandRepository; now?: () => Date } = {}) {
  const user = assertAuthenticatedUser(actor), database = input.database ?? prisma;
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id, now = (input.now ?? (() => new Date()))();
  const grants = await (input.foundationRepository ?? createEnterpriseCommandRepository(database)).listCapabilityGrants(user.id, organizationId);
  return database.$transaction(async tx => {
    const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, organizationId, status: "ACTIVE", mergedIntoVehicleId: null }, select: { id: true, vehicleNumber: true, vin: true, stockNumber: true, year: true, make: true, model: true } });
    if (!vehicle) return null;
    const unit = await tx.inventoryUnit.findFirst({ where: { organizationId, vehicleId, closedAt: null }, select: { id: true, inventoryNumber: true, version: true, lifecycleStage: true, operatingState: true, nextAction: true, stateReason: true, targetAt: true, locationId: true, ownerUser: { select: { name: true } }, location: { select: { name: true } } } });
    const custody = !unit ? await tx.vehicleCustodyEvent.findFirst({ where: { organizationId, vehicleId, occurredAt: { lte: now } }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], select: { locationId: true } }) : null;
    const allowed = (capability: VehicleCapability) => evaluateVehicleCapability({ actor: user, capability, grants, locationId: unit?.locationId ?? custody?.locationId ?? null, now }).allowed;
    const access = { inventory: allowed("INVENTORY_UNIT_VIEW"), costs: allowed("INVENTORY_UNIT_MANAGE"), pricing: evaluatePricingAccess({ actor: user, grants, locationId: unit?.locationId ?? custody?.locationId ?? null, now }).allowed, repair: allowed("REPAIR_ORDER_VIEW"), evidence: allowed("VEHICLE_EVIDENCE_VIEW") };
    if (!access.inventory && !access.pricing) throw new Error("Vehicle capability required: inventory journey.");
    const costEntries = unit && (access.costs || access.pricing) ? await tx.inventoryUnitCost.findMany({ where: { organizationId, inventoryUnitId: unit.id }, select: { id: true, category: true, status: true, currency: true, amountCents: true } }) : [];
    const proposal = unit && access.pricing ? await tx.inventoryPricingProposal.findFirst({ where: { organizationId, inventoryUnitId: unit.id }, orderBy: { inventoryVersion: "desc" }, select: { inventoryVersion: true, priceCents: true, packCents: true, includeEstimates: true, marginMode: true, threshold: true } }) : null;
    const receipt = unit && access.inventory ? await tx.inventoryReceipt.findFirst({ where: { organizationId, inventoryUnitId: unit.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { status: true } }) : null;
    const frontline = unit && access.inventory ? await tx.inventoryFrontlineWorkflow.findFirst({ where: { organizationId, inventoryUnitId: unit.id }, select: { stage: true, operatingState: true, nextAction: true } }) : null;
    const comparison = proposal ? comparePricing(costEntries, proposal) : null;
    const pricing = !proposal ? "missing" : proposal.inventoryVersion !== unit?.version ? "stale" : comparison?.meetsThreshold === false ? "below" : "saved";
    const blocked = unit?.operatingState === "BLOCKED" || frontline?.operatingState === "BLOCKED";
    const steps = vehicleJourneySteps({ vehicleId, unitId: unit?.id ?? null, blocked, hasPurchase: costEntries.some(cost => cost.category === "ACQUISITION" && cost.status === "INCURRED" && cost.currency === "USD"), costCount: costEntries.filter(cost => !["VOID", "REVERSED"].includes(cost.status)).length, receiptStatus: receipt?.status ?? null, pricing, access });
    const latestIntake = access.inventory ? await tx.inventoryIntakeRevision.findFirst({ where: { organizationId, vehicleId }, orderBy: { version: "desc" }, select: { status: true, pendingItems: true, inventoryUnitId: true, details: true } }) : null;
    const intakeRevision = latestIntake && (latestIntake.inventoryUnitId === null || latestIntake.inventoryUnitId === unit?.id) ? latestIntake : null;
    const intakeDetails = intakeRevision?.details && typeof intakeRevision.details === "object" && !Array.isArray(intakeRevision.details) ? intakeRevision.details : {};
    const intakeText = (key: string) => typeof intakeDetails[key] === "string" ? intakeDetails[key] as string : "";
    const intake = access.inventory ? { status: intakeRevision?.status ?? "NOT_STARTED", pendingItems: Array.isArray(intakeRevision?.pendingItems) ? intakeRevision.pendingItems.filter((item): item is string => typeof item === "string") : [], handoff: intakeRevision?.status === "CONFIRMED" ? { whereabouts: intakeText("whereabouts"), condition: intakeText("condition"), documents: intakeText("documents"), pendingNotes: intakeText("pendingNotes"), keys: typeof intakeDetails.keys === "number" ? intakeDetails.keys : null, odometer: typeof intakeDetails.odometer === "number" ? intakeDetails.odometer : null, odometerUnit: intakeText("odometerUnit") } : null } : null;
    if (access.costs) steps.splice(1, 0, { id: "intake", label: "Acquisition & Intake", status: intake?.status === "CONFIRMED" ? "Confirmed" : intake?.status === "DRAFT" ? "Draft" : "Not started", detail: intake?.pendingItems.length ? `Pending: ${intake.pendingItems.join(", ")}` : "Capture purchase, arrival and handoff details", href: `/vehicles/${encodeURIComponent(vehicleId)}/intake` });
    const next = !blocked && access.costs && intake?.status !== "CONFIRMED" ? steps.find(step => step.id === "intake") ?? null : nextJourneyStep(steps, access.inventory && blocked);
    const visibleUnit = unit && !access.inventory ? { ...unit, lifecycleStage: "Restricted", operatingState: "Restricted", nextAction: "Ask the inventory owner to review operational work", stateReason: null, targetAt: null, ownerUser: { name: "Restricted" }, location: { name: "Restricted" }, locationId: "" } : unit;
    return { vehicle, unit: visibleUnit, access, steps, next, intake, blocked: access.inventory && blocked, frontline, asOf: now.toISOString(), costs: unit && (access.costs || access.pricing) ? summarizeRecordedCosts(costEntries) : null, proposal: proposal ? { priceCents: proposal.priceCents, comparison, stale: pricing === "stale" } : null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export type VehicleJourneyModel = NonNullable<Awaited<ReturnType<typeof getVehicleJourney>>>;
