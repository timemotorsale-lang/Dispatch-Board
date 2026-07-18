import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { calculateInventoryRecommendation } from "./domain";

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }

export function createPartsWaveOneRepository(database: PrismaClient = prisma) {
  return {
    async aggregateVersion(organizationId: string, subjectType: string, subjectId: string) {
      const row = await database.enterpriseAggregateVersion.findUnique({ where: { organizationId_domain_subjectType_subjectId: { domain: "PARTS_OPERATIONS", organizationId, subjectId, subjectType } }, select: { version: true } });
      return row?.version ?? 0;
    },

    async overview(organizationId: string) {
      const [counts, policies, recommendationRuns, recommendations, barcodes, parts, stockLocations, locations, users, discrepancies, purchaseOrders, reservations] = await Promise.all([
        database.partCycleCount.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100, include: { stockLocation: { select: { code: true, name: true, locationId: true } }, assignedToUser: { select: { name: true } }, lines: { orderBy: { part: { partNumber: "asc" } }, include: { part: { select: { partNumber: true, description: true } }, counterUser: { select: { name: true } }, approvedByUser: { select: { name: true } } } }, events: { orderBy: { version: "desc" }, take: 20, include: { actorUser: { select: { name: true } } } } } }),
        database.partInventoryPolicy.findMany({ where: { organizationId }, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }], take: 300, include: { part: { select: { partNumber: true, description: true, standardCostCents: true } }, stockLocation: { select: { code: true, name: true } } } }),
        database.partRecommendationRun.findMany({ where: { organizationId }, orderBy: { generatedAt: "desc" }, take: 30 }),
        database.partInventoryRecommendation.findMany({ where: { organizationId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500, include: { part: { select: { partNumber: true, description: true } }, stockLocation: { select: { code: true, name: true, locationId: true } } } }),
        database.partBarcodeAlias.findMany({ where: { organizationId, isActive: true }, orderBy: { createdAt: "desc" }, take: 500, include: { part: { select: { partNumber: true, description: true } } } }),
        database.part.findMany({ where: { organizationId, status: "ACTIVE" }, orderBy: { partNumber: "asc" }, take: 500, include: { balances: { include: { stockLocation: { select: { code: true, name: true, locationId: true } } } } } }),
        database.partStockLocation.findMany({ where: { organizationId, isActive: true }, orderBy: { code: "asc" }, include: { location: { select: { id: true, name: true } } } }),
        database.location.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        database.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        database.partReceivingDiscrepancy.findMany({ where: { organizationId, status: "OPEN" }, orderBy: { createdAt: "asc" }, take: 100, include: { receipt: { include: { purchaseOrder: { select: { purchaseOrderNumber: true } } } } } }),
        database.partPurchaseOrder.findMany({ where: { organizationId, status: { in: ["ACKNOWLEDGED", "PARTIALLY_RECEIVED", "RECEIVED"] } }, orderBy: { createdAt: "desc" }, take: 100, include: { vendor: { select: { name: true } } } }),
        database.partReservation.findMany({ where: { organizationId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, take: 200, include: { part: { select: { partNumber: true, description: true } }, stockLocation: { select: { code: true, name: true } }, demand: { include: { repairOrder: { select: { repairOrderNumber: true } } } } } }),
      ]);
      return { barcodes, counts, discrepancies, locations, parts, policies, purchaseOrders, recommendationRuns, recommendations, reservations, stockLocations, users };
    },

    createCycleCount(command: EnterpriseCommandCommitInput, data: { assignedToUserId: string | null; blindCount: boolean; countNumber: string; createdByUserId: string; ledgerCutoffAt: Date; mode: "OBSERVE" | "FREEZE"; partIds: string[]; reason: string; snapshotAt: Date; stockLocationId: string; type: "FULL" | "CYCLE" | "SPOT" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const stockLocation = await tx.partStockLocation.findFirst({ where: { id: data.stockLocationId, organizationId: command.organizationId, isActive: true } });
        if (!stockLocation) throw new Error("Active stock location was not found.");
        const existingActive = await tx.partCycleCount.findFirst({ where: { organizationId: command.organizationId, stockLocationId: data.stockLocationId, status: { in: ["COUNTING", "REVIEW_REQUIRED", "APPROVED"] } } });
        if (existingActive) throw new Error(`Stock location already has active count ${existingActive.countNumber}.`);
        const parts = await tx.part.findMany({ where: { id: { in: data.partIds }, organizationId: command.organizationId, status: "ACTIVE" }, include: { balances: { where: { stockLocationId: data.stockLocationId } } } });
        if (parts.length !== data.partIds.length) throw new Error("Every count part must be active in this organization.");
        const count = await tx.partCycleCount.create({ data: { assignedToUserId: data.assignedToUserId, blindCount: data.blindCount, countNumber: data.countNumber, createdByUserId: data.createdByUserId, id: command.subjectId, ledgerCutoffAt: data.ledgerCutoffAt, mode: data.mode, organizationId: command.organizationId, reason: data.reason, snapshotAt: data.snapshotAt, stockLocationId: data.stockLocationId, type: data.type, version } });
        await tx.partCycleCountLine.createMany({ data: parts.map((part) => { const balance = part.balances[0]; return { cycleCountId: count.id, evidence: toJson([]), expectedCostCents: balance?.averageCostCents ?? part.standardCostCents, expectedQuantity: balance?.onHandQuantity ?? 0, organizationId: command.organizationId, partId: part.id, snapshotQuantity: balance?.onHandQuantity ?? 0 }; }) });
        await tx.partCycleCountEvent.create({ data: { actorUserId: command.actorUserId, correlationId: command.correlationId, cycleCountId: count.id, occurredAt: data.snapshotAt, organizationId: command.organizationId, reason: data.reason, toStatus: "DRAFT", version } });
        return { result: { countNumber: count.countNumber, id: count.id, lineCount: parts.length, mode: count.mode, status: count.status, version } };
      });
    },

    transitionCycleCount(command: EnterpriseCommandCommitInput, countId: string, data: { actorUserId: string; occurredAt: Date; reason: string; toStatus: "COUNTING" | "CANCELLED" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const count = await tx.partCycleCount.findFirst({ where: { id: countId, organizationId: command.organizationId } });
        if (!count) throw new Error("Cycle count was not found.");
        if (data.toStatus === "COUNTING") {
          const conflicting = await tx.partCycleCount.findFirst({ where: { id: { not: count.id }, organizationId: command.organizationId, stockLocationId: count.stockLocationId, status: { in: ["COUNTING", "REVIEW_REQUIRED", "APPROVED"] } } });
          if (conflicting) throw new Error(`Stock location already has active count ${conflicting.countNumber}.`);
        }
        const allowed = data.toStatus === "COUNTING" ? count.status === "DRAFT" : ["DRAFT", "COUNTING"].includes(count.status);
        if (!allowed) throw new Error(`Cycle count cannot transition from ${count.status} to ${data.toStatus}.`);
        const next = await tx.partCycleCount.update({ where: { id: count.id }, data: { cancelledAt: data.toStatus === "CANCELLED" ? data.occurredAt : null, startedAt: data.toStatus === "COUNTING" ? data.occurredAt : count.startedAt, status: data.toStatus, version } });
        await tx.partCycleCountEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, cycleCountId: count.id, fromStatus: count.status, occurredAt: data.occurredAt, organizationId: command.organizationId, reason: data.reason, toStatus: data.toStatus, version } });
        return { previous: count, result: { id: next.id, status: next.status, version } };
      });
    },

    recordCycleCountLine(command: EnterpriseCommandCommitInput, countId: string, data: { actorUserId: string; countedQuantity: number; evidence: string[]; lineId: string; occurredAt: Date; reason: string; reasonCode: string | null }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const count = await tx.partCycleCount.findFirst({ where: { id: countId, organizationId: command.organizationId, status: "COUNTING" } });
        if (!count) throw new Error("Counting cycle count was not found.");
        const line = await tx.partCycleCountLine.findFirst({ where: { id: data.lineId, cycleCountId: count.id, organizationId: command.organizationId } });
        if (!line) throw new Error("Cycle count line was not found.");
        if (count.assignedToUserId && count.assignedToUserId !== data.actorUserId) throw new Error("Cycle count line is assigned to another counter.");
        if (data.occurredAt < count.snapshotAt || data.occurredAt.getTime() > Date.now() + 300000) throw new Error("Count observation time must follow the snapshot and cannot be in the future.");
        const movements = count.mode === "OBSERVE" ? await tx.partStockLedgerEntry.findMany({ where: { organizationId: command.organizationId, partId: line.partId, stockLocationId: count.stockLocationId, occurredAt: { gt: count.ledgerCutoffAt, lte: data.occurredAt } }, select: { quantityDelta: true } }) : [];
        const movementDelta = movements.reduce((sum, item) => sum + item.quantityDelta, 0), expectedQuantity = line.snapshotQuantity + movementDelta, varianceQuantity = data.countedQuantity - expectedQuantity, varianceValueCents = varianceQuantity * line.expectedCostCents;
        const next = await tx.partCycleCountLine.update({ where: { id: line.id }, data: { approvalRequired: varianceQuantity !== 0, countedAt: data.occurredAt, countedQuantity: data.countedQuantity, counterUserId: data.actorUserId, evidence: toJson(data.evidence), expectedQuantity, reasonCode: data.reasonCode, varianceQuantity, varianceValueCents } });
        await tx.partCycleCount.update({ where: { id: count.id }, data: { version } });
        await tx.partCycleCountEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, cycleCountId: count.id, fromStatus: "COUNTING", occurredAt: data.occurredAt, organizationId: command.organizationId, reason: data.reason, toStatus: "COUNTING", version } });
        return { previous: line, result: { approvalRequired: next.approvalRequired, countedQuantity: next.countedQuantity, expectedQuantity, id: next.id, varianceQuantity, varianceValueCents, version } };
      });
    },

    submitCycleCount(command: EnterpriseCommandCommitInput, countId: string, data: { actorUserId: string; occurredAt: Date; reason: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const count = await tx.partCycleCount.findFirst({ where: { id: countId, organizationId: command.organizationId, status: "COUNTING" }, include: { lines: true } });
        if (!count) throw new Error("Counting cycle count was not found.");
        if (count.lines.some((line) => line.countedQuantity == null)) throw new Error("Every cycle-count line must be counted before submission.");
        const varianceCount = count.lines.filter((line) => line.varianceQuantity !== 0).length, status = varianceCount ? "REVIEW_REQUIRED" : "APPROVED";
        const next = await tx.partCycleCount.update({ where: { id: count.id }, data: { reviewedAt: status === "APPROVED" ? data.occurredAt : null, status, submittedAt: data.occurredAt, version } });
        await tx.partCycleCountEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, cycleCountId: count.id, fromStatus: "COUNTING", occurredAt: data.occurredAt, organizationId: command.organizationId, reason: data.reason, toStatus: status, version } });
        return { previous: count, result: { id: next.id, status: next.status, varianceCount, version } };
      });
    },

    approveCycleCount(command: EnterpriseCommandCommitInput, countId: string, data: { actorUserId: string; occurredAt: Date; reason: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const count = await tx.partCycleCount.findFirst({ where: { id: countId, organizationId: command.organizationId, status: "REVIEW_REQUIRED" }, include: { lines: { where: { approvalRequired: true } } } });
        if (!count) throw new Error("Review-required cycle count was not found.");
        if (count.lines.some((line) => line.counterUserId === data.actorUserId)) throw new Error("Variance approver must be different from the counter.");
        await tx.partCycleCountLine.updateMany({ where: { cycleCountId: count.id, approvalRequired: true }, data: { approvedAt: data.occurredAt, approvedByUserId: data.actorUserId } });
        const next = await tx.partCycleCount.update({ where: { id: count.id }, data: { reviewedAt: data.occurredAt, status: "APPROVED", version } });
        await tx.partCycleCountEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, cycleCountId: count.id, fromStatus: "REVIEW_REQUIRED", occurredAt: data.occurredAt, organizationId: command.organizationId, reason: data.reason, toStatus: "APPROVED", version } });
        return { previous: count, result: { id: next.id, status: next.status, version } };
      });
    },

    postCycleCount(command: EnterpriseCommandCommitInput, countId: string, data: { actorUserId: string; occurredAt: Date; reason: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const count = await tx.partCycleCount.findFirst({ where: { id: countId, organizationId: command.organizationId, status: "APPROVED" }, include: { lines: true } });
        if (!count) throw new Error("Approved cycle count was not found.");
        for (const line of count.lines.filter((item) => item.varianceQuantity !== 0)) {
          if (line.approvalRequired && !line.approvedByUserId) throw new Error("Every count variance requires independent approval before posting.");
          const balance = await tx.partStockBalance.findUnique({ where: { partId_stockLocationId: { partId: line.partId, stockLocationId: count.stockLocationId } } }), variance = line.varianceQuantity ?? 0, onHand = (balance?.onHandQuantity ?? 0) + variance, allocated = balance?.allocatedQuantity ?? 0, damaged = balance?.damagedQuantity ?? 0, available = onHand - allocated - damaged;
          if (onHand < 0 || available < 0) throw new Error("Count adjustment would conflict with allocated or damaged stock. Resolve custody before posting.");
          await tx.partStockBalance.upsert({ where: { partId_stockLocationId: { partId: line.partId, stockLocationId: count.stockLocationId } }, create: { allocatedQuantity: 0, availableQuantity: onHand, averageCostCents: line.expectedCostCents, onHandQuantity: onHand, organizationId: command.organizationId, partId: line.partId, stockLocationId: count.stockLocationId, version: 1 }, update: { availableQuantity: available, onHandQuantity: onHand, version: { increment: 1 } } });
          const entry = await tx.partStockLedgerEntry.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, movementType: "ADJUST", occurredAt: data.occurredAt, organizationId: command.organizationId, partId: line.partId, quantityDelta: variance, reason: data.reason, sourceId: line.id, sourceType: "CYCLE_COUNT_ADJUSTMENT", stockLocationId: count.stockLocationId, unitCostCents: line.expectedCostCents } });
          await tx.partCycleCountLine.update({ where: { id: line.id }, data: { postedLedgerEntryId: entry.id } });
        }
        const next = await tx.partCycleCount.update({ where: { id: count.id }, data: { postedAt: data.occurredAt, status: "POSTED", version } });
        await tx.partCycleCountEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, cycleCountId: count.id, fromStatus: "APPROVED", occurredAt: data.occurredAt, organizationId: command.organizationId, reason: data.reason, toStatus: "POSTED", version } });
        return { previous: count, result: { adjustmentCount: count.lines.filter((line) => line.varianceQuantity !== 0).length, id: next.id, status: next.status, version } };
      });
    },

    createInventoryPolicy(command: EnterpriseCommandCommitInput, data: { abcClass: string; annualHoldingRateBasisPoints: number; createdByUserId: string; economicOrderQuantity: number | null; effectiveFrom: Date; effectiveTo: Date | null; leadTimeDays: number; maxStockQuantity: number | null; obsolescenceDays: number; orderingCostCents: number; partId: string; reason: string; reorderPointQuantity: number | null; reviewPeriodDays: number; safetyStockQuantity: number; stockLocationId: string; targetServiceBasisPoints: number }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const [part, stockLocation] = await Promise.all([tx.part.findFirst({ where: { id: data.partId, organizationId: command.organizationId, status: "ACTIVE" } }), tx.partStockLocation.findFirst({ where: { id: data.stockLocationId, organizationId: command.organizationId, isActive: true } })]);
        if (!part || !stockLocation) throw new Error("Active part and stock location are required for inventory policy.");
        const latest = await tx.partInventoryPolicy.findFirst({ where: { partId: part.id, stockLocationId: stockLocation.id }, orderBy: { version: "desc" } });
        if (latest && data.effectiveFrom <= latest.effectiveFrom) throw new Error("New inventory policy versions must start after the latest version.");
        if (latest?.isActive) await tx.partInventoryPolicy.update({ where: { id: latest.id }, data: { effectiveTo: data.effectiveFrom, isActive: false } });
        const record = await tx.partInventoryPolicy.create({ data: { abcClass: data.abcClass, annualHoldingRateBasisPoints: data.annualHoldingRateBasisPoints, createdByUserId: data.createdByUserId, economicOrderQuantity: data.economicOrderQuantity, effectiveFrom: data.effectiveFrom, effectiveTo: data.effectiveTo, id: command.subjectId, leadTimeDays: data.leadTimeDays, maxStockQuantity: data.maxStockQuantity, obsolescenceDays: data.obsolescenceDays, orderingCostCents: data.orderingCostCents, organizationId: command.organizationId, partId: data.partId, reason: data.reason, reorderPointQuantity: data.reorderPointQuantity, reviewPeriodDays: data.reviewPeriodDays, safetyStockQuantity: data.safetyStockQuantity, stockLocationId: data.stockLocationId, targetServiceBasisPoints: data.targetServiceBasisPoints, version: (latest?.version ?? 0) + 1 } });
        return { previous: latest, result: { id: record.id, partId: record.partId, stockLocationId: record.stockLocationId, version: record.version } };
      });
    },

    generateRecommendations(command: EnterpriseCommandCommitInput, data: { generatedAt: Date; generatedByUserId: string; locationId: string | null; reason: string; windowEnd: Date; windowStart: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const policies = await tx.partInventoryPolicy.findMany({ where: { organizationId: command.organizationId, isActive: true, effectiveFrom: { lte: data.generatedAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: data.generatedAt } }], ...(data.locationId ? { stockLocation: { locationId: data.locationId } } : {}) }, include: { part: true, stockLocation: true } });
        if (!policies.length) throw new Error("No active inventory policies are available for this recommendation run.");
        const balances = await tx.partStockBalance.findMany({ where: { organizationId: command.organizationId, partId: { in: [...new Set(policies.map((item) => item.partId))] } } });
        const partIds = [...new Set(policies.map((item) => item.partId))], ledger = await tx.partStockLedgerEntry.findMany({ where: { organizationId: command.organizationId, movementType: "ISSUE", occurredAt: { gte: data.windowStart, lte: data.windowEnd }, partId: { in: partIds } }, orderBy: { occurredAt: "asc" } }), lastIssues = await tx.partStockLedgerEntry.groupBy({ by: ["partId", "stockLocationId"], where: { organizationId: command.organizationId, movementType: "ISSUE", occurredAt: { lte: data.windowEnd }, partId: { in: partIds } }, _max: { occurredAt: true } }), lastInbound = await tx.partStockLedgerEntry.groupBy({ by: ["partId", "stockLocationId"], where: { organizationId: command.organizationId, movementType: { in: ["RECEIPT", "RETURN", "TRANSFER_IN"] }, occurredAt: { lte: data.windowEnd }, partId: { in: partIds } }, _max: { occurredAt: true } });
        const sourceFingerprint = hashEnterpriseCommand({ balances: balances.map((item) => [item.id, item.version]), lastInbound: lastInbound.map((item) => [item.partId, item.stockLocationId, item._max.occurredAt]), lastIssues: lastIssues.map((item) => [item.partId, item.stockLocationId, item._max.occurredAt]), ledger: ledger.map((item) => item.id), policies: policies.map((item) => item.id), windowEnd: data.windowEnd, windowStart: data.windowStart });
        const duplicate = await tx.partRecommendationRun.findUnique({ where: { organizationId_sourceFingerprint: { organizationId: command.organizationId, sourceFingerprint } } });
        if (duplicate) return { result: { duplicateProjection: true, id: duplicate.id, sourceFingerprint } };
        const run = await tx.partRecommendationRun.create({ data: { generatedAt: data.generatedAt, generatedByUserId: data.generatedByUserId, id: command.subjectId, locationId: data.locationId, organizationId: command.organizationId, policySnapshot: toJson(policies.map((item) => ({ id: item.id, partId: item.partId, stockLocationId: item.stockLocationId, version: item.version }))), reason: data.reason, sourceFingerprint, windowEnd: data.windowEnd, windowStart: data.windowStart } });
        const dayCount = Math.max(1, Math.ceil((data.windowEnd.getTime() - data.windowStart.getTime()) / 86400000));
        for (const policy of policies) {
          const balance = balances.find((item) => item.partId === policy.partId && item.stockLocationId === policy.stockLocationId), issues = ledger.filter((item) => item.partId === policy.partId && item.stockLocationId === policy.stockLocationId), byDay = new Map<string, number>();
          for (const issue of issues) byDay.set(dateKey(issue.occurredAt), (byDay.get(dateKey(issue.occurredAt)) ?? 0) + Math.abs(issue.quantityDelta));
          const dailyDemand = Array.from({ length: dayCount }, (_, index) => byDay.get(dateKey(new Date(data.windowStart.getTime() + index * 86400000))) ?? 0), lastIssueAt = lastIssues.find((item) => item.partId === policy.partId && item.stockLocationId === policy.stockLocationId)?._max.occurredAt ?? null;
          const fallbackActivityAt = lastInbound.find((item) => item.partId === policy.partId && item.stockLocationId === policy.stockLocationId)?._max.occurredAt ?? policy.part.createdAt;
          let result = calculateInventoryRecommendation({ annualHoldingRateBasisPoints: policy.annualHoldingRateBasisPoints, availableQuantity: balance?.availableQuantity ?? 0, dailyDemand, economicOrderQuantity: policy.economicOrderQuantity, fallbackActivityAt, lastIssueAt, leadTimeDays: policy.leadTimeDays, maxStockQuantity: policy.maxStockQuantity, now: data.generatedAt, obsolescenceDays: policy.obsolescenceDays, onHandQuantity: balance?.onHandQuantity ?? 0, orderedQuantity: balance?.orderedQuantity ?? 0, orderingCostCents: policy.orderingCostCents, reorderPointQuantity: policy.reorderPointQuantity, safetyStockQuantity: policy.safetyStockQuantity, standardCostCents: policy.part.standardCostCents });
          if (result.type === "REORDER") {
            const source = balances.filter((item) => item.partId === policy.partId && item.stockLocationId !== policy.stockLocationId).sort((a, b) => b.availableQuantity - a.availableQuantity)[0], sourcePolicy = source ? policies.find((item) => item.partId === policy.partId && item.stockLocationId === source.stockLocationId) : null, surplus = source ? Math.max(0, source.availableQuantity - (sourcePolicy?.reorderPointQuantity ?? sourcePolicy?.safetyStockQuantity ?? 0)) : 0;
            if (source && surplus > 0) result = { ...result, estimatedCostCents: 0, reasonCodes: ["PART_TRANSFER_SOURCE_SURPLUS_AVAILABLE"], recommendedQuantity: Math.min(result.recommendedQuantity, surplus), type: "TRANSFER_REVIEW", evidence: { ...result.evidence, sourceStockLocationId: source.stockLocationId, sourceSurplusQuantity: surplus } };
          }
          await tx.partInventoryRecommendation.create({ data: { allocatedQuantity: balance?.allocatedQuantity ?? 0, availableQuantity: balance?.availableQuantity ?? 0, averageDailyDemandMilli: result.averageDailyDemandMilli, confidence: result.confidence, daysSinceLastIssue: result.daysSinceLastIssue, demandStdDevMilli: result.demandStdDevMilli, economicOrderQuantity: result.economicOrderQuantity, estimatedCostCents: result.estimatedCostCents, evidence: toJson(result.evidence), onHandQuantity: balance?.onHandQuantity ?? 0, orderedQuantity: balance?.orderedQuantity ?? 0, organizationId: command.organizationId, partId: policy.partId, reasonCodes: toJson(result.reasonCodes), recommendedQuantity: result.recommendedQuantity, reorderPointQuantity: result.reorderPointQuantity, runId: run.id, safetyStockQuantity: policy.safetyStockQuantity, stockLocationId: policy.stockLocationId, type: result.type } });
        }
        return { result: { id: run.id, recommendationCount: policies.length, sourceFingerprint } };
      });
    },

    decideRecommendation(command: EnterpriseCommandCommitInput, recommendationId: string, data: { actorUserId: string; occurredAt: Date; reason: string; status: "ACKNOWLEDGED" | "DISMISSED" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const record = await tx.partInventoryRecommendation.findFirst({ where: { id: recommendationId, organizationId: command.organizationId, status: "OPEN" } });
        if (!record) throw new Error("Open inventory recommendation was not found.");
        const next = await tx.partInventoryRecommendation.update({ where: { id: record.id }, data: { decidedAt: data.occurredAt, decidedByUserId: data.actorUserId, decisionReason: data.reason, status: data.status, version } });
        return { previous: record, result: { id: next.id, status: next.status, version } };
      });
    },

    createBarcodeAlias(command: EnterpriseCommandCommitInput, data: { code: string; createdByUserId: string; partId: string; reason: string; sourceReference: string | null; type: "GTIN" | "UPC" | "OEM" | "INTERNAL" | "VENDOR" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const part = await tx.part.findFirst({ where: { id: data.partId, organizationId: command.organizationId, status: "ACTIVE" } });
        if (!part) throw new Error("Active canonical part was not found.");
        const record = await tx.partBarcodeAlias.create({ data: { code: data.code, createdByUserId: data.createdByUserId, id: command.subjectId, organizationId: command.organizationId, partId: data.partId, reason: data.reason, sourceReference: data.sourceReference, type: data.type } });
        return { result: { code: record.code, id: record.id, partId: record.partId, type: record.type } };
      });
    },
  };
}

export type PartsWaveOneRepository = ReturnType<typeof createPartsWaveOneRepository>;
