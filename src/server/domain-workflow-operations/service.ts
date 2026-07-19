import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { buildDomainWorkflowQueue, buildWholesaleRecommendationCalibration, type DomainWorkflowSource, type WholesaleOutcome } from "./domain";

type Snapshot = { sources: DomainWorkflowSource[]; outcomes: WholesaleOutcome[] };
type Repository = { snapshot(organizationId: string, now: Date): Promise<Snapshot> };
type Dependencies = { foundationRepository?: ReturnType<typeof createEnterpriseCommandRepository>; now?: () => Date; organizationId?: string; repository?: Repository };

function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown) { return Array.isArray(value) ? value as Array<Record<string, unknown>> : []; }
function vehicleLabel(vehicle: { vehicleNumber: string; year: number | null; make: string | null; model: string | null }) { return [vehicle.vehicleNumber, vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" · "); }

function createRepository(): Repository { return {
  async snapshot(organizationId, now) {
    const [acquisitions, frontline, retail, shop, purchaseOrders, discrepancies, dispositions] = await Promise.all([
      prisma.inventoryAcquisitionCase.findMany({ where: { organizationId, status: { notIn: ["DECLINED", "REJECTED", "EXPIRED", "CANCELLED", "HANDOFF_READY"] }, expiresAt: { lte: new Date(now.getTime() + 86_400_000) } }, select: { id: true, status: true, expiresAt: true, ownerUser: { select: { name: true } }, location: { select: { name: true } }, vehicle: { select: { vehicleNumber: true, year: true, make: true, model: true } } }, take: 100 }),
      prisma.inventoryFrontlineWorkflow.findMany({ where: { organizationId, OR: [{ operatingState: { in: ["BLOCKED", "SUSPENDED"] } }, { targetAt: { lte: now }, operatingState: { in: ["ACTIVE", "WAITING"] } }] }, select: { id: true, stage: true, operatingState: true, targetAt: true, nextAction: true, ownerUser: { select: { name: true } }, location: { select: { name: true } }, inventoryUnit: { select: { inventoryNumber: true } } }, take: 100 }),
      prisma.inventoryRetailCompletion.findMany({ where: { organizationId, OR: [{ stage: { in: ["RECONCILIATION_HOLD", "DELIVERY_HOLD"] } }, { targetAt: { lte: now }, operatingState: { in: ["ACTIVE", "WAITING", "BLOCKED"] } }] }, select: { id: true, stage: true, operatingState: true, targetAt: true, nextAction: true, reservationSnapshot: true, ownerUser: { select: { name: true } }, location: { select: { name: true } }, inventoryUnit: { select: { inventoryNumber: true } } }, take: 100 }),
      prisma.repairOrder.findMany({ where: { organizationId, closedAt: null, OR: [{ operatingState: "BLOCKED" }, { targetAt: { lte: now } }] }, select: { id: true, repairOrderNumber: true, stage: true, operatingState: true, targetAt: true, nextAction: true, stateReason: true, ownerUser: { select: { name: true } }, location: { select: { name: true } } }, take: 100 }),
      prisma.partPurchaseOrder.findMany({ where: { organizationId, OR: [{ status: "ISSUED", acknowledgedAt: null }, { status: "PARTIALLY_RECEIVED" }] }, select: { id: true, purchaseOrderNumber: true, status: true, updatedAt: true, createdByUser: { select: { name: true } }, location: { select: { name: true } }, vendor: { select: { name: true } } }, take: 100 }),
      prisma.partReceivingDiscrepancy.findMany({
        where: { organizationId, status: "OPEN" },
        select: {
          id: true,
          type: true,
          createdAt: true,
          receipt: {
            select: {
              purchaseOrder: {
                select: {
                  purchaseOrderNumber: true,
                  createdByUser: { select: { name: true } },
                  location: { select: { name: true } },
                },
              },
            },
          },
        },
        take: 100,
      }),
      prisma.inventoryDispositionCase.findMany({ where: { organizationId, OR: [{ operatingState: "BLOCKED" }, { targetAt: { lte: now }, operatingState: { in: ["ACTIVE", "WAITING"] } }, { operatingState: "CLOSED" }] }, select: { id: true, stage: true, operatingState: true, targetAt: true, nextAction: true, stateReason: true, proposalVersions: true, settlementSnapshot: true, ownerUser: { select: { name: true } }, location: { select: { name: true } }, inventoryUnit: { select: { inventoryNumber: true } } }, take: 200 }),
    ]);
    const sources: DomainWorkflowSource[] = [
      ...acquisitions.map(item => ({ domain: "ACQUISITION" as const, dueAt: item.expiresAt, href: `/vehicles/acquisition-appraisal?caseId=${item.id}`, id: item.id, label: vehicleLabel(item.vehicle), location: item.location.name, nextAction: item.expiresAt <= now ? "Record expiration or resolve the governed acquisition decision" : "Complete the governed decision before expiration", operatingState: item.expiresAt <= now ? "EXPIRED" : "WAITING", owner: item.ownerUser.name, reason: item.expiresAt <= now ? "Acquisition decision window has elapsed" : null, stage: item.status })),
      ...frontline.map(item => ({ domain: "FRONTLINE" as const, dueAt: item.targetAt, href: `/vehicles/inventory-to-frontline?workflowId=${item.id}`, id: item.id, label: item.inventoryUnit.inventoryNumber, location: item.location.name, nextAction: item.nextAction, operatingState: item.operatingState, owner: item.ownerUser.name, reason: ["BLOCKED", "SUSPENDED"].includes(item.operatingState) ? `${item.operatingState.toLowerCase()} workflow requires review` : null, stage: item.stage })),
      ...retail.map(item => { const reservation = object(item.reservationSnapshot), expiresAt = typeof reservation.expiresAt === "string" ? new Date(reservation.expiresAt) : item.targetAt; return { domain: "RETAIL" as const, dueAt: item.stage === "RESERVED_DEAL_PENDING" ? expiresAt : item.targetAt, href: `/vehicles/retail-completion?completionId=${item.id}`, id: item.id, label: item.inventoryUnit.inventoryNumber, location: item.location.name, nextAction: item.stage === "RESERVED_DEAL_PENDING" && expiresAt <= now ? "Expire or release the reservation through the retail command" : item.nextAction, operatingState: item.stage === "RECONCILIATION_HOLD" ? "RECONCILIATION_HOLD" : item.operatingState, owner: item.ownerUser.name, reason: item.stage.includes("HOLD") ? "Retail completion is held for governed resolution" : null, stage: item.stage }; }),
      ...shop.map(item => ({ domain: "SHOP_RECON" as const, dueAt: item.targetAt, href: `/vehicles/repair-orders?repairOrderId=${item.id}`, id: item.id, label: item.repairOrderNumber, location: item.location.name, nextAction: item.nextAction, operatingState: item.operatingState, owner: item.ownerUser.name, reason: item.stateReason, stage: item.stage })),
      ...purchaseOrders.map(item => ({ domain: "PARTS" as const, dueAt: new Date(item.updatedAt.getTime() + 86_400_000), href: `/vehicles/service-close-parts?purchaseOrderId=${item.id}`, id: item.id, label: `${item.purchaseOrderNumber} · ${item.vendor.name}`, location: item.location.name, nextAction: item.status === "ISSUED" ? "Record vendor acknowledgement or a governed exception" : "Complete receipt or resolve remaining quantity", operatingState: item.status === "ISSUED" ? "WAITING" : "BLOCKED", owner: item.createdByUser.name, reason: item.status === "ISSUED" ? "Vendor acknowledgement remains unrecorded" : "Purchase order is only partially received", stage: item.status })),
      ...discrepancies.map(item => ({ domain: "PARTS" as const, dueAt: item.createdAt, href: `/vehicles/service-close-parts?discrepancyId=${item.id}`, id: item.id, label: item.receipt.purchaseOrder.purchaseOrderNumber, location: item.receipt.purchaseOrder.location.name, nextAction: "Resolve the receiving discrepancy with attributable evidence", operatingState: "BLOCKED", owner: item.receipt.purchaseOrder.createdByUser.name, reason: `${item.type.replaceAll("_", " ")} receiving discrepancy`, stage: "RECEIVING_DISCREPANCY" })),
      ...dispositions.filter(item => item.operatingState !== "CLOSED").map(item => ({ domain: "WHOLESALE" as const, dueAt: item.targetAt, href: `/vehicles/disposition-wholesale?caseId=${item.id}`, id: item.id, label: item.inventoryUnit.inventoryNumber, location: item.location.name, nextAction: item.nextAction, operatingState: item.operatingState, owner: item.ownerUser.name, reason: item.stateReason, stage: item.stage })),
    ];
    const outcomes = dispositions.filter(item => item.operatingState === "CLOSED").flatMap(item => { const proposals = array(item.proposalVersions), proposal = proposals.at(-1), settlement = object(item.settlementSnapshot), expectedNetCents = Number(proposal?.expectedNetCents), actualNetCents = Number(settlement.actualProceedsCents) - Number(settlement.feesCents) + Number(settlement.creditsCents); return Number.isFinite(expectedNetCents) && Number.isFinite(actualNetCents) ? [{ actualNetCents, caseId: item.id, expectedNetCents, toleranceCents: Number(settlement.toleranceCents ?? 0) }] : []; });
    return { outcomes, sources };
  },
}; }

export async function getDomainWorkflowOperations(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor), organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id, now = (input.now ?? (() => new Date()))(), foundation = input.foundationRepository ?? createEnterpriseCommandRepository();
  const grants = await foundation.listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, capability: "INVENTORY_UNIT_VIEW", grants, locationId: null, now });
  const snapshot = await (input.repository ?? createRepository()).snapshot(organizationId, now), items = buildDomainWorkflowQueue(snapshot.sources, now);
  return { contractVersion: "domain-workflow-operations/wave-3.0.0", generatedAt: now.toISOString(), capability: { execution: "AUTHORITATIVE_WORKSPACES_ONLY", notifications: "OUTBOX_EVENTS_ONLY_NO_DELIVERY_PROVIDER", scheduling: "DETECTION_ONLY_NO_BACKGROUND_EXECUTION" }, totals: { critical: items.filter(item => item.priority === "CRITICAL").length, high: items.filter(item => item.priority === "HIGH").length, open: items.length, overdue: items.filter(item => item.overdue).length }, items, wholesaleCalibration: buildWholesaleRecommendationCalibration(snapshot.outcomes) };
}
