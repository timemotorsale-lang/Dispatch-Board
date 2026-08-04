import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import type { AuthenticatedUser } from "@/server/auth/store";
import { addShopStaffedMinutes, SHOP_RECON_STAGES, SHOP_RECON_TARGETS, type ShopReconStageCode } from "./foundation";
import { deriveShopReconStage, SHOP_RECON_ZONE_BY_STAGE } from "./workflow";
import { canCompleteShopReconStage, evaluateDraftCompletion, evaluateGovernedTransition } from "./policy";
import { getShopReconStageWorkspace } from "./stage-workspace";

type DraftData = { checklist: Record<string, boolean>; formData: Record<string, unknown>; evidence: string[]; reason: string };

function orderInclude() {
  return { serviceVisit: true, inspectionVersions: { orderBy: { version: "desc" as const }, take: 1 }, diagnosisVersions: { orderBy: { version: "desc" as const }, take: 1 }, estimateVersions: { orderBy: { version: "desc" as const }, take: 3, include: { authorizations: { orderBy: { decidedAt: "desc" as const } } } }, releaseAuthorization: true, repairJobs: { where: { status: { not: "CANCELLED" as const } }, include: { partDemands: true, dispatches: true, qualityInspections: { orderBy: { version: "desc" as const }, take: 1 } } }, shopReconLifecycle: { include: { drafts: { orderBy: { savedAt: "desc" as const } }, events: { orderBy: { sequence: "desc" as const }, take: 100 }, overrides: { orderBy: { createdAt: "desc" as const }, take: 20 }, scopeChanges: { orderBy: { version: "desc" as const }, take: 20 }, stageEvidence: { orderBy: { publishedAt: "desc" as const }, take: 100 } } } };
}

function nextAction(stage: ShopReconStageCode) { return getShopReconStageWorkspace(stage).purpose; }
function targetAt(stage: ShopReconStageCode, now: Date, fallback: Date) { const minutes = SHOP_RECON_TARGETS.stageMinutes[stage]; return minutes == null ? fallback : addShopStaffedMinutes(now, minutes); }
function draftRecord(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function draftText(form: Record<string, unknown>, key: string, label: string) { const value = typeof form[key] === "string" ? form[key].trim() : ""; if (!value) throw new Error(`${label} is required before operational evidence can be published.`); return value; }
function draftNumber(form: Record<string, unknown>, key: string, label: string) { const value = Number(form[key]); if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`); return Math.round(value); }
type FactOrder = { vehicleId: string; serviceVisit: { keysReceivedCount: number }; origin: string; inspectionVersions: unknown[]; diagnosisVersions: unknown[]; estimateVersions: Array<{ authorizations: Array<{ disposition: string }> }>; repairJobs: Array<{ status: string; partsRequired: boolean; procedureVersionId: string | null; executionEvidence: unknown; partDemands: Array<{ quantityReserved: number; quantityRequired: number }>; dispatches: Array<{ status: string; bayResourceId: string | null }>; qualityInspections: Array<{ roadTestOutcome: string }> }>; releaseAuthorization: unknown };
type FactLifecycle = { stage: ShopReconStageCode; scopeVersion: number; events: Array<{ eventType: string; fromStage: ShopReconStageCode | null }>; stageEvidence: Array<{ stage: ShopReconStageCode; scopeVersion: number }> };
function authoritativeFacts(order: FactOrder, lifecycle: FactLifecycle, draft: { formData: unknown }) {
  const published = new Set(lifecycle.stageEvidence.filter(evidence => evidence.scopeVersion === lifecycle.scopeVersion).map(evidence => evidence.stage));
  const form = draft.formData && typeof draft.formData === "object" && !Array.isArray(draft.formData) ? draft.formData as Record<string, unknown> : {};
  const jobs = order.repairJobs, latestInspections = jobs.map(job => job.qualityInspections[0]).filter((inspection): inspection is { roadTestOutcome: string } => Boolean(inspection));
  const authorized = order.estimateVersions.flatMap(estimate => estimate.authorizations).some(authorization => ["ACCEPTED", "PARTIAL"].includes(authorization.disposition));
  return {
    IDENTITY_MATCHED: published.has("SHOP_ENTRY") && Boolean(order.vehicleId), CUSTODY_ACCEPTED: published.has("CUSTODY_CHECK_IN") && (order.serviceVisit?.keysReceivedCount ?? 0) > 0, LANE_CONFIRMED: published.has("LANE_SCOPE_CONFIRMATION") && ["CUSTOMER_REPAIR", "INVENTORY_RECON"].includes(order.origin), SAFETY_TRIAGED: published.has("SAFETY_PRIORITY_TRIAGE"),
    INSPECTION_COMPLETE: published.has("INSPECTION") && Boolean(order.inspectionVersions?.length), DIAGNOSIS_COMPLETE: published.has("DIAGNOSIS") && Boolean(order.diagnosisVersions?.length), FINDINGS_VERIFIED: published.has("FINDINGS_VERIFICATION"), PLAN_CURRENT: Boolean(order.estimateVersions?.length), AUTHORIZATION_CURRENT: authorized,
    PARTS_READY: jobs.length > 0 && jobs.every(job => !job.partsRequired || job.partDemands.every(demand => demand.quantityReserved >= demand.quantityRequired)), TECHNICIAN_ELIGIBLE: Boolean(form.technicianRequirement) || jobs.some(job => job.dispatches.length > 0), BAY_ELIGIBLE: Boolean(form.bayRequirement) || jobs.some(job => job.dispatches.some(dispatch => Boolean(dispatch.bayResourceId))), PROCEDURE_CURRENT: jobs.length > 0 && jobs.every(job => Boolean(job.procedureVersionId)), DISPATCH_CONFIRMED: jobs.some(job => job.dispatches.some(dispatch => ["STAGED", "ACTIVE", "COMPLETED"].includes(dispatch.status))),
    EXECUTION_COMPLETE: jobs.length > 0 && jobs.every(job => ["READY_FOR_QC", "QC_PASSED"].includes(job.status)), COMPLETION_EVIDENCE: jobs.length > 0 && jobs.every(job => Array.isArray(job.executionEvidence) && job.executionEvidence.length > 0), QC_PASSED: jobs.length > 0 && jobs.every(job => job.status === "QC_PASSED"), ROAD_TEST_PASSED_OR_NOT_REQUIRED: latestInspections.length === jobs.length && latestInspections.every(inspection => ["PASSED", "NOT_REQUIRED"].includes(inspection.roadTestOutcome)), HANDOFF_ACCEPTED: Boolean(order.releaseAuthorization),
  };
}

export function createShopReconLifecycleRepository(database: PrismaClient = prisma) {
  return {
    async aggregateVersion(organizationId: string, repairOrderId: string) {
      const row = await database.enterpriseAggregateVersion.findUnique({ where: { organizationId_domain_subjectType_subjectId: { organizationId, domain: "SHOP_RECON", subjectType: "SHOP_RECON_LIFECYCLE", subjectId: repairOrderId } }, select: { version: true } });
      return row?.version ?? 0;
    },
    async get(organizationId: string, repairOrderId: string) {
      return database.repairOrder.findFirst({ where: { id: repairOrderId, organizationId, closedAt: null }, include: orderInclude() });
    },
    async actorNames(userIds: string[]) {
      if (!userIds.length) return [];
      return database.user.findMany({ where: { id: { in: [...new Set(userIds)] } }, select: { id: true, name: true } });
    },
    saveDraft(command: EnterpriseCommandCommitInput, actor: AuthenticatedUser, stage: ShopReconStageCode, data: DraftData, now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: orderInclude() });
        if (!order) throw new Error("Repair order was not found.");
        const initialStage = deriveShopReconStage(order), lifecycle = order.shopReconLifecycle ?? await tx.shopReconLifecycle.create({ data: { organizationId: command.organizationId, locationId: order.locationId, repairOrderId: order.id, stage: initialStage, operatingState: "ACTIVE", stageStartedAt: order.stageStartedAt, ownerUserId: order.ownerUserId, zoneCode: SHOP_RECON_ZONE_BY_STAGE[initialStage], targetAt: targetAt(initialStage, order.stageStartedAt, order.targetAt), nextAction: nextAction(initialStage), blockerCodes: toJson([]), version: 0 } });
        if (stage !== lifecycle.stage) throw new Error("Drafts can only be saved for the current operational stage.");
        const latest = await tx.shopReconStageDraft.findFirst({ where: { lifecycleId: lifecycle.id, stage, scopeVersion: lifecycle.scopeVersion }, orderBy: { revision: "desc" } }), revision = (latest?.revision ?? 0) + 1;
        const draft = await tx.shopReconStageDraft.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, stage, scopeVersion: lifecycle.scopeVersion, revision, checklist: toJson(data.checklist), formData: toJson(data.formData), evidence: toJson(data.evidence), savedByUserId: actor.id, savedAt: now, reason: data.reason } });
        await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { version, lastSavedByUserId: actor.id, lastSavedAt: now } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "DRAFT_SAVED", fromStage: stage, toStage: stage, fromOperatingState: lifecycle.operatingState, toOperatingState: lifecycle.operatingState, scopeVersion: lifecycle.scopeVersion, actorUserId: actor.id, reason: data.reason, payload: toJson({ revision, initialized: !order.shopReconLifecycle }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, revision, savedAt: now.toISOString(), savedByUserId: actor.id, stage, draftId: draft.id } };
      });
    },
    publishStageEvidence(command: EnterpriseCommandCommitInput, actor: AuthenticatedUser, reason: string, now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: orderInclude() }), lifecycle = order?.shopReconLifecycle;
        if (!order || !lifecycle) throw new Error("Save the current stage before publishing operational evidence.");
        const stageOrder = SHOP_RECON_STAGES.find(item => item.code === lifecycle.stage)?.order ?? 99;
        if (stageOrder > 7) throw new Error("This operational evidence command currently supports Shop stages 1 through 7.");
        const authority = canCompleteShopReconStage(actor, lifecycle.stage);
        if (!authority.allowed) throw new Error(`${authority.authority} is required to publish this stage's operational evidence.`);
        const draft = await tx.shopReconStageDraft.findFirst({ where: { lifecycleId: lifecycle.id, stage: lifecycle.stage, scopeVersion: lifecycle.scopeVersion }, orderBy: { revision: "desc" } });
        if (!draft) throw new Error("Save the current stage before publishing operational evidence.");
        const completion = evaluateDraftCompletion(lifecycle.stage, draft);
        if (!completion.complete) throw new Error("Complete every required checklist item, form field, and evidence reference before publishing operational evidence.");
        const form = draftRecord(draft.formData), evidenceReferences = Array.isArray(draft.evidence) ? draft.evidence.filter((item): item is string => typeof item === "string") : [], sourceReferences: Array<{ type: string; id: string; version?: number }> = [];
        let publishedOperatingState = lifecycle.operatingState;
        let payload: Record<string, unknown> = { ...form, evidenceReferences, draftId: draft.id, draftRevision: draft.revision };
        const vehicle = await tx.vehicle.findFirst({ where: { id: order.vehicleId, organizationId: command.organizationId }, select: { id: true, vin: true, vehicleNumber: true } });
        if (!vehicle) throw new Error("The canonical vehicle record was not found.");
        if (lifecycle.stage === "SHOP_ENTRY") {
          const observed = draftText(form, "observedIdentifier", "Observed vehicle identifier").replace(/[^A-Z0-9]/gi, "").toUpperCase(), expected = [vehicle.vin, vehicle.vehicleNumber, order.repairOrderNumber].filter(Boolean).map(value => String(value).replace(/[^A-Z0-9]/gi, "").toUpperCase());
          if (!expected.includes(observed)) throw new Error("Observed vehicle identity does not match the VIN, vehicle number, or repair order.");
          payload = { ...payload, canonicalVehicleId: vehicle.id, arrivedAt: order.serviceVisit.arrivedAt, identityMatched: true }; sourceReferences.push({ type: "VEHICLE", id: vehicle.id }, { type: "SERVICE_VISIT", id: order.serviceVisit.id });
        } else if (lifecycle.stage === "CUSTODY_CHECK_IN") {
          const keyCount = draftNumber(form, "keyCount", "Keys received"), keyTag = draftText(form, "keyTag", "Key tag"); if (keyCount < 1) throw new Error("At least one key is required to accept Shop custody.");
          await tx.serviceVisit.update({ where: { id: order.serviceVisit.id }, data: { keysReceivedCount: keyCount, keyTag, intakeNotes: typeof form.custodyRestriction === "string" ? form.custodyRestriction.trim() || null : null } });
          const custody = await tx.vehicleCustodyEvent.create({ data: { organizationId: command.organizationId, vehicleId: order.vehicleId, locationId: order.locationId, eventType: "CHECK_IN", custodianType: "SHOP_USER", custodianId: actor.id, positionLabel: "Z02_CHECK_IN", occurredAt: now, sourceCode: "SHOP_RECON_STAGE_2", sourceReference: order.id, reason, recordedByUserId: actor.id } });
          payload = { ...payload, keyCount, keyTag, custodyAccepted: true, custodyEventId: custody.id }; sourceReferences.push({ type: "SERVICE_VISIT", id: order.serviceVisit.id }, { type: "VEHICLE_CUSTODY_EVENT", id: custody.id });
        } else if (lifecycle.stage === "LANE_SCOPE_CONFIRMATION") {
          const lane = draftText(form, "workLane", "Governing work lane"), expectedLane = order.origin === "INVENTORY_RECON" ? "Inventory Recon" : "Customer Repair"; if (lane !== expectedLane) throw new Error(`The selected lane conflicts with the repair order. Expected ${expectedLane}.`);
          payload = { ...payload, repairOrderOrigin: order.origin, initialScopeVersion: lifecycle.scopeVersion, laneConfirmed: true }; sourceReferences.push({ type: "REPAIR_ORDER", id: order.id, version: order.version });
        } else if (lifecycle.stage === "SAFETY_PRIORITY_TRIAGE") {
          const mobility = draftText(form, "mobility", "Vehicle mobility"), hazards = draftText(form, "hazards", "Observed hazards"), priority = draftText(form, "priority", "Operational priority"), restricted = mobility === "Do not move";
          payload = { ...payload, mobility, hazards, priority, safetyTriaged: true, movementRestricted: restricted };
          const existingBlockers = Array.isArray(lifecycle.blockerCodes) ? lifecycle.blockerCodes.filter((code): code is string => typeof code === "string" && code !== "BLK-SAFE-MOVEMENT_RESTRICTED") : [];
          const blockerCodes = restricted ? [...existingBlockers, "BLK-SAFE-MOVEMENT_RESTRICTED"] : existingBlockers;
          publishedOperatingState = blockerCodes.length ? "BLOCKED" : "ACTIVE";
          await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { operatingState: publishedOperatingState, zoneCode: restricted ? "Z12_QUARANTINE" : SHOP_RECON_ZONE_BY_STAGE.SAFETY_PRIORITY_TRIAGE, blockerCodes: toJson(blockerCodes), nextAction: restricted ? "Resolve the movement restriction and obtain qualified safety clearance before moving the vehicle." : nextAction("SAFETY_PRIORITY_TRIAGE") } });
          sourceReferences.push({ type: "REPAIR_ORDER", id: order.id, version: order.version });
        } else if (lifecycle.stage === "INSPECTION") {
          const templateCode = draftText(form, "inspectionTemplate", "Inspection template").replace(/[^A-Z0-9]+/gi, "_").toUpperCase(), odometer = draftNumber(form, "odometer", "Observed odometer"), summary = draftText(form, "inspectionSummary", "Inspection summary"), latest = order.inspectionVersions[0];
          const inspection = await tx.vehicleInspectionVersion.create({ data: { organizationId: command.organizationId, repairOrderId: order.id, version: (latest?.version ?? 0) + 1, status: "COMPLETED", templateCode, templateVersion: 1, templateSnapshot: toJson({ code: templateCode, source: "SHOP_RECON_STAGE_5", checklist: getShopReconStageWorkspace("INSPECTION").checklist }), items: toJson(getShopReconStageWorkspace("INSPECTION").checklist.map((label, index) => ({ key: `item_${index + 1}`, label, result: "PASS", evidence: evidenceReferences }))), summary, authorUserId: actor.id, startedAt: lifecycle.stageStartedAt, completedAt: now, supersedesId: latest?.id } });
          const odometerRecord = await tx.vehicleOdometerObservation.create({ data: { organizationId: command.organizationId, vehicleId: order.vehicleId, reading: odometer, unit: "MILES", observedAt: now, sourceCode: "SHOP_RECON_INSPECTION", sourceReference: inspection.id, status: "ACCEPTED", recordedByUserId: actor.id } });
          payload = { ...payload, inspectionId: inspection.id, inspectionVersion: inspection.version, odometerObservationId: odometerRecord.id, inspectionComplete: true }; sourceReferences.push({ type: "VEHICLE_INSPECTION_VERSION", id: inspection.id, version: inspection.version }, { type: "ODOMETER_OBSERVATION", id: odometerRecord.id });
        } else if (lifecycle.stage === "DIAGNOSIS") {
          const confidence = draftText(form, "diagnosticConfidence", "Diagnostic confidence"), uncertainty = confidence === "High" ? "LOW" : confidence === "Medium" ? "MEDIUM" : "HIGH", latest = order.diagnosisVersions[0];
          const diagnosis = await tx.repairDiagnosisVersion.create({ data: { organizationId: command.organizationId, repairOrderId: order.id, version: (latest?.version ?? 0) + 1, concern: order.serviceVisit.concernSummary, symptoms: toJson([draftText(form, "findingReference", "Inspection finding or symptom")]), tests: toJson([{ name: draftText(form, "testPerformed", "Diagnostic test"), result: draftText(form, "testResult", "Diagnostic test result") }]), evidence: toJson(evidenceReferences), cause: draftText(form, "diagnosticConclusion", "Supported cause"), uncertainty, recommendation: draftText(form, "recommendation", "Technician recommendation"), proposedCorrection: draftText(form, "proposedCorrection", "Proposed correction"), technicianUserId: actor.id, diagnosedAt: now, supersedesId: latest?.id } });
          payload = { ...payload, diagnosisId: diagnosis.id, diagnosisVersion: diagnosis.version, diagnosisComplete: true, uncertainty }; sourceReferences.push({ type: "REPAIR_DIAGNOSIS_VERSION", id: diagnosis.id, version: diagnosis.version });
        } else if (lifecycle.stage === "FINDINGS_VERIFICATION") {
          const disposition = draftText(form, "findingDisposition", "Finding disposition"); if (disposition !== "Verified") throw new Error("Only verified findings can be published. Return-for-testing or changed-scope decisions must follow their controlled loop.");
          const diagnosis = order.diagnosisVersions[0]; if (!diagnosis) throw new Error("A current diagnosis is required before findings can be verified.");
          payload = { ...payload, diagnosisId: diagnosis.id, diagnosisVersion: diagnosis.version, findingsVerified: true, classification: draftText(form, "workClassification", "Work classification"), verificationNotes: draftText(form, "verificationNotes", "Verification notes") }; sourceReferences.push({ type: "REPAIR_DIAGNOSIS_VERSION", id: diagnosis.id, version: diagnosis.version });
        }
        const latestEvidence = await tx.shopReconStageEvidence.findFirst({ where: { lifecycleId: lifecycle.id, stage: lifecycle.stage, scopeVersion: lifecycle.scopeVersion }, orderBy: { version: "desc" } }), evidenceVersion = (latestEvidence?.version ?? 0) + 1;
        const published = await tx.shopReconStageEvidence.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, stage: lifecycle.stage, scopeVersion: lifecycle.scopeVersion, version: evidenceVersion, payload: toJson(payload), sourceReferences: toJson(sourceReferences), publishedByUserId: actor.id, publishedAt: now, reason } });
        await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { version } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "STAGE_EVIDENCE_PUBLISHED", fromStage: lifecycle.stage, toStage: lifecycle.stage, fromOperatingState: lifecycle.operatingState, toOperatingState: publishedOperatingState, scopeVersion: lifecycle.scopeVersion, actorUserId: actor.id, reason, payload: toJson({ stageEvidenceId: published.id, evidenceVersion, draftId: draft.id, draftRevision: draft.revision, sourceReferences }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, stageEvidenceId: published.id, stage: lifecycle.stage, evidenceVersion, publishedByUserId: actor.id, publishedAt: now.toISOString(), sourceReferences } };
      });
    },
    transition(command: EnterpriseCommandCommitInput, actor: AuthenticatedUser, data: { toStage: ShopReconStageCode; facts: Record<string, boolean>; overrideId: string | null; reason: string }, now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: orderInclude() });
        const lifecycle = order?.shopReconLifecycle;
        if (!order || !lifecycle) throw new Error("Save the current stage before completing it.");
        const draft = await tx.shopReconStageDraft.findFirst({ where: { lifecycleId: lifecycle.id, stage: lifecycle.stage, scopeVersion: lifecycle.scopeVersion }, orderBy: { revision: "desc" } });
        if (!draft) throw new Error("Save the current stage before completing it.");
        const stageOrder = SHOP_RECON_STAGES.find(item => item.code === lifecycle.stage)?.order ?? 99;
        if (stageOrder <= 7) {
          const latestEvidence = lifecycle.stageEvidence.find(item => item.stage === lifecycle.stage && item.scopeVersion === lifecycle.scopeVersion);
          const evidencePayload = draftRecord(latestEvidence?.payload);
          if (!latestEvidence || evidencePayload.draftId !== draft.id) throw new Error("Publish operational evidence from the latest saved draft before completing this stage.");
        }
        const blockers = Array.isArray(lifecycle.blockerCodes) ? lifecycle.blockerCodes.filter((code): code is string => typeof code === "string") : [];
        if (blockers.includes("BLK-SAFE-MOVEMENT_RESTRICTED")) throw new Error("Stage completion blocked: BLK-SAFE-MOVEMENT_RESTRICTED. Publish a cleared safety triage before moving the vehicle.");
        const override = data.overrideId ? await tx.shopReconOverride.findFirst({ where: { id: data.overrideId, lifecycleId: lifecycle.id } }) : null;
        const facts = authoritativeFacts(order, lifecycle, draft), decision = evaluateGovernedTransition({ actor, fromStage: lifecycle.stage, toStage: data.toStage, facts, draft, override, now });
        if (!decision.allowed) throw new Error(`Stage completion blocked: ${decision.blockerCodes.join(", ")}.`);
        if (lifecycle.stage === "QC_RELEASE_READINESS") {
          const jobs = order.repairJobs.filter(job => job.status !== "CANCELLED");
          if (!jobs.length || jobs.some(job => job.status !== "QC_PASSED" || job.qualityInspections[0]?.disposition !== "PASSED")) throw new Error("Failed or incomplete QC cannot be overridden. Every repair job must pass a fresh QC inspection.");
        }
        const final = data.toStage === "HANDOFF_SHOP_EXIT" && Boolean(order.releaseAuthorization), state = final ? "CLOSED" : "ACTIVE", next = await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { stage: data.toStage, operatingState: state, stageStartedAt: now, zoneCode: SHOP_RECON_ZONE_BY_STAGE[data.toStage], targetAt: targetAt(data.toStage, now, order.targetAt), nextAction: nextAction(data.toStage), blockerCodes: toJson([]), version } });
        if (data.toStage === "REPAIR_EXECUTION") await tx.shopReconScopeChange.updateMany({ where: { lifecycleId: lifecycle.id, status: "SUBMITTED" }, data: { status: "RESOLVED", resolvedByUserId: actor.id, resolvedAt: now, resolutionReference: `Lifecycle transition v${version}; current plan and authorization gates passed.` } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "STAGE_COMPLETED", fromStage: lifecycle.stage, toStage: data.toStage, fromOperatingState: lifecycle.operatingState, toOperatingState: state, scopeVersion: lifecycle.scopeVersion, actorUserId: actor.id, overrideAuthorizedById: override?.authorizedByUserId, reason: data.reason, payload: toJson({ draftId: draft.id, draftRevision: draft.revision, decision }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, fromStage: lifecycle.stage, toStage: next.stage, operatingState: next.operatingState, targetAt: next.targetAt.toISOString() } };
      });
    },
    grantOverride(command: EnterpriseCommandCommitInput, actor: AuthenticatedUser, data: { kind: string; reason: string; boundaries: string[]; expiresAt: Date | null; followUpAt: Date | null }, now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: orderInclude() }), lifecycle = order?.shopReconLifecycle;
        if (!order || !lifecycle) throw new Error("Save the current stage before creating an override.");
        const override = await tx.shopReconOverride.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, stage: lifecycle.stage, kind: data.kind, authorizedByUserId: actor.id, reason: data.reason, boundaries: toJson(data.boundaries), expiresAt: data.expiresAt, followUpAt: data.followUpAt } });
        await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { version } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "OVERRIDE_GRANTED", fromStage: lifecycle.stage, toStage: lifecycle.stage, fromOperatingState: lifecycle.operatingState, toOperatingState: lifecycle.operatingState, scopeVersion: lifecycle.scopeVersion, actorUserId: actor.id, overrideAuthorizedById: actor.id, reason: data.reason, payload: toJson({ overrideId: override.id, kind: data.kind, boundaries: data.boundaries, expiresAt: data.expiresAt, followUpAt: data.followUpAt }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, overrideId: override.id, kind: override.kind, authorizedByUserId: actor.id } };
      });
    },
    submitScopeChange(command: EnterpriseCommandCommitInput, actor: AuthenticatedUser, data: { finding: string; affectedRepairJobIds: string[]; originalScope: Record<string, unknown>; proposedScope: Record<string, unknown>; reason: string }, now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: orderInclude() }), lifecycle = order?.shopReconLifecycle;
        if (!order || !lifecycle) throw new Error("Save the current stage before submitting a scope change.");
        if (data.affectedRepairJobIds.some(id => !order.repairJobs.some(job => job.id === id))) throw new Error("Affected repair jobs must belong to this repair order.");
        const affectedRepairJobIds = data.affectedRepairJobIds.length ? data.affectedRepairJobIds : order.repairJobs.filter(job => ["DISPATCHED", "IN_PROGRESS", "PAUSED", "READY_FOR_REPAIR"].includes(job.status)).map(job => job.id);
        const scopeVersion = lifecycle.scopeVersion + 1;
        const scope = await tx.shopReconScopeChange.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, version: scopeVersion, status: "SUBMITTED", discoveredAtStage: lifecycle.stage, returnStage: "REPAIR_EXECUTION", finding: data.finding, affectedRepairJobIds: toJson(affectedRepairJobIds), originalScope: toJson(data.originalScope), proposedScope: toJson(data.proposedScope), submittedByUserId: actor.id, submittedAt: now } });
        await tx.repairJob.updateMany({ where: { id: { in: affectedRepairJobIds }, repairOrderId: order.id, status: { in: ["DISPATCHED", "IN_PROGRESS", "PAUSED", "READY_FOR_REPAIR"] } }, data: { status: "PAUSED", executionBlockerReason: `Scope change v${scopeVersion}: ${data.finding}`, version: { increment: 1 } } });
        const next = await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { stage: "FINDINGS_VERIFICATION", operatingState: "BLOCKED", stageStartedAt: now, zoneCode: SHOP_RECON_ZONE_BY_STAGE.FINDINGS_VERIFICATION, targetAt: targetAt("FINDINGS_VERIFICATION", now, order.targetAt), nextAction: "Verify the new finding, revise the plan, and obtain exact-version authorization before work resumes.", blockerCodes: toJson(["BLK-SCOPE-CHANGED"]), version, scopeVersion } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "SCOPE_CHANGE_SUBMITTED", fromStage: lifecycle.stage, toStage: "FINDINGS_VERIFICATION", fromOperatingState: lifecycle.operatingState, toOperatingState: "BLOCKED", scopeVersion, actorUserId: actor.id, reason: data.reason, payload: toJson({ scopeChangeId: scope.id, finding: data.finding, affectedRepairJobIds, returnStage: "REPAIR_EXECUTION" }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, scopeChangeId: scope.id, scopeVersion, stage: next.stage, operatingState: next.operatingState } };
      });
    },
  };
}

export type ShopReconLifecycleRepository = ReturnType<typeof createShopReconLifecycleRepository>;
