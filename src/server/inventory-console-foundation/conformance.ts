import { evaluateDisasterRecoveryGate, type RecoveryEvidence } from "@/server/inventory/enterprise-hardening-gates";

export type FoundationSlice = "IC-010" | "IC-011" | "IC-012" | "IC-013" | "IC-014" | "IC-015" | "IC-016" | "IC-017";

export type FoundationCheck = {
  blockers: string[];
  checks: Record<string, boolean>;
  disposition: "READY" | "BLOCKED";
  slice: FoundationSlice;
};

function result(slice: FoundationSlice, checks: Record<string, boolean>): FoundationCheck {
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([code]) => `${slice}_${code.toUpperCase()}`);
  return { blockers, checks, disposition: blockers.length ? "BLOCKED" : "READY", slice };
}

function unique(values: string[]) {
  return new Set(values).size === values.length;
}

export type CanonicalBoundaryEvidence = {
  externalIdentities: Array<{ externalId: string; system: string; vehicleId: string }>;
  inventoryUnits: Array<{ cycle: number; financialAcquiredAt: string; id: string; open: boolean; organizationId: string; vehicleId: string }>;
  odometers: Array<{ correction: boolean; observedAt: string; reading: number; vehicleId: string }>;
  parts: { custodyReconciled: boolean; minimumBalance: number; quantityReconciled: boolean };
  repairOrders: Array<{ id: string; inventoryUnitId: string | null; origin: "CUSTOMER_REPAIR" | "INVENTORY_RECON" }>;
  vehicles: Array<{ id: string; normalizedVin: string | null; organizationId: string }>;
};

/** IC-010: verify the canonical Vehicle/InventoryUnit and linked-domain invariants. */
export function verifyCanonicalBoundaries(input: CanonicalBoundaryEvidence): FoundationCheck {
  const openKeys = input.inventoryUnits.filter((unit) => unit.open).map((unit) => `${unit.organizationId}:${unit.vehicleId}`);
  const cycleKeys = input.inventoryUnits.map((unit) => `${unit.organizationId}:${unit.vehicleId}:${unit.cycle}`);
  const vins = input.vehicles.filter((vehicle) => vehicle.normalizedVin).map((vehicle) => `${vehicle.organizationId}:${vehicle.normalizedVin}`);
  const externalKeys = input.externalIdentities.map((identity) => `${identity.system}:${identity.externalId}`);
  const odometersValid = [...new Set(input.odometers.map((entry) => entry.vehicleId))].every((vehicleId) => {
    const entries = input.odometers.filter((entry) => entry.vehicleId === vehicleId).sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
    return entries.every((entry, index) => index === 0 || entry.reading >= entries[index - 1].reading || entry.correction);
  });

  return result("IC-010", {
    canonicalVehicleIds: unique(input.vehicles.map((vehicle) => vehicle.id)),
    canonicalVins: unique(vins),
    externalIdentityOwnership: unique(externalKeys) && input.externalIdentities.every((identity) => input.vehicles.some((vehicle) => vehicle.id === identity.vehicleId)),
    financialAcquisitionEvidence: input.inventoryUnits.every((unit) => !Number.isNaN(Date.parse(unit.financialAcquiredAt))),
    inventoryCyclesUnique: unique(cycleKeys),
    oneOpenInventoryCycle: unique(openKeys),
    odometerCorrectionsExplicit: odometersValid,
    repairOriginsSeparated: input.repairOrders.every((order) => order.origin === "INVENTORY_RECON" ? Boolean(order.inventoryUnitId) : order.inventoryUnitId === null),
    partsCustodyReconciled: input.parts.custodyReconciled,
    partsQuantityReconciled: input.parts.quantityReconciled && input.parts.minimumBalance >= 0,
  });
}

export type AuthorityEvidence = {
  actorLocationIds: string[];
  amountCents: number;
  approverUserId: string;
  cumulativeRelatedAmountCents: number;
  delegatedLimitCents: number;
  delegationExpiresAt: string;
  explicitDeny: boolean;
  fieldPermitted: boolean;
  locationId: string;
  now: string;
  requesterUserId: string;
  rolePermitted: boolean;
};

/** IC-011: fail closed across scope, delegation, amount, field, and four-eyes controls. */
export function verifyAuthority(input: AuthorityEvidence): FoundationCheck {
  return result("IC-011", {
    antiSplitting: input.cumulativeRelatedAmountCents <= input.delegatedLimitCents,
    amountAuthority: input.amountCents <= input.delegatedLimitCents,
    delegationActive: Date.parse(input.delegationExpiresAt) > Date.parse(input.now),
    explicitDenyWins: !input.explicitDeny,
    fieldAuthority: input.fieldPermitted,
    fourEyes: input.requesterUserId !== input.approverUserId,
    locationAuthority: input.actorLocationIds.includes(input.locationId),
    roleAuthority: input.rolePermitted,
  });
}

export type CommandEvidence = {
  attempts: Array<{ idempotencyKey: string; rejected?: boolean; requestHash: string; resultFingerprint: string }>;
  commands: Array<{
    aggregateType: "APPROVAL" | "INVENTORY_UNIT" | "PARTS_LEDGER" | "REPAIR_ORDER";
    auditCorrelationId: string;
    eventCorrelationId: string;
    expectedVersion: number;
    idempotencyKey: string;
    outboxCorrelationId: string;
    requestHash: string;
    resultVersion: number;
  }>;
};

/** IC-012: verify idempotency, concurrency, atomic evidence, and the four-domain exit fixture. */
export function verifyCommandContract(input: CommandEvidence): FoundationCheck {
  const replayGroups = new Map<string, Array<{ rejected?: boolean; requestHash: string; resultFingerprint: string }>>();
  for (const attempt of input.attempts) replayGroups.set(attempt.idempotencyKey, [...(replayGroups.get(attempt.idempotencyKey) ?? []), attempt]);
  const replaySafe = [...replayGroups.values()].every((attempts) => {
    const accepted = attempts.filter((attempt) => !attempt.rejected);
    return new Set(accepted.map((attempt) => attempt.requestHash)).size <= 1 && new Set(accepted.map((attempt) => attempt.resultFingerprint)).size <= 1;
  });
  const conflictingReuseRejected = [...replayGroups.values()].every((attempts) => {
    const acceptedHash = attempts.find((attempt) => !attempt.rejected)?.requestHash;
    return attempts.every((attempt) => !acceptedHash || attempt.requestHash === acceptedHash || attempt.rejected);
  });
  const aggregateTypes = new Set(input.commands.map((command) => command.aggregateType));

  return result("IC-012", {
    atomicCorrelation: input.commands.every((command) => command.auditCorrelationId === command.eventCorrelationId && command.eventCorrelationId === command.outboxCorrelationId),
    conflictingReuseRejected,
    exitDomainsCovered: ["INVENTORY_UNIT", "REPAIR_ORDER", "PARTS_LEDGER", "APPROVAL"].every((type) => aggregateTypes.has(type as CommandEvidence["commands"][number]["aggregateType"])),
    expectedVersionAdvanced: input.commands.every((command) => command.resultVersion === command.expectedVersion + 1),
    idempotencyKeysUniquePerCommand: unique(input.commands.map((command) => command.idempotencyKey)),
    identicalReplayStable: replaySafe,
    requestHashesPresent: input.commands.every((command) => /^[a-f0-9]{64}$/.test(command.requestHash)),
  });
}

export type WorkGovernanceEvidence = {
  items: Array<{
    active: boolean;
    action: string;
    approverUserId?: string;
    dueAt?: string;
    evidenceVersion?: number;
    id: string;
    materialRevision?: boolean;
    ownerUserId?: string;
    policyVersion?: number;
    proposalVersion?: number;
    reason?: string;
    reopenedFromId?: string;
    requesterUserId?: string;
    status: string;
    subjectId: string;
    type: "APPROVAL" | "BLOCKER" | "REVIEW" | "TASK";
  }>;
};

/** IC-013: verify work deduplication, ownership, expiry inputs, four-eyes, and reopen lineage. */
export function verifyWorkGovernance(input: WorkGovernanceEvidence): FoundationCheck {
  const activeKeys = input.items.filter((item) => item.active).map((item) => `${item.type}:${item.subjectId}:${item.action}:${item.reason ?? ""}`);
  const ids = new Set(input.items.map((item) => item.id));
  return result("IC-013", {
    activeWorkDeduplicated: unique(activeKeys),
    approvalsExactVersion: input.items.filter((item) => item.type === "APPROVAL").every((item) => Boolean(item.proposalVersion && item.evidenceVersion && item.policyVersion)),
    blockersActionable: input.items.filter((item) => item.type === "BLOCKER").every((item) => Boolean(item.reason && item.ownerUserId && item.dueAt && !Number.isNaN(Date.parse(item.dueAt)))),
    materialRevisionInvalidates: input.items.filter((item) => item.type === "APPROVAL" && item.materialRevision).every((item) => item.status === "INVALIDATED"),
    ownersAndDueDates: input.items.filter((item) => item.active).every((item) => Boolean(item.ownerUserId && item.dueAt)),
    reopenLineage: input.items.filter((item) => item.reopenedFromId).every((item) => ids.has(item.reopenedFromId!)),
    separationOfDuties: input.items.filter((item) => item.type === "APPROVAL" && item.approverUserId).every((item) => item.requesterUserId !== item.approverUserId),
  });
}

export type EvidenceLifecycleEvidence = {
  objects: Array<{
    accessClassified: boolean;
    checksumSha256: string;
    correctionOfId?: string;
    id: string;
    legalHold: boolean;
    malwareStatus: "CLEAN" | "PENDING" | "REJECTED";
    retentionUntil: string;
    status: "AVAILABLE" | "DELETED" | "QUARANTINED";
  }>;
};

/** IC-014: verify evidence integrity, upload safety, correction, retention, and legal-hold behavior. */
export function verifyEvidenceLifecycle(input: EvidenceLifecycleEvidence): FoundationCheck {
  const ids = new Set(input.objects.map((object) => object.id));
  return result("IC-014", {
    accessClassified: input.objects.every((object) => object.accessClassified),
    checksumsValid: input.objects.every((object) => /^[a-f0-9]{64}$/.test(object.checksumSha256)),
    correctionLineage: input.objects.filter((object) => object.correctionOfId).every((object) => ids.has(object.correctionOfId!)),
    deletionHonorsLegalHold: input.objects.every((object) => !(object.status === "DELETED" && object.legalHold)),
    malwareFailClosed: input.objects.every((object) => object.status !== "AVAILABLE" || object.malwareStatus === "CLEAN"),
    quarantineHonest: input.objects.every((object) => object.malwareStatus !== "REJECTED" || object.status === "QUARANTINED"),
    retentionDefined: input.objects.every((object) => !Number.isNaN(Date.parse(object.retentionUntil))),
  });
}

export type PolicyRolloutEvidence = {
  policies: Array<{
    approvedAt: string | null;
    effectiveAt: string;
    expiresAt: string | null;
    id: string;
    parentPolicyId?: string;
    previewFingerprint: string;
    rollout: "GENERAL" | "OFF" | "PILOT" | "SHADOW";
    version: number;
  }>;
};

/** IC-015: verify effective policy versions, preview evidence, inheritance, and safe rollout. */
export function verifyPolicyRollout(input: PolicyRolloutEvidence): FoundationCheck {
  const ids = new Set(input.policies.map((policy) => policy.id));
  const versionKeys = input.policies.map((policy) => `${policy.id}:${policy.version}`);
  return result("IC-015", {
    approvalBeforeActivation: input.policies.filter((policy) => policy.rollout !== "OFF").every((policy) => Boolean(policy.approvedAt) && Date.parse(policy.approvedAt!) <= Date.parse(policy.effectiveAt)),
    effectiveWindowsValid: input.policies.every((policy) => !Number.isNaN(Date.parse(policy.effectiveAt)) && (!policy.expiresAt || Date.parse(policy.expiresAt) > Date.parse(policy.effectiveAt))),
    inheritanceReferencesValid: input.policies.filter((policy) => policy.parentPolicyId).every((policy) => ids.has(policy.parentPolicyId!)),
    previewEvidencePresent: input.policies.every((policy) => /^[a-f0-9]{64}$/.test(policy.previewFingerprint)),
    rolloutSafeForDevelopment: input.policies.every((policy) => policy.rollout === "OFF" || policy.rollout === "SHADOW"),
    versionsUnique: unique(versionKeys),
  });
}

export type ProjectionEvidence = {
  checkpoints: Array<{ aggregateId: string; lastSequence: number }>;
  deadLetters: Array<{ exceptionOwned: boolean; id: string }>;
  events: Array<{ aggregateId: string; eventId: string; sequence: number }>;
  projectedFingerprint: string;
  rebuildFingerprint: string;
  reconciliationMismatchCount: number;
};

/** IC-016: verify ordered, replayable, checkpointed projections and owned failures. */
export function verifyEventProjection(input: ProjectionEvidence): FoundationCheck {
  const aggregateIds = new Set(input.events.map((event) => event.aggregateId));
  const ordered = [...aggregateIds].every((aggregateId) => {
    const sequences = input.events.filter((event) => event.aggregateId === aggregateId).map((event) => event.sequence);
    return unique(sequences.map(String)) && sequences.every((sequence, index) => index === 0 || sequence > sequences[index - 1]);
  });
  return result("IC-016", {
    checkpointsBounded: input.checkpoints.every((checkpoint) => checkpoint.lastSequence <= Math.max(0, ...input.events.filter((event) => event.aggregateId === checkpoint.aggregateId).map((event) => event.sequence))),
    deadLettersOwned: input.deadLetters.every((deadLetter) => deadLetter.exceptionOwned),
    eventIdsUnique: unique(input.events.map((event) => event.eventId)),
    eventOrderPreserved: ordered,
    rebuildDeterministic: input.projectedFingerprint === input.rebuildFingerprint,
    reconciliationClean: input.reconciliationMismatchCount === 0,
  });
}

export type RecoveryHarnessEvidence = RecoveryEvidence & {
  lineageReportComplete: boolean;
  migrationDryRunPassed: boolean;
  replayPassed: boolean;
  rollbackPassed: boolean;
  rollForwardPassed: boolean;
};

/** IC-017: verify migration, restore, replay, and both recovery directions. */
export function verifyRecoveryHarness(input: RecoveryHarnessEvidence): FoundationCheck {
  const recovery = evaluateDisasterRecoveryGate(input);
  return result("IC-017", {
    backupRestoreReconciled: recovery.disposition === "READY",
    lineageReportComplete: input.lineageReportComplete,
    migrationDryRunPassed: input.migrationDryRunPassed,
    replayPassed: input.replayPassed,
    rollbackPassed: input.rollbackPassed,
    rollForwardPassed: input.rollForwardPassed,
  });
}

export type R1ConformanceFixture = {
  authority: AuthorityEvidence;
  canonical: CanonicalBoundaryEvidence;
  command: CommandEvidence;
  evidence: EvidenceLifecycleEvidence;
  policy: PolicyRolloutEvidence;
  projection: ProjectionEvidence;
  recovery: RecoveryHarnessEvidence;
  work: WorkGovernanceEvidence;
};

export function runR1FoundationConformance(fixture: R1ConformanceFixture) {
  const slices = [
    verifyCanonicalBoundaries(fixture.canonical),
    verifyAuthority(fixture.authority),
    verifyCommandContract(fixture.command),
    verifyWorkGovernance(fixture.work),
    verifyEvidenceLifecycle(fixture.evidence),
    verifyPolicyRollout(fixture.policy),
    verifyEventProjection(fixture.projection),
    verifyRecoveryHarness(fixture.recovery),
  ];
  const blockers = slices.flatMap((slice) => slice.blockers);
  return { blockers, disposition: blockers.length ? "BLOCKED" as const : "READY" as const, slices };
}
