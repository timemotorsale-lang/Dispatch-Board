import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import type { AuthenticatedUser } from "@/server/auth/store";
import { addShopStaffedMinutes, SHOP_RECON_STAGES, SHOP_RECON_TARGETS, type ShopReconStageCode } from "./foundation";
import { deriveShopReconStage, SHOP_RECON_ZONE_BY_STAGE } from "./workflow";
import { canCompleteShopReconStage, evaluateDraftCompletion, evaluateGovernedTransition } from "./policy";
import { getShopReconStageWorkspace } from "./stage-workspace";
import type { ShopReconWorkLane } from "./operational-workspace";

type DraftData = { checklist: Record<string, boolean>; formData: Record<string, unknown>; evidence: string[]; reason: string };

function orderInclude() {
  return { serviceVisit: true, inventoryUnit: { select: { id: true, lifecycleStage: true } }, inspectionVersions: { orderBy: { version: "desc" as const }, take: 1 }, diagnosisVersions: { orderBy: { version: "desc" as const }, take: 1 }, estimateVersions: { orderBy: { version: "desc" as const }, take: 3, include: { authorizations: { orderBy: { decidedAt: "desc" as const } } } }, releaseAuthorization: true, deliveryReadinessEvaluations: { orderBy: { version: "desc" as const }, take: 1 }, repairJobs: { where: { status: { not: "CANCELLED" as const } }, include: { partDemands: true, laborClocks: true, laborEvents: { orderBy: { occurredAt: "desc" as const } }, dispatches: { orderBy: { createdAt: "desc" as const }, include: { technicianUser: { select: { id: true, name: true } }, bayResource: { select: { id: true, code: true, name: true } } } }, qualityInspections: { orderBy: { version: "desc" as const }, take: 1 } } }, shopReconLifecycle: { include: { drafts: { orderBy: { savedAt: "desc" as const } }, events: { orderBy: { sequence: "desc" as const }, take: 100 }, overrides: { orderBy: { createdAt: "desc" as const }, take: 20 }, scopeChanges: { orderBy: { version: "desc" as const }, take: 20 }, stageEvidence: { orderBy: { publishedAt: "desc" as const }, take: 100 } } } };
}

function nextAction(stage: ShopReconStageCode) { return getShopReconStageWorkspace(stage).purpose; }
function targetAt(stage: ShopReconStageCode, now: Date, fallback: Date) { const minutes = SHOP_RECON_TARGETS.stageMinutes[stage]; return minutes == null ? fallback : addShopStaffedMinutes(now, minutes); }
function draftRecord(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function draftText(form: Record<string, unknown>, key: string, label: string) { const value = typeof form[key] === "string" ? form[key].trim() : ""; if (!value) throw new Error(`${label} is required before operational evidence can be published.`); return value; }
function draftNumber(form: Record<string, unknown>, key: string, label: string) { const value = Number(form[key]); if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`); return Math.round(value); }
function draftMoneyCents(form: Record<string, unknown>, key: string, label: string) { const value = Number(form[key]); if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative amount.`); return Math.round(value * 100); }
function workLane(origin: string): ShopReconWorkLane { return origin === "INVENTORY_RECON" ? "INVENTORY_RECON" : "CUSTOMER_REPAIR"; }
type FactOrder = { id: string; vehicleId: string; serviceVisit: { keysReceivedCount: number }; origin: string; inspectionVersions: unknown[]; diagnosisVersions: unknown[]; estimateVersions: Array<{ id: string; version: number; authorizations: Array<{ id: string; disposition: string }> }>; repairJobs: Array<{ id: string; version: number; status: string; partsRequired: boolean; procedureVersionId: string | null; executionEvidence: unknown; partDemands: Array<{ id: string; quantityReserved: number; quantityRequired: number }>; dispatches: Array<{ id: string; version: number; status: string; bayResourceId: string | null }>; qualityInspections: Array<{ id: string; version: number; disposition: string; roadTestOutcome: string }> }>; releaseAuthorization: { id: string } | null };
type FactLifecycle = { stage: ShopReconStageCode; scopeVersion: number; events: Array<{ eventType: string; fromStage: ShopReconStageCode | null }>; stageEvidence: Array<{ stage: ShopReconStageCode; scopeVersion: number; payload: unknown }> };
function authoritativeFacts(order: FactOrder, lifecycle: FactLifecycle) {
  const published = new Set(lifecycle.stageEvidence.filter(evidence => evidence.scopeVersion === lifecycle.scopeVersion).map(evidence => evidence.stage));
  const stagePayload = (stage: ShopReconStageCode) => draftRecord(lifecycle.stageEvidence.find(evidence => evidence.stage === stage && evidence.scopeVersion === lifecycle.scopeVersion)?.payload);
  const plan = stagePayload("FINDINGS_REPAIR_PLAN"), authorizationEvidence = stagePayload("AUTHORIZATION"), readiness = stagePayload("PARTS_RESOURCE_READINESS"), dispatch = stagePayload("DISPATCH_WORK_STAGING"), execution = stagePayload("REPAIR_EXECUTION"), technicianSignoff = stagePayload("TECHNICIAN_COMPLETION"), quality = stagePayload("QUALITY_CONTROL_ROAD_TEST"), releaseReadiness = stagePayload("RELEASE_HANDOVER_READINESS");
  const jobs = order.repairJobs, latestInspections = jobs.map(job => job.qualityInspections[0]).filter((inspection): inspection is { id: string; version: number; disposition: string; roadTestOutcome: string } => Boolean(inspection));
  const latestEstimate = order.estimateVersions[0], latestAuthorization = latestEstimate?.authorizations[0];
  const authorized = Boolean(latestAuthorization && ["ACCEPTED", "PARTIAL"].includes(latestAuthorization.disposition) && authorizationEvidence.estimateId === latestEstimate.id && authorizationEvidence.authorizationId === latestAuthorization.id);
  const jobVersions = draftRecord(readiness.jobVersions), currentJobsMatch = jobs.length > 0 && jobs.every(job => jobVersions[job.id] === job.version);
  const partReservations = draftRecord(readiness.partReservations), currentPartsMatch = jobs.flatMap(job => job.partDemands).every(demand => { const snapshot = draftRecord(partReservations[demand.id]); return snapshot.quantityRequired === demand.quantityRequired && snapshot.quantityReserved === demand.quantityReserved; });
  const dispatchVersions = draftRecord(dispatch.dispatchVersions), currentDispatchesMatch = jobs.every(job => job.dispatches.some(record => dispatchVersions[record.id] === record.version && ["STAGED", "ACTIVE", "COMPLETED"].includes(record.status)));
  const executionJobVersions = draftRecord(execution.jobVersions), executionCurrent = jobs.length > 0 && jobs.every(job => executionJobVersions[job.id] === job.version);
  const signoffJobVersions = draftRecord(technicianSignoff.jobVersions), signoffCurrent = jobs.length > 0 && jobs.every(job => signoffJobVersions[job.id] === job.version);
  const qcVersions = draftRecord(quality.qcVersions), qcCurrent = jobs.length > 0 && jobs.every(job => { const inspection = job.qualityInspections[0]; return inspection && qcVersions[inspection.id] === inspection.version && inspection.disposition === "PASSED"; });
  return {
    JOB_INTAKE_COMPLETE: published.has("SERVICE_RECON_JOB_INTAKE"), JOB_SCOPE_DEFINED: published.has("JOB_SCOPE_DEFINITION"), WORK_ORDER_CREATED: published.has("WORK_ORDER_CREATION") && Boolean(order.id),
    IDENTITY_MATCHED: published.has("VEHICLE_INTAKE_CUSTODY") && Boolean(order.vehicleId), CUSTODY_ACCEPTED: published.has("VEHICLE_INTAKE_CUSTODY") && (order.serviceVisit?.keysReceivedCount ?? 0) > 0, SAFETY_TRIAGED: published.has("SAFETY_MOBILITY_TRIAGE"),
    INSPECTION_COMPLETE: published.has("INSPECTION_CONCERN_VERIFICATION") && Boolean(order.inspectionVersions?.length), DIAGNOSIS_COMPLETE: published.has("DIAGNOSIS") && Boolean(order.diagnosisVersions?.length), PLAN_CURRENT: published.has("FINDINGS_REPAIR_PLAN") && Boolean(latestEstimate) && plan.estimateId === latestEstimate.id && plan.estimateVersion === latestEstimate.version, AUTHORIZATION_CURRENT: published.has("AUTHORIZATION") && authorized,
    PARTS_READY: published.has("PARTS_RESOURCE_READINESS") && readiness.partsReady === true && currentJobsMatch && currentPartsMatch, TECHNICIAN_ELIGIBLE: published.has("PARTS_RESOURCE_READINESS") && readiness.technicianEligible === true && currentJobsMatch, BAY_ELIGIBLE: published.has("PARTS_RESOURCE_READINESS") && readiness.bayEligible === true && currentJobsMatch, PROCEDURE_CURRENT: published.has("PARTS_RESOURCE_READINESS") && readiness.procedureCurrent === true && currentJobsMatch, DISPATCH_READY: published.has("DISPATCH_WORK_STAGING") && dispatch.dispatchReady === true && currentJobsMatch, DISPATCH_CONFIRMED: published.has("DISPATCH_WORK_STAGING") && dispatch.dispatchConfirmed === true && currentDispatchesMatch,
    EXECUTION_COMPLETE: published.has("REPAIR_EXECUTION") && execution.executionComplete === true && executionCurrent && jobs.every(job => ["READY_FOR_QC", "QC_PASSED"].includes(job.status)), COMPLETION_EVIDENCE: published.has("REPAIR_EXECUTION") && execution.completionEvidence === true && executionCurrent && jobs.every(job => Array.isArray(job.executionEvidence) && job.executionEvidence.length > 0), TECHNICIAN_SIGNOFF: published.has("TECHNICIAN_COMPLETION") && technicianSignoff.technicianSignoff === true && signoffCurrent, QC_PASSED: published.has("QUALITY_CONTROL_ROAD_TEST") && quality.qcPassed === true && qcCurrent && jobs.every(job => job.status === "QC_PASSED"), ROAD_TEST_PASSED_OR_NOT_REQUIRED: published.has("QUALITY_CONTROL_ROAD_TEST") && qcCurrent && latestInspections.length === jobs.length && latestInspections.every(inspection => ["PASSED", "NOT_REQUIRED"].includes(inspection.roadTestOutcome)), RELEASE_READY: published.has("RELEASE_HANDOVER_READINESS") && releaseReadiness.releaseReady === true, HANDOFF_ACCEPTED: Boolean(order.releaseAuthorization) && releaseReadiness.releaseAuthorizationId === order.releaseAuthorization?.id,
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
        if (stageOrder > 16) throw new Error("The Shop stage is outside the governed 16-stage lifecycle.");
        const authority = canCompleteShopReconStage(actor, lifecycle.stage);
        if (!authority.allowed) throw new Error(`${authority.authority} is required to publish this stage's operational evidence.`);
        const draft = await tx.shopReconStageDraft.findFirst({ where: { lifecycleId: lifecycle.id, stage: lifecycle.stage, scopeVersion: lifecycle.scopeVersion }, orderBy: { revision: "desc" } });
        if (!draft) throw new Error("Save the current stage before publishing operational evidence.");
        const completion = evaluateDraftCompletion(lifecycle.stage, draft, workLane(order.origin));
        if (!completion.complete) throw new Error("Complete every required checklist item, form field, and evidence reference before publishing operational evidence.");
        const form = draftRecord(draft.formData), evidenceReferences = Array.isArray(draft.evidence) ? draft.evidence.filter((item): item is string => typeof item === "string") : [], sourceReferences: Array<{ type: string; id: string; version?: number }> = [];
        let publishedOperatingState = lifecycle.operatingState;
        let payload: Record<string, unknown> = { ...form, evidenceReferences, draftId: draft.id, draftRevision: draft.revision };
        const vehicle = await tx.vehicle.findFirst({ where: { id: order.vehicleId, organizationId: command.organizationId }, select: { id: true, vin: true, vehicleNumber: true } });
        if (!vehicle) throw new Error("The canonical vehicle record was not found.");
        if (lifecycle.stage === "SERVICE_RECON_JOB_INTAKE") {
          const expectedLane = order.origin === "INVENTORY_RECON" ? "Inventory Recon" : "Customer Repair", lane = typeof form.workLane === "string" && form.workLane.trim() ? form.workLane.trim() : expectedLane;
          if (lane !== expectedLane) throw new Error(`The selected lane conflicts with the repair order. Expected ${expectedLane}.`);
          const observed = draftText(form, "vehicleIdentifier", "Vehicle identifier").replace(/[^A-Z0-9]/gi, "").toUpperCase(), expected = [vehicle.vin, vehicle.vehicleNumber, order.repairOrderNumber].filter(Boolean).map(value => String(value).replace(/[^A-Z0-9]/gi, "").toUpperCase());
          if (!expected.includes(observed)) throw new Error("The selected vehicle does not match the VIN, vehicle number, or repair order.");
          payload = { ...payload, canonicalVehicleId: vehicle.id, repairOrderOrigin: order.origin, intakeComplete: true, handoffVerified: order.origin === "INVENTORY_RECON", sourceInventoryStage: form.inventoryStage ?? order.inventoryUnit?.lifecycleStage ?? null };
          sourceReferences.push({ type: "VEHICLE", id: vehicle.id }, { type: "REPAIR_ORDER", id: order.id, version: order.version });
        } else if (lifecycle.stage === "JOB_SCOPE_DEFINITION") {
          payload = { ...payload, jobScopeDefined: true, scopeVersion: lifecycle.scopeVersion };
          sourceReferences.push({ type: "REPAIR_ORDER", id: order.id, version: order.version });
        } else if (lifecycle.stage === "WORK_ORDER_CREATION") {
          const reference = draftText(form, "repairOrderReference", "Repair order").replace(/[^A-Z0-9]/gi, "").toUpperCase(), expected = [order.id, order.repairOrderNumber].map(value => value.replace(/[^A-Z0-9]/gi, "").toUpperCase());
          if (!expected.includes(reference)) throw new Error("The work-order reference must match the authoritative repair order.");
          if (draftNumber(form, "scopeVersion", "Scope version") !== lifecycle.scopeVersion) throw new Error(`The work order must bind to current scope version ${lifecycle.scopeVersion}.`);
          payload = { ...payload, workOrderCreated: true, repairOrderId: order.id, repairOrderVersion: order.version, scopeVersion: lifecycle.scopeVersion };
          sourceReferences.push({ type: "REPAIR_ORDER", id: order.id, version: order.version });
        } else if (lifecycle.stage === "VEHICLE_INTAKE_CUSTODY") {
          const observed = draftText(form, "observedIdentifier", "Observed vehicle identifier").replace(/[^A-Z0-9]/gi, "").toUpperCase(), expected = [vehicle.vin, vehicle.vehicleNumber, order.repairOrderNumber].filter(Boolean).map(value => String(value).replace(/[^A-Z0-9]/gi, "").toUpperCase());
          if (!expected.includes(observed)) throw new Error("Observed vehicle identity does not match the VIN, vehicle number, or repair order.");
          const keyCount = draftNumber(form, "keyCount", "Keys received"), keyTag = draftText(form, "keyTag", "Key tag"); if (keyCount < 1) throw new Error("At least one key is required to accept Shop custody.");
          await tx.serviceVisit.update({ where: { id: order.serviceVisit.id }, data: { keysReceivedCount: keyCount, keyTag, intakeNotes: draftText(form, "intakeNotes", "Intake notes") } });
          const custody = await tx.vehicleCustodyEvent.create({ data: { organizationId: command.organizationId, vehicleId: order.vehicleId, locationId: order.locationId, eventType: "CHECK_IN", custodianType: "SHOP_USER", custodianId: actor.id, positionLabel: draftText(form, "custodyLocation", "Custody location"), occurredAt: now, sourceCode: "SHOP_RECON_STAGE_4", sourceReference: order.id, reason, recordedByUserId: actor.id } });
          payload = { ...payload, canonicalVehicleId: vehicle.id, keyCount, keyTag, identityMatched: true, custodyAccepted: true, custodyEventId: custody.id };
          sourceReferences.push({ type: "VEHICLE", id: vehicle.id }, { type: "SERVICE_VISIT", id: order.serviceVisit.id }, { type: "VEHICLE_CUSTODY_EVENT", id: custody.id });
        } else if (lifecycle.stage === "SAFETY_MOBILITY_TRIAGE") {
          const mobility = draftText(form, "mobility", "Vehicle mobility"), hazards = draftText(form, "hazards", "Observed hazards"), priority = draftText(form, "priority", "Operational priority"), restricted = mobility === "Do not move";
          payload = { ...payload, mobility, hazards, priority, safetyTriaged: true, movementRestricted: restricted };
          const existingBlockers = Array.isArray(lifecycle.blockerCodes) ? lifecycle.blockerCodes.filter((code): code is string => typeof code === "string" && code !== "BLK-SAFE-MOVEMENT_RESTRICTED") : [];
          const blockerCodes = restricted ? [...existingBlockers, "BLK-SAFE-MOVEMENT_RESTRICTED"] : existingBlockers;
          publishedOperatingState = blockerCodes.length ? "BLOCKED" : "ACTIVE";
          await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { operatingState: publishedOperatingState, zoneCode: restricted ? "Z12_QUARANTINE" : SHOP_RECON_ZONE_BY_STAGE.SAFETY_MOBILITY_TRIAGE, blockerCodes: toJson(blockerCodes), nextAction: restricted ? "Resolve the movement restriction and obtain qualified safety clearance before moving the vehicle." : nextAction("SAFETY_MOBILITY_TRIAGE") } });
          sourceReferences.push({ type: "REPAIR_ORDER", id: order.id, version: order.version });
        } else if (lifecycle.stage === "INSPECTION_CONCERN_VERIFICATION") {
          const templateCode = draftText(form, "inspectionTemplate", "Inspection template").replace(/[^A-Z0-9]+/gi, "_").toUpperCase(), odometer = draftNumber(form, "odometer", "Observed odometer"), summary = draftText(form, "inspectionSummary", "Inspection summary"), latest = order.inspectionVersions[0];
          const inspection = await tx.vehicleInspectionVersion.create({ data: { organizationId: command.organizationId, repairOrderId: order.id, version: (latest?.version ?? 0) + 1, status: "COMPLETED", templateCode, templateVersion: 1, templateSnapshot: toJson({ code: templateCode, source: "SHOP_RECON_STAGE_6", checklist: getShopReconStageWorkspace("INSPECTION_CONCERN_VERIFICATION").checklist }), items: toJson(getShopReconStageWorkspace("INSPECTION_CONCERN_VERIFICATION").checklist.map((label, index) => ({ key: `item_${index + 1}`, label, result: "PASS", evidence: evidenceReferences }))), summary, authorUserId: actor.id, startedAt: lifecycle.stageStartedAt, completedAt: now, supersedesId: latest?.id } });
          const odometerRecord = await tx.vehicleOdometerObservation.create({ data: { organizationId: command.organizationId, vehicleId: order.vehicleId, reading: odometer, unit: "MILES", observedAt: now, sourceCode: "SHOP_RECON_INSPECTION", sourceReference: inspection.id, status: "ACCEPTED", recordedByUserId: actor.id } });
          payload = { ...payload, inspectionId: inspection.id, inspectionVersion: inspection.version, odometerObservationId: odometerRecord.id, inspectionComplete: true }; sourceReferences.push({ type: "VEHICLE_INSPECTION_VERSION", id: inspection.id, version: inspection.version }, { type: "ODOMETER_OBSERVATION", id: odometerRecord.id });
        } else if (lifecycle.stage === "DIAGNOSIS") {
          const confidence = draftText(form, "diagnosticConfidence", "Diagnostic confidence"), uncertainty = confidence === "High" ? "LOW" : confidence === "Medium" ? "MEDIUM" : "HIGH", latest = order.diagnosisVersions[0];
          const diagnosis = await tx.repairDiagnosisVersion.create({ data: { organizationId: command.organizationId, repairOrderId: order.id, version: (latest?.version ?? 0) + 1, concern: order.serviceVisit.concernSummary, symptoms: toJson([draftText(form, "findingReference", "Inspection finding or symptom")]), tests: toJson([{ name: draftText(form, "testPerformed", "Diagnostic test"), result: draftText(form, "testResult", "Diagnostic test result") }]), evidence: toJson(evidenceReferences), cause: draftText(form, "diagnosticConclusion", "Supported cause"), uncertainty, recommendation: draftText(form, "recommendation", "Technician recommendation"), proposedCorrection: draftText(form, "proposedCorrection", "Proposed correction"), technicianUserId: actor.id, diagnosedAt: now, supersedesId: latest?.id } });
          payload = { ...payload, diagnosisId: diagnosis.id, diagnosisVersion: diagnosis.version, diagnosisComplete: true, uncertainty }; sourceReferences.push({ type: "REPAIR_DIAGNOSIS_VERSION", id: diagnosis.id, version: diagnosis.version });
        } else if (lifecycle.stage === "FINDINGS_REPAIR_PLAN") {
          const disposition = draftText(form, "findingDisposition", "Finding disposition"); if (disposition !== "Verified") throw new Error("Only verified findings can be converted into a repair plan. Return-for-testing or changed-scope decisions must follow their controlled loop.");
          const diagnosis = order.diagnosisVersions[0]; if (!diagnosis) throw new Error("A current diagnosis is required before the repair plan can publish.");
          const estimate = order.estimateVersions[0];
          if (!estimate || estimate.status !== "PRESENTED") throw new Error("Create and present a current authoritative estimate in the Repair Workbench before publishing Stage 8.");
          if (estimate.expiresAt <= now) throw new Error("The latest estimate has expired and must be superseded before Stage 8 can publish.");
          const enteredAmountCents = draftMoneyCents(form, "estimateAmount", "Estimated total");
          if (enteredAmountCents !== estimate.totalCents) throw new Error(`The Stage 8 total must match authoritative estimate v${estimate.version}: $${(estimate.totalCents / 100).toFixed(2)}.`);
          const lines = Array.isArray(estimate.lineItems) ? estimate.lineItems.map(draftRecord) : [];
          const plannedMinutes = lines.reduce((sum, line) => sum + (Number.isFinite(Number(line.laborGuideMinutes)) ? Number(line.laborGuideMinutes) : 0), 0);
          if (draftNumber(form, "laborMinutes", "Labor guide minutes") !== plannedMinutes) throw new Error(`Stage 8 labor minutes must match authoritative estimate v${estimate.version}: ${plannedMinutes}.`);
          payload = { ...payload, diagnosisId: diagnosis.id, diagnosisVersion: diagnosis.version, findingsVerified: true, classification: draftText(form, "workClassification", "Work classification"), estimateId: estimate.id, estimateVersion: estimate.version, estimateTotalCents: estimate.totalCents, plannedMinutes, plannedCorrection: draftText(form, "plannedCorrection", "Planned correction"), planCurrent: true };
          sourceReferences.push({ type: "REPAIR_DIAGNOSIS_VERSION", id: diagnosis.id, version: diagnosis.version }, { type: "REPAIR_ESTIMATE_VERSION", id: estimate.id, version: estimate.version });
        } else if (lifecycle.stage === "AUTHORIZATION") {
          const estimate = order.estimateVersions[0], authorization = estimate?.authorizations[0];
          if (!estimate || !authorization) throw new Error("Record an attributable decision on the exact current estimate before publishing Stage 9.");
          const decisionMap: Record<string, string> = { Accepted: "ACCEPTED", "Partially accepted": "PARTIAL", Declined: "DECLINED" };
          const draftDecision = draftText(form, "decision", "Authorization decision"), expectedDisposition = decisionMap[draftDecision];
          if (!expectedDisposition) throw new Error("Pending authorization cannot be published as a completed Stage 9 decision.");
          if (authorization.disposition !== expectedDisposition) throw new Error(`The Stage 9 decision does not match the authoritative ${authorization.disposition.toLowerCase()} authorization.`);
          const approvedAmountCents = draftMoneyCents(form, "approvedAmount", "Approved amount");
          if (approvedAmountCents !== authorization.authorizedAmountCents) throw new Error(`The approved amount must match the exact authorization: $${(authorization.authorizedAmountCents / 100).toFixed(2)}.`);
          payload = { ...payload, estimateId: estimate.id, estimateVersion: estimate.version, authorizationId: authorization.id, authorizationDisposition: authorization.disposition, authorizedAmountCents: authorization.authorizedAmountCents, authorizationReference: draftText(form, "authorizationReference", "Authorization reference"), authorizationCurrent: ["ACCEPTED", "PARTIAL"].includes(authorization.disposition) };
          sourceReferences.push({ type: "REPAIR_ESTIMATE_VERSION", id: estimate.id, version: estimate.version }, { type: "REPAIR_AUTHORIZATION", id: authorization.id });
        } else if (lifecycle.stage === "PARTS_RESOURCE_READINESS") {
          const jobs = order.repairJobs;
          if (!jobs.length) throw new Error("Create authorized repair jobs in the Repair Workbench before publishing Stage 10.");
          const partsReady = jobs.every(job => !job.partsRequired || (job.partDemands.length > 0 && job.partDemands.every(demand => demand.quantityReserved >= demand.quantityRequired)));
          const partDisposition = draftText(form, "partsKit", "Parts kit");
          if (partsReady && partDisposition === "Partial") throw new Error("The authoritative Parts record is complete; update the Stage 10 parts-kit disposition.");
          if (!partsReady && ["Complete", "Not required"].includes(partDisposition)) throw new Error("The Parts record is not ready; resolve reservations or record the correct Stage 10 disposition.");
          const workTypeCodes = [...new Set(jobs.map(job => job.workTypeCode))];
          const procedures = await tx.workProcedureVersion.findMany({ where: { organizationId: command.organizationId, workTypeCode: { in: workTypeCodes }, status: "ACTIVE", effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }, orderBy: { version: "desc" } });
          const procedureCurrent = workTypeCodes.every(code => procedures.some(procedure => procedure.workTypeCode === code));
          const resources = await tx.schedulableResource.findMany({ where: { organizationId: command.organizationId, locationId: order.locationId, status: "ACTIVE", effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }, include: { resourceType: { select: { kind: true } } } });
          const technicianResources = resources.filter(resource => Boolean(resource.userId)), technicianIds = technicianResources.map(resource => resource.userId!).filter(Boolean);
          const qualifications = technicianIds.length ? await tx.technicianQualification.findMany({ where: { organizationId: command.organizationId, technicianUserId: { in: technicianIds }, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] } }) : [];
          const technicianEligible = jobs.every(job => technicianIds.some(technicianId => { const active = qualifications.filter(item => item.technicianUserId === technicianId), skills = new Set(active.filter(item => item.type === "SKILL").map(item => item.code)), certifications = new Set(active.filter(item => item.type === "CERTIFICATION").map(item => item.code)); return (job.requiredSkills as string[]).every(code => skills.has(code)) && (job.requiredCertifications as string[]).every(code => certifications.has(code)); }));
          const shopResources = resources.flatMap(resource => [resource.code.toUpperCase(), resource.name.toUpperCase()]), bayResources = resources.filter(resource => resource.resourceType.kind === "SERVICE_BAY");
          const bayEligible = jobs.every(job => { const requirements = [...(job.bayRequirements as string[]), ...(job.toolRequirements as string[])].map(value => value.toUpperCase()); return bayResources.length > 0 && requirements.every(requirement => shopResources.some(label => label.includes(requirement) || requirement.includes(label))); });
          payload = { ...payload, repairJobIds: jobs.map(job => job.id), jobVersions: Object.fromEntries(jobs.map(job => [job.id, job.version])), partReservations: Object.fromEntries(jobs.flatMap(job => job.partDemands).map(demand => [demand.id, { quantityRequired: demand.quantityRequired, quantityReserved: demand.quantityReserved }])), partsReady, procedureCurrent, technicianEligible, bayEligible, procedureIds: procedures.map(procedure => procedure.id), candidateTechnicianIds: technicianIds, candidateBayIds: bayResources.map(resource => resource.id), resourceNotes: draftText(form, "resourceNotes", "Resource notes") };
          jobs.forEach(job => sourceReferences.push({ type: "REPAIR_JOB", id: job.id, version: job.version }));
          procedures.forEach(procedure => sourceReferences.push({ type: "WORK_PROCEDURE_VERSION", id: procedure.id, version: procedure.version }));
        } else if (lifecycle.stage === "DISPATCH_WORK_STAGING") {
          const readinessEvidence = lifecycle.stageEvidence.find(item => item.stage === "PARTS_RESOURCE_READINESS" && item.scopeVersion === lifecycle.scopeVersion), readinessPayload = draftRecord(readinessEvidence?.payload);
          if (!["partsReady", "procedureCurrent", "technicianEligible", "bayEligible"].every(key => readinessPayload[key] === true)) throw new Error("Stage 10 Parts and Resource Readiness must be current and fully clear before Stage 11 can publish.");
          const activeWip = await tx.repairJobDispatch.count({ where: { organizationId: command.organizationId, locationId: order.locationId, status: { in: ["STAGED", "ACTIVE"] } } });
          const wipOverride = lifecycle.overrides.find(record => record.kind === "WIP_LIMIT" && (!record.expiresAt || record.expiresAt > now));
          if (activeWip >= 2 && !wipOverride) throw new Error("The two-bay Shop WIP limit is full. Dispatch readiness must wait for capacity or a governed General Manager exception.");
          const jobs = order.repairJobs, openDispatches = jobs.flatMap(job => job.dispatches.filter(dispatch => ["STAGED", "ACTIVE"].includes(dispatch.status)));
          if (!jobs.length || jobs.some(job => !job.dispatches.some(dispatch => ["STAGED", "ACTIVE"].includes(dispatch.status)))) throw new Error("Every active repair job requires a governed staged or active dispatch before Stage 11 can publish.");
          const technician = draftText(form, "technician", "Assigned technician"), bay = draftText(form, "bay", "Assigned bay"), scheduledStart = new Date(draftText(form, "scheduledStart", "Scheduled start"));
          if (Number.isNaN(scheduledStart.getTime())) throw new Error("Scheduled start must be a valid date.");
          if (technician === "Walter Hernandez" && !openDispatches.some(dispatch => dispatch.technicianUser.name.toLowerCase().startsWith("walter hernandez"))) throw new Error("The card names Walter Hernandez, but the authoritative dispatch does not.");
          if (!openDispatches.some(dispatch => dispatch.bayResource && [dispatch.bayResource.name, dispatch.bayResource.code].some(label => label.toLowerCase().includes(bay.toLowerCase().replace("bay ", "")) || label.toLowerCase().includes(bay.toLowerCase())))) throw new Error("The selected bay does not match an authoritative active dispatch.");
          payload = { ...payload, dispatchReady: true, dispatchConfirmed: true, activeWip, wipLimit: 2, wipOverrideId: wipOverride?.id ?? null, readinessEvidenceId: readinessEvidence!.id, repairJobIds: jobs.map(job => job.id), dispatchIds: openDispatches.map(dispatch => dispatch.id), dispatchVersions: Object.fromEntries(openDispatches.map(dispatch => [dispatch.id, dispatch.version])), technicianUserIds: [...new Set(openDispatches.map(dispatch => dispatch.technicianUserId))], bayResourceIds: [...new Set(openDispatches.map(dispatch => dispatch.bayResourceId).filter(Boolean))], scheduledStartAt: scheduledStart.toISOString(), stagingNotes: draftText(form, "stagingNotes", "Staging confirmation") };
          sourceReferences.push({ type: "SHOP_RECON_STAGE_EVIDENCE", id: readinessEvidence!.id, version: readinessEvidence!.version });
          openDispatches.forEach(dispatch => sourceReferences.push({ type: "REPAIR_JOB_DISPATCH", id: dispatch.id, version: dispatch.version }));
        } else if (lifecycle.stage === "REPAIR_EXECUTION") {
          const jobs = order.repairJobs, status = draftText(form, "jobStatus", "Job status");
          if (!jobs.length) throw new Error("Repair execution requires at least one active repair job.");
          if (status === "Changed scope") throw new Error("Changed scope must use the controlled scope-change action so affected work stops and returns to Findings & Repair Plan.");
          if (!jobs.every(job => job.laborEvents.length > 0)) throw new Error("Every repair job requires an attributable labor event before Stage 12 can publish.");
          const executionComplete = jobs.every(job => ["READY_FOR_QC", "QC_PASSED"].includes(job.status) && job.laborClocks.length > 0 && job.laborClocks.every(clock => clock.state === "FINISHED"));
          const completionEvidence = executionComplete && jobs.every(job => Array.isArray(job.executionEvidence) && job.executionEvidence.length > 0);
          const canonicalStatus = executionComplete && completionEvidence
            ? "Complete for QC"
            : jobs.some(job => job.status === "PAUSED")
              ? "Paused"
              : jobs.some(job => job.status === "IN_PROGRESS")
                ? "In progress"
                : "Waiting";
          if (status !== canonicalStatus) throw new Error(`The Stage 12 job status must match the authoritative repair jobs: ${canonicalStatus}.`);
          payload = { ...payload, repairJobIds: jobs.map(job => job.id), jobVersions: Object.fromEntries(jobs.map(job => [job.id, job.version])), laborEventIds: jobs.flatMap(job => job.laborEvents.map(event => event.id)), laborClockVersions: Object.fromEntries(jobs.flatMap(job => job.laborClocks.map(clock => [clock.id, clock.version]))), executionComplete, completionEvidence, workPerformed: draftText(form, "workPerformed", "Work performed"), additionalFinding: draftText(form, "additionalFinding", "Additional finding or exception") };
          jobs.forEach(job => { sourceReferences.push({ type: "REPAIR_JOB", id: job.id, version: job.version }); job.laborEvents.forEach(event => sourceReferences.push({ type: "REPAIR_JOB_LABOR_EVENT", id: event.id })); });
        } else if (lifecycle.stage === "TECHNICIAN_COMPLETION") {
          const jobs = order.repairJobs, disposition = draftText(form, "completionDisposition", "Completion disposition");
          if (disposition !== "Complete for QC") throw new Error("Only Complete for QC can publish Stage 13. Partial or blocked work must remain in execution.");
          if (!jobs.length || jobs.some(job => !["READY_FOR_QC", "QC_PASSED"].includes(job.status) || !Array.isArray(job.executionEvidence) || !job.executionEvidence.length)) throw new Error("Every repair job must be technician-complete with execution evidence before Stage 13 can publish.");
          payload = { ...payload, technicianSignoff: true, repairJobIds: jobs.map(job => job.id), jobVersions: Object.fromEntries(jobs.map(job => [job.id, job.version])), finalMeasurements: draftText(form, "finalMeasurements", "Final measurements"), technicianNotes: draftText(form, "technicianNotes", "Technician completion notes") };
          jobs.forEach(job => sourceReferences.push({ type: "REPAIR_JOB", id: job.id, version: job.version }));
        } else if (lifecycle.stage === "QUALITY_CONTROL_ROAD_TEST") {
          const jobs = order.repairJobs, qcDisposition = draftText(form, "qcDisposition", "QC disposition"), roadTest = draftText(form, "roadTest", "Road test");
          if (qcDisposition !== "Pass") throw new Error("Failed or held QC cannot publish release readiness; the controlled rework loop must be resolved first.");
          const inspections = jobs.map(job => job.qualityInspections[0]);
          if (!jobs.length || inspections.some(inspection => !inspection || inspection.disposition !== "PASSED")) throw new Error("Every repair job must pass its latest independent QC inspection before Stage 14 can publish.");
          const expectedRoadTest = roadTest === "Passed" ? "PASSED" : roadTest === "Not required" ? "NOT_REQUIRED" : null;
          if (!expectedRoadTest || inspections.some(inspection => inspection!.roadTestOutcome !== expectedRoadTest)) throw new Error("The Stage 14 road-test disposition must match every latest QC inspection.");
          payload = { ...payload, qcPassed: true, qcVersions: Object.fromEntries(inspections.map(inspection => [inspection!.id, inspection!.version])), roadTestOutcome: expectedRoadTest, qcNotes: draftText(form, "qcNotes", "QC notes") };
          inspections.forEach(inspection => sourceReferences.push({ type: "REPAIR_QUALITY_INSPECTION", id: inspection!.id, version: inspection!.version }));
        } else if (lifecycle.stage === "RELEASE_HANDOVER_READINESS") {
          const release = order.releaseAuthorization, deliveryReadiness = order.deliveryReadinessEvaluations[0], destination = draftText(form, "releaseDestination", "Release destination"), expectedDestination = order.origin === "INVENTORY_RECON" ? "Inventory lifecycle" : "Service advisor / customer";
          if (!release) throw new Error("Release readiness requires a governed release authorization.");
          if (!deliveryReadiness || deliveryReadiness.disposition !== "READY" || deliveryReadiness.releaseAuthorizationId !== release.id) throw new Error("Release readiness requires a current READY delivery evaluation tied to the release authorization.");
          if (destination !== expectedDestination) throw new Error(`The release destination must follow the ${order.origin === "INVENTORY_RECON" ? "Inventory Recon" : "Customer Repair"} lane: ${expectedDestination}.`);
          const readyKeys = draftNumber(form, "keyCountReady", "Keys ready");
          if (readyKeys !== order.serviceVisit.keysReceivedCount) throw new Error(`Keys ready must reconcile to the ${order.serviceVisit.keysReceivedCount} keys accepted at intake.`);
          payload = { ...payload, releaseReady: true, releaseAuthorizationId: release.id, deliveryReadinessId: deliveryReadiness.id, deliveryReadinessVersion: deliveryReadiness.version, destination, readyKeys, finalCostCents: draftMoneyCents(form, "finalCost", "Final cost"), readinessNotes: draftText(form, "readinessNotes", "Readiness notes") };
          sourceReferences.push({ type: "REPAIR_RELEASE_AUTHORIZATION", id: release.id }, { type: "DELIVERY_READINESS_EVALUATION", id: deliveryReadiness.id, version: deliveryReadiness.version });
        } else if (lifecycle.stage === "VEHICLE_HANDOVER_SHOP_EXIT") {
          const release = order.releaseAuthorization, deliveryReadiness = order.deliveryReadinessEvaluations[0], destination = draftText(form, "handoffDestination", "Handoff destination"), expectedDestination = order.origin === "INVENTORY_RECON" ? "Inventory lifecycle" : "Service advisor / customer";
          if (!release) throw new Error("Shop exit requires a governed release authorization.");
          if (!deliveryReadiness || deliveryReadiness.disposition !== "READY" || deliveryReadiness.releaseAuthorizationId !== release.id) throw new Error("Shop exit requires a current READY delivery evaluation tied to the release authorization.");
          if (destination !== expectedDestination) throw new Error(`The handoff destination must follow the ${order.origin === "INVENTORY_RECON" ? "Inventory Recon" : "Customer Repair"} lane: ${expectedDestination}.`);
          const releasedKeys = draftNumber(form, "keyCountReleased", "Keys released");
          if (releasedKeys !== order.serviceVisit.keysReceivedCount) throw new Error(`Keys released must reconcile to the ${order.serviceVisit.keysReceivedCount} keys accepted at check-in.`);
          const existingCustody = await tx.vehicleCustodyEvent.findFirst({ where: { organizationId: command.organizationId, vehicleId: order.vehicleId, sourceCode: "SHOP_RECON_STAGE_16", sourceReference: order.id }, orderBy: { occurredAt: "desc" } });
          const custody = existingCustody ?? await tx.vehicleCustodyEvent.create({ data: { organizationId: command.organizationId, vehicleId: order.vehicleId, locationId: order.locationId, eventType: order.origin === "INVENTORY_RECON" ? "CHECK_OUT" : "CUSTOMER_DELIVERY", custodianType: order.origin === "INVENTORY_RECON" ? "INVENTORY_OPERATIONS" : "CUSTOMER_OR_ADVISOR", custodianId: order.origin === "INVENTORY_RECON" ? actor.id : null, positionLabel: order.origin === "INVENTORY_RECON" ? "INVENTORY_HANDOFF" : "CUSTOMER_DELIVERY", occurredAt: now, sourceCode: "SHOP_RECON_STAGE_16", sourceReference: order.id, reason, recordedByUserId: actor.id } });
          payload = { ...payload, shopExitRecorded: true, custodyEventId: custody.id, releaseAuthorizationId: release.id, deliveryReadinessId: deliveryReadiness.id, deliveryReadinessVersion: deliveryReadiness.version, destination, releasedKeys, receiverAcceptance: draftText(form, "receiverAcceptance", "Receiver acceptance") };
          sourceReferences.push({ type: "REPAIR_RELEASE_AUTHORIZATION", id: release.id }, { type: "DELIVERY_READINESS_EVALUATION", id: deliveryReadiness.id, version: deliveryReadiness.version }, { type: "VEHICLE_CUSTODY_EVENT", id: custody.id });
          if (order.inventoryUnit) sourceReferences.push({ type: "INVENTORY_UNIT", id: order.inventoryUnit.id });
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
        if (stageOrder <= 16) {
          const latestEvidence = lifecycle.stageEvidence.find(item => item.stage === lifecycle.stage && item.scopeVersion === lifecycle.scopeVersion);
          const evidencePayload = draftRecord(latestEvidence?.payload);
          if (!latestEvidence || evidencePayload.draftId !== draft.id) throw new Error("Publish operational evidence from the latest saved draft before completing this stage.");
        }
        const blockers = Array.isArray(lifecycle.blockerCodes) ? lifecycle.blockerCodes.filter((code): code is string => typeof code === "string") : [];
        if (blockers.includes("BLK-SAFE-MOVEMENT_RESTRICTED")) throw new Error("Stage completion blocked: BLK-SAFE-MOVEMENT_RESTRICTED. Publish a cleared safety triage before moving the vehicle.");
        const override = data.overrideId ? await tx.shopReconOverride.findFirst({ where: { id: data.overrideId, lifecycleId: lifecycle.id } }) : null;
        const facts = authoritativeFacts(order, lifecycle), decision = evaluateGovernedTransition({ actor, fromStage: lifecycle.stage, toStage: data.toStage, facts, draft, lane: workLane(order.origin), override, now });
        if (!decision.allowed) throw new Error(`Stage completion blocked: ${decision.blockerCodes.join(", ")}.`);
        if (lifecycle.stage === "QUALITY_CONTROL_ROAD_TEST") {
          const jobs = order.repairJobs.filter(job => job.status !== "CANCELLED");
          if (!jobs.length || jobs.some(job => job.status !== "QC_PASSED" || job.qualityInspections[0]?.disposition !== "PASSED")) throw new Error("Failed or incomplete QC cannot be overridden. Every repair job must pass a fresh QC inspection.");
        }
        const final = lifecycle.stage === "VEHICLE_HANDOVER_SHOP_EXIT" && data.toStage === "VEHICLE_HANDOVER_SHOP_EXIT";
        if (final) {
          const exitEvidence = lifecycle.stageEvidence.find(item => item.stage === "VEHICLE_HANDOVER_SHOP_EXIT" && item.scopeVersion === lifecycle.scopeVersion), exitPayload = draftRecord(exitEvidence?.payload);
          if (exitPayload.shopExitRecorded !== true) throw new Error("Shop exit cannot close until the physical custody handoff is published.");
        }
        const state = final ? "CLOSED" : "ACTIVE", next = await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { stage: data.toStage, operatingState: state, stageStartedAt: now, zoneCode: SHOP_RECON_ZONE_BY_STAGE[data.toStage], targetAt: targetAt(data.toStage, now, order.targetAt), nextAction: final ? "Shop custody handoff complete; continue the receiving Inventory or customer close workflow." : nextAction(data.toStage), blockerCodes: toJson([]), version } });
        if (data.toStage === "REPAIR_EXECUTION") await tx.shopReconScopeChange.updateMany({ where: { lifecycleId: lifecycle.id, status: "SUBMITTED" }, data: { status: "RESOLVED", resolvedByUserId: actor.id, resolvedAt: now, resolutionReference: `Lifecycle transition v${version}; current plan and authorization gates passed.` } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "STAGE_COMPLETED", fromStage: lifecycle.stage, toStage: data.toStage, fromOperatingState: lifecycle.operatingState, toOperatingState: state, scopeVersion: lifecycle.scopeVersion, actorUserId: actor.id, overrideAuthorizedById: override?.authorizedByUserId, reason: data.reason, payload: toJson({ draftId: draft.id, draftRevision: draft.revision, decision }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, fromStage: lifecycle.stage, toStage: next.stage, operatingState: next.operatingState, targetAt: next.targetAt.toISOString() } };
      });
    },
    returnToPartsReadiness(command: EnterpriseCommandCommitInput, actor: AuthenticatedUser, data: { reason: string }, now: Date) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop-recon", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: orderInclude() });
        const lifecycle = order?.shopReconLifecycle;
        if (!order || !lifecycle) throw new Error("Shop & Recon lifecycle was not found.");
        if (!(["DISPATCH_WORK_STAGING", "REPAIR_EXECUTION"] as ShopReconStageCode[]).includes(lifecycle.stage)) throw new Error("Parts readiness can only be reopened from Dispatch & Work Staging or Repair Execution.");

        const affectedJobs = order.repairJobs.filter(job => ["READY_FOR_REPAIR", "DISPATCHED", "IN_PROGRESS", "PAUSED"].includes(job.status));
        const affectedJobIds = affectedJobs.map(job => job.id);
        const runningClocks = affectedJobs.flatMap(job => job.laborClocks.filter(clock => clock.state === "RUNNING" && clock.lastResumedAt).map(clock => ({ ...clock, repairJobId: job.id })));
        const openDispatchIds = affectedJobs.flatMap(job => job.dispatches.filter(dispatch => ["STAGED", "ACTIVE"].includes(dispatch.status)).map(dispatch => dispatch.id));

        for (const clock of runningClocks) {
          const accruedMinutes = Math.max(0, Math.round((now.getTime() - clock.lastResumedAt!.getTime()) / 60_000));
          await tx.repairJobLaborClock.update({ where: { id: clock.id }, data: { state: "PAUSED", lastResumedAt: null, accumulatedMinutes: clock.accumulatedMinutes + accruedMinutes, version: { increment: 1 } } });
          await tx.repairJobLaborEvent.create({ data: { organizationId: command.organizationId, repairJobId: clock.repairJobId, technicianUserId: clock.technicianUserId, eventType: "PAUSE", occurredAt: now, reason: data.reason, correctionMinutes: null, approvedNonProductiveCode: null, actorUserId: actor.id, correlationId: command.correlationId } });
        }
        if (openDispatchIds.length) await tx.repairJobDispatch.updateMany({ where: { id: { in: openDispatchIds } }, data: { status: "CANCELLED", version: { increment: 1 } } });
        if (affectedJobIds.length) await tx.repairJob.updateMany({ where: { id: { in: affectedJobIds }, repairOrderId: order.id }, data: { status: "WAITING_PARTS", executionBlockerReason: data.reason, readinessReasonCodes: toJson(["JOB_AUTHORIZATION_VALID", "JOB_PARTS_NOT_READY", "PARTS_READINESS_RETURN"]), version: { increment: 1 } } });

        const next = await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { stage: "PARTS_RESOURCE_READINESS", operatingState: "WAITING", stageStartedAt: now, zoneCode: SHOP_RECON_ZONE_BY_STAGE.PARTS_RESOURCE_READINESS, targetAt: targetAt("PARTS_RESOURCE_READINESS", now, order.targetAt), nextAction: "Order or reserve the missing parts, confirm availability, then return to Dispatch & Work Staging to assign the technician.", blockerCodes: toJson(["BLK-WAITING_PARTS"]), version } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "STAGE_MOVED", fromStage: lifecycle.stage, toStage: "PARTS_RESOURCE_READINESS", fromOperatingState: lifecycle.operatingState, toOperatingState: "WAITING", scopeVersion: lifecycle.scopeVersion, actorUserId: actor.id, reason: data.reason, payload: toJson({ affectedRepairJobIds: affectedJobIds, cancelledDispatchIds: openDispatchIds, pausedLaborClockIds: runningClocks.map(clock => clock.id), returnReason: "PARTS_NOT_READY" }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, stage: next.stage, operatingState: next.operatingState, affectedRepairJobIds: affectedJobIds, cancelledDispatchIds: openDispatchIds, pausedLaborClockIds: runningClocks.map(clock => clock.id) } };
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
        const next = await tx.shopReconLifecycle.update({ where: { id: lifecycle.id }, data: { stage: "FINDINGS_REPAIR_PLAN", operatingState: "BLOCKED", stageStartedAt: now, zoneCode: SHOP_RECON_ZONE_BY_STAGE.FINDINGS_REPAIR_PLAN, targetAt: targetAt("FINDINGS_REPAIR_PLAN", now, order.targetAt), nextAction: "Verify the new finding, revise the plan, and obtain exact-version authorization before work resumes.", blockerCodes: toJson(["BLK-SCOPE-CHANGED"]), version, scopeVersion } });
        await tx.shopReconLifecycleEvent.create({ data: { organizationId: command.organizationId, lifecycleId: lifecycle.id, repairOrderId: order.id, sequence: version, eventType: "SCOPE_CHANGE_SUBMITTED", fromStage: lifecycle.stage, toStage: "FINDINGS_REPAIR_PLAN", fromOperatingState: lifecycle.operatingState, toOperatingState: "BLOCKED", scopeVersion, actorUserId: actor.id, reason: data.reason, payload: toJson({ scopeChangeId: scope.id, finding: data.finding, affectedRepairJobIds, returnStage: "REPAIR_EXECUTION" }), correlationId: command.correlationId, occurredAt: now } });
        return { previous: lifecycle, result: { lifecycleVersion: version, scopeChangeId: scope.id, scopeVersion, stage: next.stage, operatingState: next.operatingState } };
      });
    },
  };
}

export type ShopReconLifecycleRepository = ReturnType<typeof createShopReconLifecycleRepository>;
