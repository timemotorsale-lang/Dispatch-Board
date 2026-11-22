import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { currentRepairWorkflowStep } from "@/lib/repair-workflow-review";
import { repairLaborGuideHref, repairResumeLabel, type RepairResume, type VehicleWorkActions } from "@/lib/repair-resume";
import { createRepairOrderRepository } from "./repository";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";

const organizationId = INITIAL_ORGANIZATION.id;
const orderSelect = {
  id: true, vehicleId: true, locationId: true, stage: true, repairOrderNumber: true,
  operatingState: true, stateReason: true, ownerUser: { select: { name: true } },
  releaseAuthorization: { select: { id: true } },
  inspectionVersions: { take: 1, select: { id: true } },
  diagnosisVersions: { take: 1, select: { id: true } },
  estimateVersions: {
    take: 1, orderBy: { version: "desc" },
    select: { authorizations: { take: 1, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { disposition: true } } },
  },
  repairJobs: {
    select: {
      status: true, partsRequired: true, executionBlockerReason: true,
      partDemands: { select: { partId: true, status: true, quantityRequired: true, quantityReserved: true } },
      partCustodyEvents: { select: { partId: true, type: true, quantity: true } },
    },
  },
  vendorWorks: { orderBy: { updatedAt: "desc" }, select: { status: true, approvalStatus: true } },
} satisfies Prisma.RepairOrderSelect;

async function readWorkActions(actor: AuthenticatedUser, filter: { vehicleIds: string[] } | { repairOrderId: string }) {
  const foundation = createEnterpriseCommandRepository();
  const now = new Date();
  const [grants, locations, flags] = await Promise.all([
    foundation.listCapabilityGrants(actor.id, organizationId),
    prisma.location.findMany({ where: { organizationId }, select: { id: true } }),
    foundation.listFeatureFlags(organizationId),
  ]);
  const can = (capability: Parameters<typeof evaluateVehicleCapability>[0]["capability"], locationId: string) =>
    evaluateVehicleCapability({ actor, capability, locationId, grants, now }).allowed;
  const readableLocations = locations.filter(({ id }) => can("REPAIR_ORDER_VIEW", id)).map(({ id }) => id);
  const vehicleIds = "vehicleIds" in filter ? filter.vehicleIds : [];
  const [orders, vehicles] = await Promise.all([
    prisma.repairOrder.findMany({
      where: {
        organizationId, closedAt: null, stage: { not: "CLOSED" },
        locationId: { in: readableLocations },
        ...("repairOrderId" in filter ? { id: filter.repairOrderId } : { vehicleId: { in: vehicleIds } }),
      },
      orderBy: [{ openedAt: "desc" }, { id: "desc" }],
      select: orderSelect,
    }),
    vehicleIds.length ? prisma.vehicle.findMany({
      where: { organizationId, id: { in: vehicleIds }, mergedIntoVehicleId: null },
      select: {
        id: true, status: true,
        inventoryIntakeRevisions: {
          where: { organizationId }, orderBy: { version: "desc" },
          take: 1, select: { status: true, inventoryUnitId: true },
        },
        inventoryUnits: {
          where: {
            organizationId, closedAt: null, operatingState: { not: "CLOSED" },
            lifecycleStage: { notIn: ["SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] },
          },
          orderBy: { financialAcquiredAt: "desc" },
          take: 1, select: { id: true, locationId: true },
        },
        registryRelationships: {
          where: {
            organizationId, effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
            relationshipType: { in: ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT", "SOLD_TO_CUSTOMER", "CUSTOMER_OWNER", "SERVICE_ONLY"] },
          },
          orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
          take: 1, select: { relationshipType: true },
        },
      },
    }) : [],
  ]);

  const projected = orders.map(order => ({
    order, stage: currentRepairWorkflowStep(order),
    vendor: order.vendorWorks.some(work => !["COMPLETED", "CANCELLED"].includes(work.status)),
    canAct: can("REPAIR_ORDER_MANAGE", order.locationId)
      && evaluateVehicleOperationsFeature(flags, "SHOP_OPERATIONS", actor.id, order.locationId).executable,
  }));
  const estimateOrders = projected.filter(row => row.canAct && !row.vendor && (row.stage === "estimate" || "repairOrderId" in filter)).map(row => row.order.id);
  const saved = estimateOrders.length ? await prisma.diagnosticWorkspaceDraft.findMany({
    where: {
      userId: actor.id,
      OR: estimateOrders.map(id => ({ content: { path: ["ro", "id"], equals: id } })),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: { id: true, content: true },
  }) : [];
  const draftFor = new Map<string, string>();
  for (const draft of saved) {
    const content = draft.content;
    if (!content || typeof content !== "object" || Array.isArray(content) || "archivedAt" in content) continue;
    const ro = content.ro;
    if (ro && typeof ro === "object" && !Array.isArray(ro) && typeof ro.id === "string" && !draftFor.has(ro.id)) {
      draftFor.set(ro.id, draft.id);
    }
  }

  const byVehicle: Record<string, VehicleWorkActions> = Object.create(null);
  const canCheckIn = locations.some(({ id }) => can("REPAIR_ORDER_MANAGE", id) && can("REPAIR_ORDER_VIEW", id));
  for (const vehicle of vehicles) {
    const unit = vehicle.inventoryUnits[0];
    const controlled = ["DEALERSHIP_OWNED", "TRADE_IN", "CONSIGNMENT"].includes(vehicle.registryRelationships[0]?.relationshipType ?? "");
    const canPrepareSale = Boolean(unit && vehicle.status === "ACTIVE" && controlled && can("INVENTORY_UNIT_VIEW", unit.locationId));
    const intake = vehicle.inventoryIntakeRevisions[0];
    const confirmedIntake = intake?.status === "CONFIRMED" && (!intake.inventoryUnitId || intake.inventoryUnitId === unit?.id);
    byVehicle[vehicle.id] = {
      orders: [],
      canCheckIn,
      canPrepareSale,
      canStartAsIsSale: Boolean(unit && canPrepareSale && confirmedIntake && can("INVENTORY_RELEASE_MANAGE", unit.locationId)),
    };
  }

  const decisions = projected.map(({ order, stage, vendor, canAct }) => {
    const draftId = draftFor.get(order.id);
    const summary: RepairResume = {
      id: order.id, number: order.repairOrderNumber, stage, owner: order.ownerUser.name, canAct,
      action: repairResumeLabel({ stage, vendor, canAct, hasDraft: Boolean(draftId) }),
      blockedReason: order.operatingState !== "ACTIVE" ? order.stateReason ?? undefined : undefined,
    };
    byVehicle[order.vehicleId]?.orders.push(summary);
    return { summary, draftId, vendor, useLaborGuide: canAct && stage === "estimate" && !vendor };
  });
  return { byVehicle, decisions };
}

export async function listVehicleWorkActions(actor: AuthenticatedUser, vehicleIds: string[]) {
  if (!vehicleIds.length) return {};
  return (await readWorkActions(actor, { vehicleIds })).byVehicle;
}

export async function getRepairResume(actor: AuthenticatedUser, repairOrderId: string, withInspectionConsent = false) {
  const decision = (await readWorkActions(actor, { repairOrderId })).decisions[0];
  if (!decision) return null;
  const entry = withInspectionConsent ? await createRepairOrderRepository().getInspectionConsent(organizationId, repairOrderId) : null;
  const result = entry?.resultSnapshot;
  const inspectionConsentReference = result && typeof result === "object" && !Array.isArray(result)
    && typeof result.consentReference === "string" ? result.consentReference : undefined;
  return { ...decision, inspectionConsentReference };
}

export function resumedLaborGuideHref(decision: NonNullable<Awaited<ReturnType<typeof getRepairResume>>>, returnTo: string) {
  return repairLaborGuideHref(decision.summary.id, safeLaborGuideReturnTo(returnTo) ?? "/vehicles/repair-workbench", decision.draftId);
}
