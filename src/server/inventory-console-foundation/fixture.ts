import { createHash } from "node:crypto";

import type { R1ConformanceFixture } from "./conformance";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function createR1ConformanceFixture(): R1ConformanceFixture {
  const now = "2026-07-18T12:00:00.000Z";
  const correlation = "r1-conformance-correlation";
  const commandTypes = ["INVENTORY_UNIT", "REPAIR_ORDER", "PARTS_LEDGER", "APPROVAL"] as const;
  return {
    canonical: {
      vehicles: [{ id: "veh-001", normalizedVin: "1HGCM82633A004352", organizationId: "org-001" }],
      inventoryUnits: [
        { cycle: 1, financialAcquiredAt: "2025-01-01T00:00:00.000Z", id: "unit-old", open: false, organizationId: "org-001", vehicleId: "veh-001" },
        { cycle: 2, financialAcquiredAt: "2026-07-01T00:00:00.000Z", id: "unit-001", open: true, organizationId: "org-001", vehicleId: "veh-001" },
      ],
      repairOrders: [
        { id: "ro-inventory", inventoryUnitId: "unit-001", origin: "INVENTORY_RECON" },
        { id: "ro-customer", inventoryUnitId: null, origin: "CUSTOMER_REPAIR" },
      ],
      externalIdentities: [{ externalId: "DMS-1001", system: "SYNTHETIC_DMS", vehicleId: "veh-001" }],
      odometers: [
        { correction: false, observedAt: "2026-07-01T00:00:00.000Z", reading: 50100, vehicleId: "veh-001" },
        { correction: false, observedAt: "2026-07-18T00:00:00.000Z", reading: 50240, vehicleId: "veh-001" },
      ],
      parts: { custodyReconciled: true, minimumBalance: 2, quantityReconciled: true },
    },
    authority: {
      actorLocationIds: ["loc-001"], amountCents: 120_000, approverUserId: "user-approver", cumulativeRelatedAmountCents: 140_000,
      delegatedLimitCents: 200_000, delegationExpiresAt: "2026-08-01T00:00:00.000Z", explicitDeny: false, fieldPermitted: true,
      locationId: "loc-001", now, requesterUserId: "user-requester", rolePermitted: true,
    },
    command: {
      commands: commandTypes.map((aggregateType, index) => ({
        aggregateType, auditCorrelationId: correlation, eventCorrelationId: correlation, expectedVersion: index + 1,
        idempotencyKey: `r1-${aggregateType.toLowerCase()}`, outboxCorrelationId: correlation, requestHash: hash(aggregateType), resultVersion: index + 2,
      })),
      attempts: [
        { idempotencyKey: "r1-retry", requestHash: hash("retry"), resultFingerprint: hash("result") },
        { idempotencyKey: "r1-retry", requestHash: hash("retry"), resultFingerprint: hash("result") },
        { idempotencyKey: "r1-retry", rejected: true, requestHash: hash("conflict"), resultFingerprint: "" },
      ],
    },
    work: {
      items: [
        { active: true, action: "INSPECT", dueAt: "2026-07-19T12:00:00.000Z", id: "task-001", ownerUserId: "user-inspector", status: "OPEN", subjectId: "unit-001", type: "TASK" },
        { active: true, action: "RESOLVE_IDENTITY", dueAt: "2026-07-18T16:00:00.000Z", id: "blocker-001", ownerUserId: "user-manager", reason: "VIN evidence mismatch", status: "OPEN", subjectId: "unit-001", type: "BLOCKER" },
        { active: true, action: "REVIEW_RECON", dueAt: "2026-07-19T10:00:00.000Z", id: "review-001", ownerUserId: "user-reviewer", status: "OPEN", subjectId: "ro-inventory", type: "REVIEW" },
        { active: true, action: "APPROVE_RECON", approverUserId: "user-approver", dueAt: "2026-07-19T10:00:00.000Z", evidenceVersion: 2, id: "approval-001", materialRevision: false, ownerUserId: "user-approver", policyVersion: 1, proposalVersion: 3, requesterUserId: "user-requester", status: "PENDING", subjectId: "ro-inventory", type: "APPROVAL" },
      ],
    },
    evidence: {
      objects: [
        { accessClassified: true, checksumSha256: hash("inspection-image"), id: "evidence-001", legalHold: false, malwareStatus: "CLEAN", retentionUntil: "2033-07-18T00:00:00.000Z", status: "AVAILABLE" },
        { accessClassified: true, checksumSha256: hash("rejected-upload"), id: "evidence-002", legalHold: false, malwareStatus: "REJECTED", retentionUntil: "2033-07-18T00:00:00.000Z", status: "QUARANTINED" },
        { accessClassified: true, checksumSha256: hash("corrected-image"), correctionOfId: "evidence-001", id: "evidence-003", legalHold: true, malwareStatus: "CLEAN", retentionUntil: "2033-07-18T00:00:00.000Z", status: "AVAILABLE" },
      ],
    },
    policy: {
      policies: [
        { approvedAt: null, effectiveAt: now, expiresAt: null, id: "policy-parent", previewFingerprint: hash("policy-parent"), rollout: "OFF", version: 1 },
        { approvedAt: "2026-07-17T12:00:00.000Z", effectiveAt: now, expiresAt: "2026-12-31T23:59:59.000Z", id: "policy-child", parentPolicyId: "policy-parent", previewFingerprint: hash("policy-child"), rollout: "SHADOW", version: 1 },
      ],
    },
    projection: {
      events: commandTypes.map((aggregateType, index) => ({ aggregateId: aggregateType.toLowerCase(), eventId: `event-${index + 1}`, sequence: 1 })),
      checkpoints: commandTypes.map((aggregateType) => ({ aggregateId: aggregateType.toLowerCase(), lastSequence: 1 })),
      deadLetters: [{ exceptionOwned: true, id: "dead-letter-synthetic" }], projectedFingerprint: hash("projection"), rebuildFingerprint: hash("projection"), reconciliationMismatchCount: 0,
    },
    recovery: {
      approvedRpoMinutes: 15, approvedRtoMinutes: 30, backupCompletedAt: "2026-07-18T10:00:00.000Z", restoreCompletedAt: "2026-07-18T10:12:00.000Z",
      lineageReportComplete: true, migrationDryRunPassed: true, observedRpoMinutes: 2, observedRtoMinutes: 12, replayPassed: true,
      restoredTotals: { approvals: 1, auditEvents: 4, commands: 4, inventoryUnits: 2, partsLedgerEntries: 1, repairOrders: 2, vehicles: 1 },
      rollbackPassed: true, rollForwardPassed: true,
      sourceTotals: { approvals: 1, auditEvents: 4, commands: 4, inventoryUnits: 2, partsLedgerEntries: 1, repairOrders: 2, vehicles: 1 },
    },
  };
}
