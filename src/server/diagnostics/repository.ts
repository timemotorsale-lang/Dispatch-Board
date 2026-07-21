import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { DiagnosticCaseDuplicateError, isTerminalDiagnosticStatus, nextDiagnosticCaseState, type DiagnosticCaseStatus, type DiagnosticRiskTier } from "./domain";
import type { normalizeDiagnosticEvidenceLink, normalizeDiagnosticMeasurement, normalizeDiagnosticObservation } from "./evidence-domain";
import type { normalizeDiagnosticTestDefinition, normalizeDiagnosticTestLifecycle, normalizeDiagnosticTestPlan } from "./test-execution-domain";
import { nextTestExecutionState, type DiagnosticTestLifecycleAction, type DiagnosticTestExecutionState } from "./test-execution-domain";

type Tx = Prisma.TransactionClient;

export type DiagnosticCaseIdentityRecord = {
  assignedUserId: string | null;
  id: string;
  locationId: string;
  resumeStatus: DiagnosticCaseStatus | null;
  status: DiagnosticCaseStatus;
  version: number;
};

export type DiagnosticRepairOrderContext = {
  closedAt: Date | null;
  id: string;
  locationId: string;
  organizationId: string;
  repairOrderNumber: string;
  serviceVisit: { concernSummary: string };
  vehicleId: string;
  version: number;
};

const detailInclude = {
  assignedUser: { select: { id: true, name: true } },
  concernVersions: { orderBy: { version: "desc" as const } },
  createdByUser: { select: { id: true, name: true } },
  location: { select: { id: true, code: true, name: true } },
  repairOrder: { select: { id: true, repairOrderNumber: true, serviceVisit: { select: { concernSummary: true } } } },
  observations: { orderBy: { observedAt: "desc" as const }, include: { authorUser: { select: { id: true, name: true } }, correctedBy: { select: { id: true } } } },
  measurements: { orderBy: { measuredAt: "desc" as const }, include: { authorUser: { select: { id: true, name: true } }, supersededBy: { select: { id: true } } } },
  evidenceLinks: { orderBy: { createdAt: "desc" as const }, include: { createdByUser: { select: { id: true, name: true } }, evidenceObject: { select: { id: true, fileName: true, contentType: true, byteSize: true, checksumSha256: true, malwareStatus: true, accessLevel: true, retentionUntil: true, legalHold: true, status: true, version: true, createdAt: true } } } },
  testPlanVersions: { orderBy: { version: "desc" as const }, include: { nodes: { orderBy: { sequence: "asc" as const }, include: { definitionVersion: true } }, authoredByUser: { select: { id: true, name: true } }, supersededBy: { select: { id: true } } } },
  testExecutions: { orderBy: { occurredAt: "desc" as const }, include: { actorUser: { select: { id: true, name: true } }, planNode: { select: { id: true, nodeKey: true, title: true } } } },
  stateEvents: { orderBy: { version: "desc" as const }, take: 100 },
  vehicle: { select: { id: true, vehicleNumber: true, vin: true, year: true, make: true, model: true } }
};

export type DiagnosticCaseDetailRecord = Prisma.DiagnosticCaseGetPayload<{ include: typeof detailInclude }>;
export type DiagnosticAssignableUserRecord = { id: string; name: string };
export type DiagnosticTestDefinitionRecord = Prisma.DiagnosticTestDefinitionVersionGetPayload<{ include: { supersededBy: { select: { id: true } } } }>;

export type DiagnosticCaseRepository = {
  assign(command: EnterpriseCommandCommitInput, data: { assignedUserId: string; occurredAt: Date; reasonCode: string }): Promise<DiagnosticMutationResult>;
  create(command: EnterpriseCommandCommitInput, data: { assignedUserId: string | null; canonicalConcernStatement: string; concernFingerprint: string; concernKey: string; concernSource: string; concernStatement: string; openedAt: Date; operatingConditions: Record<string, unknown>; repairOrderVersion: number; riskTier: DiagnosticRiskTier; reasonCode: string }): Promise<DiagnosticMutationResult>;
  get(organizationId: string, caseId: string): Promise<DiagnosticCaseDetailRecord | null>;
  getIdentity(organizationId: string, caseId: string): Promise<DiagnosticCaseIdentityRecord | null>;
  getRepairOrderContext(organizationId: string, repairOrderId: string): Promise<DiagnosticRepairOrderContext | null>;
  list(organizationId: string): Promise<DiagnosticCaseDetailRecord[]>;
  listAssignableUsers?(): Promise<DiagnosticAssignableUserRecord[]>;
  listEvidenceCandidates?(organizationId: string, vehicleId: string): Promise<Array<{ accessLevel: "INTERNAL" | "RESTRICTED"; byteSize: number; checksumSha256: string; contentType: string; fileName: string; id: string; legalHold: boolean; malwareStatus: "CLEAN" | "DETECTED" | "ERROR"; retentionUntil: Date; status: "AVAILABLE" | "QUARANTINED" | "DELETED"; version: number }>>;
  listTestDefinitions?(organizationId: string): Promise<DiagnosticTestDefinitionRecord[]>;
  getEvidenceContext?(organizationId: string, evidenceObjectId: string): Promise<{ accessLevel: "INTERNAL" | "RESTRICTED"; id: string; malwareStatus: "CLEAN" | "DETECTED" | "ERROR"; status: "AVAILABLE" | "QUARANTINED" | "DELETED"; vehicleIds: string[] } | null>;
  recordObservation?(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizeDiagnosticObservation> & { id: string }): Promise<DiagnosticMutationResult>;
  recordMeasurement?(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizeDiagnosticMeasurement> & { id: string }): Promise<DiagnosticMutationResult>;
  linkEvidence?(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizeDiagnosticEvidenceLink> & { id: string }): Promise<DiagnosticMutationResult>;
  registerTestDefinition?(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizeDiagnosticTestDefinition> & { id: string }): Promise<DiagnosticMutationResult>;
  createTestPlan?(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizeDiagnosticTestPlan> & { id: string; nodeIds: string[] }): Promise<DiagnosticMutationResult>;
  executeTestLifecycle?(command: EnterpriseCommandCommitInput, data: ReturnType<typeof normalizeDiagnosticTestLifecycle> & { eventId: string; executionKey: string }): Promise<DiagnosticMutationResult>;
  transition(command: EnterpriseCommandCommitInput, data: { occurredAt: Date; reasonCode: string; targetStatus: DiagnosticCaseStatus }): Promise<DiagnosticMutationResult>;
};

type DiagnosticMutationResult = { duplicate: boolean; result: unknown; version: number };

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function execute(
  database: PrismaClient,
  input: EnterpriseCommandCommitInput,
  eventType: string,
  reasonCode: string,
  mutate: (tx: Tx, version: number) => Promise<{ previous?: unknown; result: unknown }>
): Promise<DiagnosticMutationResult> {
  return database.$transaction(async (tx) => {
    const existing = await tx.enterpriseCommandLedger.findUnique({
      where: {
        organizationId_domain_commandType_idempotencyKey: {
          organizationId: input.organizationId,
          domain: input.domain,
          commandType: input.commandType,
          idempotencyKey: input.idempotencyKey
        }
      }
    });
    if (existing) {
      if (existing.requestHash !== input.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
      return { duplicate: true, result: existing.resultSnapshot, version: existing.resultingVersion ?? input.expectedVersion };
    }

    const key = {
      organizationId_domain_subjectType_subjectId: {
        organizationId: input.organizationId,
        domain: input.domain,
        subjectType: input.subjectType,
        subjectId: input.subjectId
      }
    };
    const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key });
    const currentVersion = aggregate?.version ?? 0;
    if (currentVersion !== input.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${input.expectedVersion}, but current version is ${currentVersion}.`, "VERSION_CONFLICT");

    const version = currentVersion + 1;
    const mutation = await mutate(tx, version);
    if (aggregate) await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version, locationId: input.locationId } });
    else await tx.enterpriseAggregateVersion.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, version } });

    const snapshot = json(mutation.result);
    const completedAt = new Date();
    const command = await tx.enterpriseCommandLedger.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        actorUserId: input.actorUserId,
        domain: input.domain,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        commandType: input.commandType,
        status: "SUCCEEDED",
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        correlationId: input.correlationId,
        expectedVersion: input.expectedVersion,
        resultingVersion: version,
        resultSnapshot: snapshot,
        completedAt
      }
    });
    const event = await tx.enterpriseDomainEvent.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        commandId: command.id,
        domain: input.domain,
        aggregateType: input.subjectType,
        aggregateId: input.subjectId,
        aggregateVersion: version,
        eventType,
        payload: json({ aggregateId: input.subjectId, aggregateVersion: version, reasonCode })
      }
    });
    await tx.enterpriseAuditEvent.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        actorUserId: input.actorUserId,
        commandId: command.id,
        domain: input.domain,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        eventType,
        reason: input.reason,
        priorValue: mutation.previous == null ? undefined : json(mutation.previous),
        newValue: snapshot,
        metadata: json({ reasonCode, requestHash: input.requestHash }),
        correlationId: input.correlationId
      }
    });
    await tx.enterpriseOutboxMessage.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        domainEventId: event.id,
        topic: "diagnostics.case",
        messageKey: input.subjectId,
        payload: json({ aggregateId: input.subjectId, aggregateVersion: version, correlationId: input.correlationId, eventId: event.id, eventType, reasonCode })
      }
    });
    return { duplicate: false, result: mutation.result, version };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function createDiagnosticCaseRepository(database: PrismaClient = prisma): DiagnosticCaseRepository {
  return {
    getRepairOrderContext(organizationId, repairOrderId) {
      return database.repairOrder.findFirst({
        where: { id: repairOrderId, organizationId },
        select: { closedAt: true, id: true, locationId: true, organizationId: true, repairOrderNumber: true, serviceVisit: { select: { concernSummary: true } }, vehicleId: true, version: true }
      });
    },

    getIdentity(organizationId, caseId) {
      return database.diagnosticCase.findFirst({
        where: { id: caseId, organizationId },
        select: { assignedUserId: true, id: true, locationId: true, resumeStatus: true, status: true, version: true }
      }) as Promise<DiagnosticCaseIdentityRecord | null>;
    },

    get(organizationId, caseId) {
      return database.diagnosticCase.findFirst({ where: { id: caseId, organizationId }, include: detailInclude });
    },

    list(organizationId) {
      return database.diagnosticCase.findMany({
        where: { organizationId },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 200,
        include: detailInclude
      });
    },

    listAssignableUsers() {
      return database.user.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true }
      });
    },

    async getEvidenceContext(organizationId, evidenceObjectId) {
      const evidence = await database.vehicleEvidenceObject.findFirst({
        where: { id: evidenceObjectId, organizationId },
        select: { accessLevel: true, id: true, malwareStatus: true, status: true, links: { select: { vehicleId: true } } }
      });
      return evidence ? { accessLevel: evidence.accessLevel, id: evidence.id, malwareStatus: evidence.malwareStatus, status: evidence.status, vehicleIds: [...new Set(evidence.links.map((item) => item.vehicleId))] } : null;
    },

    listEvidenceCandidates(organizationId, vehicleId) {
      return database.vehicleEvidenceObject.findMany({
        where: { organizationId, links: { some: { organizationId, vehicleId } } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { accessLevel: true, byteSize: true, checksumSha256: true, contentType: true, fileName: true, id: true, legalHold: true, malwareStatus: true, retentionUntil: true, status: true, version: true }
      });
    },

    listTestDefinitions(organizationId) {
      return database.diagnosticTestDefinitionVersion.findMany({ where: { organizationId }, orderBy: [{ definitionKey: "asc" }, { version: "desc" }], include: { supersededBy: { select: { id: true } } } });
    },

    registerTestDefinition(command, data) {
      return execute(database, command, "DiagnosticTestDefinitionVersionRegistered", "TEST_DEFINITION_REGISTERED", async (tx, aggregateVersion) => {
        const duplicateVersion = await tx.diagnosticTestDefinitionVersion.findFirst({ where: { organizationId: command.organizationId, definitionKey: data.definitionKey, version: data.definitionVersion }, select: { id: true } });
        if (duplicateVersion) throw new Error("That diagnostic test-definition version already exists.");
        if (data.supersedesId) {
          const prior = await tx.diagnosticTestDefinitionVersion.findFirst({ where: { id: data.supersedesId, organizationId: command.organizationId }, include: { supersededBy: { select: { id: true } } } });
          if (!prior || prior.definitionKey !== data.definitionKey) throw new Error("Superseded test definition must belong to the same tenant and definition key.");
          if (prior.supersededBy) throw new Error("Diagnostic test definition already has a successor.");
          if (data.definitionVersion !== prior.version + 1) throw new Error("Diagnostic test-definition versions must be sequential.");
        } else if (data.definitionVersion !== 1) throw new Error("The first diagnostic test-definition version must be version 1.");
        const definition = await tx.diagnosticTestDefinitionVersion.create({ data: {
          id: data.id, organizationId: command.organizationId, definitionKey: data.definitionKey, version: data.definitionVersion, name: data.name, purpose: data.purpose,
          ontologyLinks: json(data.ontologyLinks), applicability: json(data.applicability), qualifications: json(data.qualifications), hazards: json(data.hazards), prerequisites: json(data.prerequisites), tools: json(data.tools), vehicleState: json(data.vehicleState), procedure: json(data.procedure), branches: json(data.branches), interpretations: json(data.interpretations), requiredEvidence: json(data.requiredEvidence), sourceVersions: json(data.sourceVersions),
          estimatedMinutes: data.estimatedMinutes, estimatedCostDecimal: data.estimatedCostDecimal, riskTier: data.riskTier, checksum: data.checksum, effectiveAt: data.effectiveAt, expiresAt: data.expiresAt, authoredByUserId: command.actorUserId, supersedesId: data.supersedesId
        }, select: { id: true, definitionKey: true, version: true, checksum: true, effectiveAt: true, expiresAt: true } });
        return { result: { ...definition, aggregateVersion } };
      });
    },

    createTestPlan(command, data) {
      return execute(database, command, data.supersedesId ? "DiagnosticTestPlanRevised" : "DiagnosticTestPlanCreated", data.supersedesId ? "TEST_PLAN_REVISED" : "TEST_PLAN_CREATED", async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId }, include: { vehicle: { select: { make: true, model: true, year: true } } } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        if (isTerminalDiagnosticStatus(diagnosticCase.status as DiagnosticCaseStatus)) throw new Error("Terminal diagnostic cases must be reopened before planning tests.");
        if (!["TRIAGE", "TEST_PLAN_READY"].includes(diagnosticCase.status)) throw new Error("Diagnostic test plans can be created or revised only during triage or plan-ready review.");
        const definitionIds = [...new Set(data.nodes.map((node) => node.definitionVersionId))];
        const definitions = await tx.diagnosticTestDefinitionVersion.findMany({ where: { id: { in: definitionIds }, organizationId: command.organizationId }, include: { supersededBy: { select: { id: true } } } });
        if (definitions.length !== definitionIds.length) throw new Error("Every test-plan node must reference a test definition in this tenant.");
        const now = new Date();
        for (const definition of definitions) {
          if (definition.supersededBy) throw new Error(`Test definition ${definition.definitionKey} has been superseded and cannot enter a new plan.`);
          if (definition.effectiveAt > now || (definition.expiresAt && definition.expiresAt <= now)) throw new Error(`Test definition ${definition.definitionKey} is not currently effective.`);
          if (definition.riskTier === "R4") throw new Error(`Test definition ${definition.definitionKey} is prohibited from executable case plans at risk tier R4.`);
          const applicability = definition.applicability as Record<string, unknown>;
          const allowedRiskTiers = Array.isArray(applicability.allowedRiskTiers) ? applicability.allowedRiskTiers.map(String) : [];
          if (allowedRiskTiers.length && !allowedRiskTiers.includes(diagnosticCase.riskTier)) throw new Error(`Test definition ${definition.definitionKey} is not applicable to case risk tier ${diagnosticCase.riskTier}.`);
          const allowedMakes = Array.isArray(applicability.allowedMakes) ? applicability.allowedMakes.map((value) => String(value).toUpperCase()) : [];
          const allowedModels = Array.isArray(applicability.allowedModels) ? applicability.allowedModels.map((value) => String(value).toUpperCase()) : [];
          const vehicleMake = diagnosticCase.vehicle.make?.toUpperCase() ?? null;
          const vehicleModel = diagnosticCase.vehicle.model?.toUpperCase() ?? null;
          const vehicleYear = diagnosticCase.vehicle.year;
          if (allowedMakes.length && (!vehicleMake || !allowedMakes.includes(vehicleMake))) throw new Error(`Test definition ${definition.definitionKey} is not applicable to vehicle make ${diagnosticCase.vehicle.make ?? "UNKNOWN"}.`);
          if (allowedModels.length && (!vehicleModel || !allowedModels.includes(vehicleModel))) throw new Error(`Test definition ${definition.definitionKey} is not applicable to vehicle model ${diagnosticCase.vehicle.model ?? "UNKNOWN"}.`);
          if (typeof applicability.minimumYear === "number" && (vehicleYear == null || vehicleYear < applicability.minimumYear)) throw new Error(`Test definition ${definition.definitionKey} is not applicable to vehicle year ${vehicleYear ?? "UNKNOWN"}.`);
          if (typeof applicability.maximumYear === "number" && (vehicleYear == null || vehicleYear > applicability.maximumYear)) throw new Error(`Test definition ${definition.definitionKey} is not applicable to vehicle year ${vehicleYear ?? "UNKNOWN"}.`);
        }
        let planVersion = 1;
        if (data.supersedesId) {
          const prior = await tx.diagnosticTestPlanVersion.findFirst({ where: { id: data.supersedesId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, include: { supersededBy: { select: { id: true } } } });
          if (!prior) throw new Error("Superseded diagnostic test plan was not found in this case.");
          if (prior.supersededBy) throw new Error("Diagnostic test plan already has a successor.");
          const activeExecution = await tx.diagnosticTestExecution.findFirst({ where: { diagnosticCaseId: diagnosticCase.id, state: { in: ["RUNNING", "PAUSED"] }, nextEvent: null }, select: { id: true } });
          if (activeExecution) throw new Error("An active test execution must be completed, invalidated, or cancelled before revising the plan.");
          planVersion = prior.version + 1;
        }
        const plan = await tx.diagnosticTestPlanVersion.create({ data: { id: data.id, organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, version: planVersion, status: "ACTIVE", rationale: data.rationale, applicability: json(data.applicability), graphChecksum: data.graphChecksum, authoredByUserId: command.actorUserId, supersedesId: data.supersedesId } });
        await tx.diagnosticTestPlanNode.createMany({ data: data.nodes.map((node, index) => ({ id: data.nodeIds[index], organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, testPlanVersionId: plan.id, definitionVersionId: node.definitionVersionId, nodeKey: node.nodeKey, sequence: node.sequence, title: node.title, dependencyNodeKeys: json(node.dependencyNodeKeys), branchRules: json(node.branchRules), requiredEvidenceOverride: node.requiredEvidenceOverride == null ? undefined : json(node.requiredEvidenceOverride) })) });
        await tx.diagnosticCase.update({ where: { id: diagnosticCase.id }, data: { version, status: "TEST_PLAN_READY" } });
        if (diagnosticCase.status !== "TEST_PLAN_READY") await tx.diagnosticCaseStateEvent.create({ data: { organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, version, eventType: "STATUS_CHANGED", fromStatus: diagnosticCase.status, toStatus: "TEST_PLAN_READY", fromAssignedUserId: diagnosticCase.assignedUserId, toAssignedUserId: diagnosticCase.assignedUserId, reasonCode: "CASE_PLAN_READY", reason: command.reason, actorUserId: command.actorUserId, correlationId: command.correlationId, occurredAt: new Date() } });
        return { previous: data.supersedesId ? { supersededPlanId: data.supersedesId } : undefined, result: { caseId: diagnosticCase.id, planId: plan.id, planVersion, graphChecksum: plan.graphChecksum, nodeCount: data.nodes.length, version } };
      });
    },

    executeTestLifecycle(command, data) {
      const eventNames: Record<DiagnosticTestLifecycleAction, string> = { START: "DiagnosticTestStarted", PAUSE: "DiagnosticTestPaused", RESUME: "DiagnosticTestResumed", COMPLETE: "DiagnosticTestCompleted", INVALIDATE: "DiagnosticTestInvalidated", CANCEL: "DiagnosticTestCancelled" };
      return execute(database, command, eventNames[data.action], data.reasonCode, async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        if (isTerminalDiagnosticStatus(diagnosticCase.status as DiagnosticCaseStatus)) throw new Error("Terminal diagnostic cases must be reopened before executing tests.");
        const prior = await tx.diagnosticTestExecution.findFirst({ where: { organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, executionKey: data.executionKey, nextEvent: null }, orderBy: { revision: "desc" } });
        if (data.action === "START") {
          if (!data.planNodeId) throw new Error("Starting a diagnostic test requires a plan-node ID.");
          if (!["TEST_PLAN_READY", "TESTING"].includes(diagnosticCase.status)) throw new Error("Diagnostic tests can start only from a plan-ready or testing case.");
          if (prior) throw new Error("That diagnostic execution key has already been used; repeat tests require a new execution key and repeat lineage.");
          if (data.repeatOfExecutionKey) {
            const repeated = await tx.diagnosticTestExecution.findFirst({ where: { organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, executionKey: data.repeatOfExecutionKey, state: { in: ["COMPLETED", "INVALIDATED", "CANCELLED"] }, nextEvent: null }, select: { id: true } });
            if (!repeated) throw new Error("Repeated diagnostic test lineage must reference a terminal execution in this case.");
          }
        } else if (!prior) throw new Error("Diagnostic test execution was not found.");
        const node = await tx.diagnosticTestPlanNode.findFirst({ where: { id: data.planNodeId ?? prior!.planNodeId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, include: { definitionVersion: true, testPlanVersion: { include: { supersededBy: { select: { id: true } } } } } });
        if (!node || node.testPlanVersion.status !== "ACTIVE" || node.testPlanVersion.supersededBy) throw new Error("Diagnostic test execution requires a node from the active case plan.");
        const now = data.occurredAt;
        if (node.definitionVersion.effectiveAt > now || (node.definitionVersion.expiresAt && node.definitionVersion.expiresAt <= now)) throw new Error("The selected diagnostic test definition is not effective at execution time.");
        if (data.action === "START" && data.prerequisiteSnapshot.prerequisitesSatisfied !== true) throw new Error("Every test prerequisite must be explicitly satisfied before start.");
        const hazardEntries = Array.isArray(node.definitionVersion.hazards) ? node.definitionVersion.hazards : [];
        if (data.action === "START" && hazardEntries.length && data.prerequisiteSnapshot.hazardsControlled !== true) throw new Error("Every diagnostic test hazard must be explicitly controlled before start.");
        if (data.action === "COMPLETE" && !Object.keys(data.results).length) throw new Error("Completing a diagnostic test requires structured results.");
        const requiredEvidenceEntries = Array.isArray(node.definitionVersion.requiredEvidence) ? node.definitionVersion.requiredEvidence : [];
        if (data.action === "COMPLETE" && requiredEvidenceEntries.length && data.evidenceSummary.requirementsSatisfied !== true) throw new Error("Completing this diagnostic test requires an explicit required-evidence summary.");
        const qualificationEntries = (Array.isArray(node.definitionVersion.qualifications) ? node.definitionVersion.qualifications : []).map((qualification) => typeof qualification === "string" ? qualification : String((qualification as Record<string, unknown>).code ?? "")).filter(Boolean);
        const verifiedQualifications = data.action === "START" && qualificationEntries.length ? await tx.technicianQualification.findMany({ where: { organizationId: command.organizationId, technicianUserId: command.actorUserId, code: { in: qualificationEntries }, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }, select: { code: true, type: true, verifiedAt: true, verifiedByUserId: true } }) : [];
        const verifiedCodes = new Set(verifiedQualifications.map((qualification) => qualification.code));
        const missingQualifications = qualificationEntries.filter((qualification) => !verifiedCodes.has(qualification));
        if (data.action === "START" && missingQualifications.length) throw new Error(`The acting technician is missing required qualifications: ${missingQualifications.join(", ")}.`);
        const prerequisiteSnapshot = { ...data.prerequisiteSnapshot, serverVerifiedQualifications: verifiedQualifications };
        const currentState = prior ? prior.state as DiagnosticTestExecutionState : null;
        const nextState = nextTestExecutionState(currentState, data.action);
        const event = await tx.diagnosticTestExecution.create({ data: {
          id: data.eventId, organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, planNodeId: node.id, definitionVersionId: node.definitionVersionId, executionKey: data.executionKey,
          revision: (prior?.revision ?? 0) + 1, state: nextState, reasonCode: data.reasonCode, reason: data.reason, actualConditions: json(data.actualConditions), deviations: json(data.deviations), inputs: json(data.inputs), results: json(data.results), evidenceSummary: json(data.evidenceSummary), prerequisiteSnapshot: json(prerequisiteSnapshot), actorUserId: command.actorUserId, previousEventId: prior?.id, repeatOfExecutionKey: data.repeatOfExecutionKey,
          startedAt: prior?.startedAt ?? (data.action === "START" ? now : null), pausedAt: data.action === "PAUSE" ? now : prior?.pausedAt, completedAt: data.action === "COMPLETE" ? now : prior?.completedAt, invalidatedAt: data.action === "INVALIDATE" ? now : prior?.invalidatedAt, cancelledAt: data.action === "CANCEL" ? now : prior?.cancelledAt, occurredAt: now
        } });
        await tx.diagnosticCase.update({ where: { id: diagnosticCase.id }, data: { version, status: nextState === "RUNNING" ? "TESTING" : diagnosticCase.status } });
        if (data.action === "START" && diagnosticCase.status === "TEST_PLAN_READY") await tx.diagnosticCaseStateEvent.create({ data: { organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, version, eventType: "STATUS_CHANGED", fromStatus: diagnosticCase.status, toStatus: "TESTING", fromAssignedUserId: diagnosticCase.assignedUserId, toAssignedUserId: diagnosticCase.assignedUserId, reasonCode: "CASE_TESTING_STARTED", reason: command.reason, actorUserId: command.actorUserId, correlationId: command.correlationId, occurredAt: now } });
        return { previous: prior ? { executionEventId: prior.id, revision: prior.revision, state: prior.state } : undefined, result: { caseId: diagnosticCase.id, executionEventId: event.id, executionKey: event.executionKey, revision: event.revision, state: event.state, occurredAt: event.occurredAt.toISOString(), version } };
      });
    },

    recordObservation(command, data) {
      return execute(database, command, data.correctsId ? "DiagnosticFactCorrected" : "DiagnosticObservationRecorded", data.qualityReasonCode, async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        if (isTerminalDiagnosticStatus(diagnosticCase.status as DiagnosticCaseStatus)) throw new Error("Terminal diagnostic cases must be reopened before evidence can be recorded.");
        const concern = await tx.diagnosticConcernVersion.findFirst({ where: { diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId, version: diagnosticCase.currentConcernVersion }, select: { id: true } });
        if (!concern) throw new Error("Current diagnostic concern version was not found.");
        if (data.correctsId) {
          const prior = await tx.diagnosticObservation.findFirst({ where: { id: data.correctsId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, select: { id: true, correctedBy: { select: { id: true } } } });
          if (!prior) throw new Error("Corrected diagnostic observation was not found in this case.");
          if (prior.correctedBy) throw new Error("Diagnostic observation already has a correction.");
        }
        const observation = await tx.diagnosticObservation.create({ data: {
          id: data.id, organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, concernVersionId: concern.id,
          factClass: data.factClass, statement: data.statement, structuredValue: data.structuredValue == null ? undefined : json(data.structuredValue), operatingConditions: json(data.operatingConditions), source: data.source,
          reliability: data.reliability, qualityStatus: data.qualityStatus, qualityReasonCode: data.qualityReasonCode, independenceGroup: data.independenceGroup,
          timeWindowStart: data.timeWindowStart, timeWindowEnd: data.timeWindowEnd, observedAt: data.observedAt, rawSource: json(data.rawSource), authorUserId: command.actorUserId, correctsId: data.correctsId
        }, select: { id: true, factClass: true, qualityStatus: true, correctsId: true, observedAt: true } });
        await tx.diagnosticCase.update({ where: { id: diagnosticCase.id }, data: { version } });
        return { previous: data.correctsId ? { correctedObservationId: data.correctsId } : undefined, result: { caseId: diagnosticCase.id, concernVersionId: concern.id, observationId: observation.id, factClass: observation.factClass, qualityStatus: observation.qualityStatus, correctsId: observation.correctsId, observedAt: observation.observedAt.toISOString(), version } };
      });
    },

    recordMeasurement(command, data) {
      return execute(database, command, data.supersedesId ? "DiagnosticFactCorrected" : "DiagnosticMeasurementRecorded", data.qualityReasonCode, async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        if (isTerminalDiagnosticStatus(diagnosticCase.status as DiagnosticCaseStatus)) throw new Error("Terminal diagnostic cases must be reopened before evidence can be recorded.");
        const concern = await tx.diagnosticConcernVersion.findFirst({ where: { diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId, version: diagnosticCase.currentConcernVersion }, select: { id: true } });
        if (!concern) throw new Error("Current diagnostic concern version was not found.");
        if (data.supersedesId) {
          const prior = await tx.diagnosticMeasurement.findFirst({ where: { id: data.supersedesId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, select: { id: true, supersededBy: { select: { id: true } } } });
          if (!prior) throw new Error("Superseded diagnostic measurement was not found in this case.");
          if (prior.supersededBy) throw new Error("Diagnostic measurement already has a correction.");
        }
        const measurement = await tx.diagnosticMeasurement.create({ data: {
          id: data.id, organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, concernVersionId: concern.id,
          quantity: data.quantity, valueDecimal: data.valueDecimal, unit: data.unit, normalizedValue: data.normalizedValue, normalizedUnit: data.normalizedUnit,
          referenceMinimum: data.referenceMinimum, referenceMaximum: data.referenceMaximum, normalizedReferenceMin: data.normalizedReferenceMin, normalizedReferenceMax: data.normalizedReferenceMax,
          tolerance: json(data.tolerance), instrument: json(data.instrument), setup: json(data.setup), operatingConditions: json(data.operatingConditions), source: data.source,
          reliability: data.reliability, qualityStatus: data.qualityStatus, qualityReasonCode: data.qualityReasonCode, plausibilityStatus: data.plausibilityStatus, plausibilityReasonCode: data.plausibilityReasonCode,
          independenceGroup: data.independenceGroup, timeWindowStart: data.timeWindowStart, timeWindowEnd: data.timeWindowEnd, measuredAt: data.measuredAt, rawSource: json(data.rawSource), authorUserId: command.actorUserId, supersedesId: data.supersedesId
        }, select: { id: true, normalizedValue: true, normalizedUnit: true, plausibilityStatus: true, qualityStatus: true, supersedesId: true, measuredAt: true } });
        await tx.diagnosticCase.update({ where: { id: diagnosticCase.id }, data: { version } });
        return { previous: data.supersedesId ? { supersededMeasurementId: data.supersedesId } : undefined, result: { caseId: diagnosticCase.id, concernVersionId: concern.id, measurementId: measurement.id, normalizedValue: measurement.normalizedValue.toString(), normalizedUnit: measurement.normalizedUnit, plausibilityStatus: measurement.plausibilityStatus, qualityStatus: measurement.qualityStatus, supersedesId: measurement.supersedesId, measuredAt: measurement.measuredAt.toISOString(), version } };
      });
    },

    linkEvidence(command, data) {
      return execute(database, command, "DiagnosticEvidenceLinked", "DATA_EVIDENCE_LINKED", async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        if (isTerminalDiagnosticStatus(diagnosticCase.status as DiagnosticCaseStatus)) throw new Error("Terminal diagnostic cases must be reopened before evidence can be linked.");
        const evidence = await tx.vehicleEvidenceObject.findFirst({ where: { id: data.evidenceObjectId, organizationId: command.organizationId }, include: { links: { where: { vehicleId: diagnosticCase.vehicleId }, select: { id: true } } } });
        if (!evidence) throw new Error("Vehicle Evidence object was not found.");
        if (evidence.status !== "AVAILABLE" || evidence.malwareStatus !== "CLEAN") throw new Error("Vehicle Evidence object must be available and malware-clean before linking.");
        if (!evidence.links.length) throw new Error("Vehicle Evidence object does not belong to the diagnostic-case vehicle.");
        const observationId = data.subjectType === "OBSERVATION" ? data.subjectId : null;
        const measurementId = data.subjectType === "MEASUREMENT" ? data.subjectId : null;
        const testExecutionId = data.subjectType === "TEST_EXECUTION" ? data.subjectId : null;
        if (data.subjectType === "CASE" && data.subjectId !== diagnosticCase.id) throw new Error("Diagnostic case evidence target is invalid.");
        if (data.subjectType === "CONCERN" && !await tx.diagnosticConcernVersion.findFirst({ where: { id: data.subjectId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, select: { id: true } })) throw new Error("Diagnostic concern evidence target is invalid.");
        if (observationId && !await tx.diagnosticObservation.findFirst({ where: { id: observationId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, select: { id: true } })) throw new Error("Diagnostic observation evidence target is invalid.");
        if (measurementId && !await tx.diagnosticMeasurement.findFirst({ where: { id: measurementId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, select: { id: true } })) throw new Error("Diagnostic measurement evidence target is invalid.");
        if (testExecutionId && !await tx.diagnosticTestExecution.findFirst({ where: { id: testExecutionId, diagnosticCaseId: diagnosticCase.id, organizationId: command.organizationId }, select: { id: true } })) throw new Error("Diagnostic test-execution evidence target is invalid.");
        if (["HYPOTHESIS", "CONCLUSION", "VERIFICATION"].includes(data.subjectType)) throw new Error(`${data.subjectType.replaceAll("_", " ")} evidence targets are not active yet.`);
        const link = await tx.diagnosticEvidenceLink.create({ data: { id: data.id, organizationId: command.organizationId, diagnosticCaseId: diagnosticCase.id, evidenceObjectId: evidence.id, subjectType: data.subjectType, subjectId: data.subjectId, observationId, measurementId, testExecutionId, purpose: data.purpose, relationship: data.relationship, createdByUserId: command.actorUserId }, select: { id: true, evidenceObjectId: true, subjectType: true, subjectId: true, createdAt: true } });
        await tx.vehicleEvidenceEvent.create({ data: { organizationId: command.organizationId, evidenceObjectId: evidence.id, actorUserId: command.actorUserId, eventType: "LINKED", reason: command.reason, metadata: json({ diagnosticCaseId: diagnosticCase.id, diagnosticEvidenceLinkId: link.id, relationship: data.relationship, subjectId: data.subjectId, subjectType: data.subjectType }) } });
        await tx.diagnosticCase.update({ where: { id: diagnosticCase.id }, data: { version } });
        return { result: { caseId: diagnosticCase.id, diagnosticEvidenceLinkId: link.id, evidenceObjectId: link.evidenceObjectId, subjectType: link.subjectType, subjectId: link.subjectId, createdAt: link.createdAt.toISOString(), version } };
      });
    },

    create(command, data) {
      return execute(database, command, "DiagnosticCaseCreated", data.reasonCode, async (tx, version) => {
        const repairOrder = await tx.repairOrder.findFirst({
          where: { id: command.payload.repairOrderId as string, organizationId: command.organizationId, closedAt: null },
          select: { id: true, locationId: true, vehicleId: true, version: true, serviceVisit: { select: { concernSummary: true } } }
        });
        if (!repairOrder) throw new Error("An open repair order was not found for this diagnostic case.");
        if (repairOrder.locationId !== command.locationId) throw new Error("Diagnostic case location does not match the repair order.");
        if (repairOrder.version !== data.repairOrderVersion) throw new EnterpriseCommandConflictError(`Expected repair-order version ${data.repairOrderVersion}, but current version is ${repairOrder.version}.`, "VERSION_CONFLICT");
        if (repairOrder.serviceVisit.concernSummary.trim() !== data.canonicalConcernStatement) throw new EnterpriseCommandConflictError("The canonical repair-order concern changed before case creation.", "VERSION_CONFLICT");
        const duplicate = await tx.diagnosticCase.findFirst({ where: { repairOrderId: repairOrder.id, OR: [{ concernKey: data.concernKey }, { concernFingerprint: data.concernFingerprint }] }, select: { id: true } });
        if (duplicate) throw new DiagnosticCaseDuplicateError(duplicate.id);
        if (data.assignedUserId) {
          const assignee = await tx.user.findFirst({ where: { id: data.assignedUserId, isActive: true }, select: { id: true } });
          if (!assignee) throw new Error("Diagnostic assignee must be an active user.");
        }
        const diagnosticCase = await tx.diagnosticCase.create({
          data: {
            id: command.subjectId,
            organizationId: command.organizationId,
            locationId: repairOrder.locationId,
            vehicleId: repairOrder.vehicleId,
            repairOrderId: repairOrder.id,
            concernKey: data.concernKey,
            concernFingerprint: data.concernFingerprint,
            status: "DRAFT",
            riskTier: data.riskTier,
            assignedUserId: data.assignedUserId,
            createdByUserId: command.actorUserId,
            currentConcernVersion: 1,
            version,
            openedAt: data.openedAt
          }
        });
        const concern = await tx.diagnosticConcernVersion.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version: 1,
            statement: data.concernStatement,
            operatingConditions: json(data.operatingConditions),
            source: data.concernSource,
            sourceSnapshot: json({ repairOrderId: repairOrder.id, repairOrderVersion: repairOrder.version, canonicalConcernStatement: data.canonicalConcernStatement }),
            authorUserId: command.actorUserId
          }
        });
        await tx.diagnosticCaseStateEvent.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version,
            eventType: "CREATED",
            fromStatus: null,
            toStatus: "DRAFT",
            fromAssignedUserId: null,
            toAssignedUserId: diagnosticCase.assignedUserId,
            reasonCode: data.reasonCode,
            reason: command.reason,
            actorUserId: command.actorUserId,
            correlationId: command.correlationId,
            occurredAt: data.openedAt
          }
        });
        return { result: { id: diagnosticCase.id, concernVersionId: concern.id, repairOrderId: repairOrder.id, status: diagnosticCase.status, assignedUserId: diagnosticCase.assignedUserId, riskTier: diagnosticCase.riskTier, version } };
      });
    },

    assign(command, data) {
      return execute(database, command, "DiagnosticCaseAssigned", data.reasonCode, async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        if (isTerminalDiagnosticStatus(diagnosticCase.status as DiagnosticCaseStatus)) throw new Error("Terminal diagnostic cases must be reopened before assignment.");
        if (diagnosticCase.assignedUserId === data.assignedUserId) throw new Error("Diagnostic case is already assigned to that user.");
        const assignee = await tx.user.findFirst({ where: { id: data.assignedUserId, isActive: true }, select: { id: true } });
        if (!assignee) throw new Error("Diagnostic assignee must be an active user.");
        const previous = { assignedUserId: diagnosticCase.assignedUserId, status: diagnosticCase.status, version: diagnosticCase.version };
        const updated = await tx.diagnosticCase.update({ where: { id: diagnosticCase.id }, data: { assignedUserId: data.assignedUserId, version } });
        await tx.diagnosticCaseStateEvent.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version,
            eventType: "ASSIGNED",
            fromStatus: diagnosticCase.status,
            toStatus: diagnosticCase.status,
            fromAssignedUserId: diagnosticCase.assignedUserId,
            toAssignedUserId: data.assignedUserId,
            reasonCode: data.reasonCode,
            reason: command.reason,
            actorUserId: command.actorUserId,
            correlationId: command.correlationId,
            occurredAt: data.occurredAt
          }
        });
        return { previous, result: { id: updated.id, assignedUserId: updated.assignedUserId, status: updated.status, version } };
      });
    },

    transition(command, data) {
      const eventType = data.targetStatus === "ESCALATED" ? "DiagnosticCaseEscalated" : data.targetStatus === "REOPENED" ? "DiagnosticCaseReopened" : data.targetStatus === "ABANDONED" ? "DiagnosticCaseAbandoned" : "DiagnosticCaseStatusChanged";
      return execute(database, command, eventType, data.reasonCode, async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        const next = nextDiagnosticCaseState({ status: diagnosticCase.status as DiagnosticCaseStatus, resumeStatus: diagnosticCase.resumeStatus as DiagnosticCaseStatus | null }, data.targetStatus, data.occurredAt);
        const previous = { closedAt: diagnosticCase.closedAt, resumeStatus: diagnosticCase.resumeStatus, status: diagnosticCase.status, version: diagnosticCase.version };
        const updated = await tx.diagnosticCase.update({
          where: { id: diagnosticCase.id },
          data: { closedAt: next.closedAt, resumeStatus: next.resumeStatus, status: data.targetStatus, version }
        });
        await tx.diagnosticCaseStateEvent.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version,
            eventType: next.eventType,
            fromStatus: diagnosticCase.status,
            toStatus: data.targetStatus,
            fromAssignedUserId: diagnosticCase.assignedUserId,
            toAssignedUserId: diagnosticCase.assignedUserId,
            reasonCode: data.reasonCode,
            reason: command.reason,
            actorUserId: command.actorUserId,
            correlationId: command.correlationId,
            occurredAt: data.occurredAt
          }
        });
        return { previous, result: { id: updated.id, assignedUserId: updated.assignedUserId, closedAt: updated.closedAt, resumeStatus: updated.resumeStatus, status: updated.status, version } };
      });
    }
  };
}
