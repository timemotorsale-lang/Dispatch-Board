import { randomUUID } from "node:crypto";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const downstreamSelect = {
  advisorUpdates: true,
  authorizations: true,
  deliveryReadinessEvaluations: true,
  diagnosisVersions: true,
  diagnosticCases: true,
  estimateVersions: true,
  inspectionVersions: true,
  invoicePackages: true,
  partDemands: true,
  qualityInspections: true,
  repairJobs: true,
  vendorWorks: true
} as const;

async function main() {
  const groups = await prisma.repairOrder.groupBy({
    by: ["organizationId", "vehicleId"],
    where: { closedAt: null },
    _count: { _all: true }
  });

  const duplicates = groups.filter((group) => group._count._all > 1);
  const result: Array<Record<string, unknown>> = [];

  for (const group of duplicates) {
    const orders = await prisma.repairOrder.findMany({
      where: { organizationId: group.organizationId, vehicleId: group.vehicleId, closedAt: null },
      orderBy: [{ openedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        locationId: true,
        openedAt: true,
        organizationId: true,
        ownerUserId: true,
        repairOrderNumber: true,
        stage: true,
        version: true,
        _count: { select: downstreamSelect }
      }
    });

    const workCount = (order: (typeof orders)[number]) => Object.values(order._count).reduce((sum, count) => sum + count, 0);
    const ranked = [...orders].sort((left, right) => workCount(right) - workCount(left) || left.openedAt.getTime() - right.openedAt.getTime() || left.id.localeCompare(right.id));
    const canonical = ranked[0];
    const extras = ranked.slice(1);

    for (const extra of extras) {
      const downstream = workCount(extra);
      if (downstream > 0) {
        result.push({ action: "MANUAL_REVIEW", canonical: canonical.repairOrderNumber, duplicate: extra.repairOrderNumber, downstream });
        continue;
      }

      result.push({ action: apply ? "CONSOLIDATED" : "WOULD_CONSOLIDATE", canonical: canonical.repairOrderNumber, duplicate: extra.repairOrderNumber, downstream });
      if (!apply) continue;

      const occurredAt = new Date();
      const correlationId = randomUUID();
      const nextVersion = extra.version + 1;
      const reason = `Duplicate open vehicle card consolidated into ${canonical.repairOrderNumber}. The closed record remains available for audit history.`;

      await prisma.$transaction(async (tx) => {
        const current = await tx.repairOrder.findFirstOrThrow({ where: { id: extra.id, closedAt: null } });
        await tx.repairOrder.update({
          where: { id: extra.id },
          data: {
            closedAt: occurredAt,
            nextAction: `Continue all work on ${canonical.repairOrderNumber}`,
            operatingState: "CLOSED",
            stage: "CANCELLED",
            stageStartedAt: occurredAt,
            stateReason: reason,
            version: nextVersion
          }
        });
        await tx.repairOrderStateEvent.create({
          data: {
            actorUserId: extra.ownerUserId,
            correlationId,
            fromOperatingState: current.operatingState,
            fromStage: current.stage,
            locationId: extra.locationId,
            nextAction: `Continue all work on ${canonical.repairOrderNumber}`,
            occurredAt,
            organizationId: extra.organizationId,
            ownerUserId: extra.ownerUserId,
            reason,
            repairOrderId: extra.id,
            targetAt: current.targetAt,
            toOperatingState: "CLOSED",
            toStage: "CANCELLED",
            version: nextVersion
          }
        });
        await tx.enterpriseAggregateVersion.updateMany({
          where: { organizationId: extra.organizationId, domain: "SHOP_OPERATIONS", subjectType: "REPAIR_ORDER", subjectId: extra.id },
          data: { version: nextVersion }
        });
        await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: extra.ownerUserId,
            correlationId,
            domain: "SHOP_OPERATIONS",
            eventType: "DUPLICATE_REPAIR_ORDER_CONSOLIDATED",
            locationId: extra.locationId,
            metadata: { canonicalRepairOrderId: canonical.id, canonicalRepairOrderNumber: canonical.repairOrderNumber },
            newValue: { closedAt: occurredAt.toISOString(), stage: "CANCELLED" },
            organizationId: extra.organizationId,
            priorValue: JSON.parse(JSON.stringify(current)) as Prisma.InputJsonValue,
            reason,
            subjectId: extra.id,
            subjectType: "REPAIR_ORDER"
          }
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  }

  console.log(JSON.stringify({ apply, duplicateVehicleGroups: duplicates.length, result }, null, 2));
}

main().finally(() => prisma.$disconnect());
