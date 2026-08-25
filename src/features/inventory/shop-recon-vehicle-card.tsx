"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Activity, AlertTriangle, ArrowLeft, BookOpenCheck, Building2, Camera, CarFront, Check, CheckCircle2, Circle, ClipboardCheck, Clock3, FileText, FlaskConical, History, LockKeyhole, MapPin, Paperclip, PlayCircle, RotateCcw, Save, Search, ShieldCheck, UserRound, Wrench } from "lucide-react";
import Link from "next/link";

import { SHOP_RECON_STAGES, type ShopReconStageCode } from "@/server/shop-recon/foundation";
import { getShopReconOperationalWorkspace, type ShopReconOperationalSummaryField, type ShopReconOperationalTool } from "@/server/shop-recon/operational-workspace";
import { evaluateShopReconPilotProgress, type ShopReconPilotScenario } from "@/server/shop-recon/pilot";
import { getShopReconStageWorkspace, type ShopReconFormField } from "@/server/shop-recon/stage-workspace";
import { getShopReconStageHref } from "./shop-recon-navigation";
import { ShopReconParallelTitlePreparation, type TitlePreparationWorkspace } from "./shop-recon-parallel-title-preparation";

export type ShopReconVehicleCardModel = {
  id: string;
  vehicleId: string | null;
  vin: string | null;
  repairOrderNumber: string;
  workLane: "INVENTORY_RECON" | "CUSTOMER_REPAIR";
  workLaneLabel: string;
  commitmentLabel: string;
  authorizationPath: string;
  completionHandoff: string;
  inventoryLifecycleStage: string | null;
  shopLifecycleStage: ShopReconStageCode;
  shopLifecycleLabel: string;
  shopLifecycleOrder: number;
  shopZoneCode: string;
  stageTargetBand: string;
  stageElapsedMinutes: number;
  priorityScore: number;
  priorityBand: string;
  priorityReasons: ReadonlyArray<{ code: string; points: number }>;
  operatingState: string;
  targetAt: string;
  nextAction: string;
  blocker: string | null;
  owner: string;
  location: string;
  vehicle: string;
  subject: string;
  concern: string;
  technician: string | null;
  bay: string | null;
  waitingParts: boolean;
  approvalPending: boolean;
  qcPending: number;
  pilot: ShopReconPilotScenario | null;
};

export type ShopReconLifecycleWorkspaceModel = {
  lifecycle: { version: number; stage: ShopReconStageCode; operatingState: string; stageStartedAt: string; zoneCode: string; targetAt: string; nextAction: string; blockerCodes: unknown[]; scopeVersion: number; initialized: boolean; lastSavedAt: string | null; lastSavedByUserId: string | null; lastSavedByName: string | null };
  currentDraft: { id: string; stage: ShopReconStageCode; scopeVersion: number; revision: number; checklist: Record<string, boolean>; formData: Record<string, unknown>; evidence: string[]; savedAt: string; savedByUserId: string; savedByName: string; reason: string } | null;
  currentEvidence: { id: string; stage: ShopReconStageCode; scopeVersion: number; version: number; payload: Record<string, unknown>; sourceReferences: unknown[]; publishedAt: string; publishedByUserId: string; publishedByName: string; reason: string } | null;
  history: Array<{ sequence: number; eventType: string; fromStage: ShopReconStageCode | null; toStage: ShopReconStageCode | null; actorName: string; reason: string; occurredAt: string; scopeVersion: number }>;
  overrides: Array<{ id: string; kind: string; authorizedByName: string; reason: string; expiresAt: string | null; createdAt: string }>;
  scopeChanges: Array<{ id: string; version: number; status: string; finding: string; submittedByName: string; submittedAt: string }>;
  permissions: { currentUserName: string; canSave: boolean; canPublishEvidence: boolean; canComplete: boolean; canOverride: boolean; overrideAuthority: string };
};

const words = (value: string | null) => value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) : "Not applicable";
const date = (value: string) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
function stageFromQuery(value: string | undefined, fallback: ShopReconStageCode) {
  if (!value) return fallback;
  const byCode = SHOP_RECON_STAGES.find(stage => stage.code === value);
  if (byCode) return byCode.code;
  const order = Number(value);
  return SHOP_RECON_STAGES.find(stage => stage.order === order)?.code ?? fallback;
}
type WorkspaceView = "work" | "activity" | "evidence" | "completion";
type OperationalActivity = { id: string; title: string; result: string; evidence: string; actor: string; occurredAt: string };
function operationalActivity(value: unknown): OperationalActivity[] { return Array.isArray(value) ? value.filter((entry): entry is OperationalActivity => Boolean(entry && typeof entry === "object" && "id" in entry && "title" in entry)) : []; }
function fieldHasValue(value: unknown) { return value !== undefined && value !== null && value !== "" && !(typeof value === "number" && Number.isNaN(value)); }
function hasAnyValue(source: Record<string, unknown>, keys: readonly string[]) { return keys.some(key => fieldHasValue(source[key])); }
function hasTrue(source: Record<string, unknown>, keys: readonly string[]) { return keys.some(key => source[key] === true); }
function derivedSourceChecklist(stage: ShopReconStageCode, source: Record<string, unknown>): Record<string, boolean> {
  if (stage === "PARTS_RESOURCE_READINESS") return { item_2: hasAnyValue(source, ["partReservations", "partsDemandCreatedOrNotRequired"]), item_3: hasTrue(source, ["partsReady", "partsAvailabilityConfirmed"]), item_4: hasTrue(source, ["procedureCurrent", "technicianEligible", "bayEligible", "resourcesProcedureNeedsConfirmed"]), item_6: hasAnyValue(source, ["partReservations", "readinessDecisionSubmitted"]) };
  if (stage === "DISPATCH_WORK_STAGING") return { item_1: hasAnyValue(source, ["readinessEvidenceId", "authorizationReadinessGatesPassed"]), item_2: hasAnyValue(source, ["technicianUserIds", "technicianEligibilityConfirmed"]), item_3: hasAnyValue(source, ["bayResourceIds", "scheduledStartAt", "bayTimeSlotReserved"]), item_6: hasAnyValue(source, ["activeWip", "wipLimit", "wipQueuePositionConfirmed"]), item_7: hasTrue(source, ["dispatchConfirmed", "dispatchPublished"]) };
  if (stage === "REPAIR_EXECUTION") return { item_1: hasAnyValue(source, ["laborEventIds", "dispatchAcceptedWorkStarted"]), item_3: hasAnyValue(source, ["laborEventIds", "laborClockVersions", "laborClockEventRecorded"]), item_4: hasTrue(source, ["executionComplete", "authorizedRepairWorkPerformed"]), item_6: hasTrue(source, ["completionEvidence", "repairEvidenceMeasurementsAttached"]), item_7: hasAnyValue(source, ["additionalFinding", "changedScopeStoppedOrNoChangeConfirmed"]) };
  if (stage === "TECHNICIAN_COMPLETION") return { item_1: hasTrue(source, ["technicianSignoff", "executionCompleteConfirmed"]), item_2: hasAnyValue(source, ["finalMeasurements", "completionEvidenceAttached"]), item_3: hasTrue(source, ["laborClosedNoRunningClock", "technicianSignoff"]), item_4: hasAnyValue(source, ["finalMeasurements", "technicianNotes", "correctionMeasurementsDocumented"]), item_5: hasTrue(source, ["technicianSignoff", "submittedForIndependentQc"]) };
  if (stage === "QUALITY_CONTROL_ROAD_TEST") return { item_1: hasAnyValue(source, ["qcVersions", "repairEvidenceReviewedForQc"]), item_2: hasAnyValue(source, ["qcVersions", "independentQcPerformed"]), item_3: hasAnyValue(source, ["roadTestOutcome", "roadTestCompletedOrNotRequired"]), item_4: hasTrue(source, ["qcPassed", "qcDispositionPassed"]), item_5: hasTrue(source, ["qcPassed", "reworkLoopControlledIfFailed"]) };
  if (stage === "RELEASE_HANDOVER_READINESS") return { item_1: hasTrue(source, ["releaseReady", "qcRoadTestPassConfirmed"]), item_2: hasAnyValue(source, ["finalCostCents", "finalScopeCostReconciled"]), item_3: hasAnyValue(source, ["readyKeys", "keysDocumentsReconciled"]), item_4: hasAnyValue(source, ["destination", "destinationReceivingPartyConfirmed"]), item_5: hasTrue(source, ["releaseReady", "releaseReadinessSubmitted"]) };
  if (stage === "VEHICLE_HANDOVER_SHOP_EXIT") return { item_1: hasTrue(source, ["shopExitRecorded", "releaseReadinessVerified"]), item_2: hasAnyValue(source, ["releasedKeys", "vehicleKeysTransferred"]), item_3: hasAnyValue(source, ["receiverAcceptance", "receivingPartyAcceptanceCaptured"]), item_4: hasAnyValue(source, ["custodyEventId", "finalLocationExitRecorded"]), item_5: hasTrue(source, ["shopExitRecorded", "returnPathSynced"]) };
  return {};
}
function checklistProgress(checklist: Record<string, boolean>, total: number) { const complete = Array.from({ length: total }, (_, index) => checklist[`item_${index + 1}`] === true).filter(Boolean).length; return { complete, total, ready: complete === total }; }
function stageLoopGuidance(stage: ShopReconStageCode, item: ShopReconVehicleCardModel, blockerCodes: unknown[]) {
  const blockers = blockerCodes.map(String);
  const guidance = [];
  if (stage === "PARTS_RESOURCE_READINESS" || item.waitingParts) guidance.push("Parts blocker: keep the vehicle out of dispatch until Parts Ordering shows ready or no parts required.");
  if (stage === "DISPATCH_WORK_STAGING") guidance.push("WIP control: the two-bay limit must be respected unless the General Manager records a governed exception.");
  if (stage === "REPAIR_EXECUTION") guidance.push("Changed scope: stop affected work and loop through findings, authorization, and readiness before continuing.");
  if (stage === "QUALITY_CONTROL_ROAD_TEST" || item.qcPending > 0) guidance.push("QC fail / road-test fail: route the vehicle back to Repair Execution for rework and fresh QC.");
  if (stage === "VEHICLE_HANDOVER_SHOP_EXIT") guidance.push("Wrong handoff: return path must match the lane — Inventory Lifecycle for dealership units, Service Advisor/customer for customer vehicles.");
  if (blockers.length) guidance.push(`Active blocker: ${blockers.join(", ")}.`);
  return guidance;
}

export function ShopReconVehicleCard({ initialStage, item, lifecycleWorkspace, returnTo = "/vehicles/shop-recon", titlePreparationWorkspace = null }: { initialStage?: string; item: ShopReconVehicleCardModel; lifecycleWorkspace: ShopReconLifecycleWorkspaceModel; returnTo?: string; titlePreparationWorkspace?: TitlePreparationWorkspace }) {
  const lifecycle = lifecycleWorkspace.lifecycle;
  const [selectedStage, setSelectedStage] = useState<ShopReconStageCode>(() => stageFromQuery(initialStage, lifecycle.stage));
  const [checklist, setChecklist] = useState<Record<string, boolean>>(lifecycleWorkspace.currentDraft?.checklist ?? {});
  const [formData, setFormData] = useState<Record<string, unknown>>(lifecycleWorkspace.currentDraft?.formData ?? {});
  const [evidenceText, setEvidenceText] = useState((lifecycleWorkspace.currentDraft?.evidence ?? []).join("\n"));
  const [saveReason, setSaveReason] = useState(lifecycleWorkspace.currentDraft?.reason ?? "Updated current stage work and supporting evidence.");
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [overrideId, setOverrideId] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("work");
  const [workGuidance, setWorkGuidance] = useState<string | null>(null);
  const [overrideKind, setOverrideKind] = useState("NONCRITICAL_DOCUMENTATION"), [overrideReason, setOverrideReason] = useState(""), [scopeFinding, setScopeFinding] = useState("");
  const selectedDefinition = SHOP_RECON_STAGES.find(stage => stage.code === selectedStage)!;
  const workspace = getShopReconStageWorkspace(selectedStage);
  const operationalWorkspace = getShopReconOperationalWorkspace(selectedStage, item.workLane);
  const usesExternalIntake = selectedStage === "SERVICE_RECON_JOB_INTAKE";
  const laneClass = item.workLane === "INVENTORY_RECON" ? "inventory" : "customer", isCurrent = selectedStage === lifecycle.stage;
  const overallLifecycle = item.workLane === "INVENTORY_RECON" ? words(item.inventoryLifecycleStage ?? "RECONDITIONING") : "Customer Repair";
  const currentIndex = SHOP_RECON_STAGES.findIndex(stage => stage.code === lifecycle.stage), selectedIndex = SHOP_RECON_STAGES.findIndex(stage => stage.code === selectedStage), nextStage = SHOP_RECON_STAGES[currentIndex + 1]?.code ?? (currentIndex === 15 ? "VEHICLE_HANDOVER_SHOP_EXIT" : null), requiresPublishedEvidence = currentIndex < 16;
  const stageReturnTo = getShopReconStageHref(item.id, selectedDefinition.code, returnTo);
  const stageReturnLabel = `Return to Shop & Recon · Stage ${selectedDefinition.order}: ${selectedDefinition.label}`;
  const sourceContext = new URLSearchParams({ repairOrderId: item.id, returnLabel: stageReturnLabel, returnTo: stageReturnTo, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}) });
  const assignmentHref = `/vehicles/repair-workbench?${sourceContext.toString()}#assignment`;
  const dispatchHref = `/vehicles/shop-dispatch?${sourceContext.toString()}`;
  const evidence = useMemo(() => evidenceText.split("\n").map(value => value.trim()).filter(Boolean), [evidenceText]);
  const activeOverrides = lifecycleWorkspace.overrides.filter(record => !record.expiresAt || new Date(record.expiresAt) > new Date());
  const pilotProgress = item.pilot ? evaluateShopReconPilotProgress(item.pilot, currentIndex + 1, lifecycle.operatingState) : [];
  const sourceWorkspace = currentIndex === 7 || currentIndex === 8 ? { href: `/vehicles/repair-workbench?${sourceContext.toString()}`, label: "Open estimate & authorization workspace" } : currentIndex === 9 ? { href: `/diagnostics/parts-ordering?${new URLSearchParams({ repairOrderId: item.id, repairOrderNumber: item.repairOrderNumber, vehicle: item.vehicle, returnLabel: stageReturnLabel, returnTo: stageReturnTo }).toString()}`, label: "Open Parts Ordering Form" } : currentIndex === 10 ? { href: `/vehicles/shop-dispatch?${sourceContext.toString()}`, label: "Open dispatch & assignment workspace" } : currentIndex === 11 ? { href: `/my-tasks?${new URLSearchParams({ returnLabel: stageReturnLabel, returnTo: stageReturnTo }).toString()}`, label: "Open technician execution workspace" } : currentIndex >= 12 && currentIndex <= 13 ? { href: `/vehicles/shop-dispatch?${sourceContext.toString()}`, label: "Open technician execution workspace" } : currentIndex === 14 ? { href: `/vehicles/quality-control?${sourceContext.toString()}`, label: "Open QC & release workspace" } : currentIndex === 15 ? { href: `/vehicles/advisor?${sourceContext.toString()}`, label: "Open recipient readiness workspace" } : null;
  const activityEntries = operationalActivity(formData.__activity).slice().reverse();
  const stageTitle = operationalWorkspace?.summaryTitle ?? selectedDefinition.label;
  const stagePurpose = operationalWorkspace?.summaryInstruction ?? workspace.purpose;
  const sourceFacts = { ...(lifecycleWorkspace.currentEvidence?.payload ?? {}), ...formData };
  const scopeBuilderComplete = selectedStage === "JOB_SCOPE_DEFINITION" && ["scopeReason", "workAreas", "allowedWork", "stopRules", "safetyConcern", "roadTestAllowed", "partsLikelyNeeded", "subletVendorLikely", "approvalOwner"].every(key => fieldHasValue(formData[key]));
  const scopeBuilderChecklist: Record<string, boolean> = selectedStage === "JOB_SCOPE_DEFINITION" ? {
    item_1: fieldHasValue(formData.scopeReason),
    item_2: fieldHasValue(formData.workAreas),
    item_3: fieldHasValue(formData.allowedWork),
    item_4: fieldHasValue(formData.stopRules),
    item_5: ["safetyConcern", "roadTestAllowed", "partsLikelyNeeded", "subletVendorLikely"].every(key => fieldHasValue(formData[key])),
    item_6: fieldHasValue(formData.approvalOwner),
    item_7: scopeBuilderComplete && formData.scopeSummaryReviewed === true && formData.scopeReadyForWorkOrder === true,
  } : {};
  const vehicleIntakeChecklist: Record<string, boolean> = selectedStage === "VEHICLE_INTAKE_CUSTODY" ? {
    item_1: fieldHasValue(formData.observedIdentifier) && formData.matchStatus === "Match confirmed",
    item_2: fieldHasValue(formData.arrivalCondition) && fieldHasValue(formData.intakeNotes),
    item_3: Number(formData.keyCount) > 0 && fieldHasValue(formData.keyTag),
    item_4: fieldHasValue(formData.photoEvidence),
    item_5: fieldHasValue(formData.custodyLocation),
    item_6: fieldHasValue(formData.movementRestriction),
    item_7: fieldHasValue(formData.custodyAcceptedBy) && formData.custodyAccepted === true,
  } : {};
  const safetyTriageChecklist: Record<string, boolean> = selectedStage === "SAFETY_MOBILITY_TRIAGE" ? {
    item_1: ["leaksFluids", "brakeSteeringConcern", "fireElectricalRisk", "hazards"].every(key => fieldHasValue(formData[key])),
    item_2: ["mobility", "startRunStatus", "moveMethod"].every(key => fieldHasValue(formData[key])),
    item_3: ["roadTestDecision", "roadTestReason", "roadTestAuthority"].every(key => fieldHasValue(formData[key])),
    item_4: fieldHasValue(formData.movementRestriction),
    item_5: fieldHasValue(formData.priority),
    item_6: ["containment", "physicalHoldLocation"].every(key => fieldHasValue(formData[key])),
    item_7: ["nextAllowedStage", "confirmedBy"].every(key => fieldHasValue(formData[key])) && formData.safetyDecisionConfirmed === true,
  } : {};
  const inspectionChecklist: Record<string, boolean> = selectedStage === "INSPECTION_CONCERN_VERIFICATION" ? {
    item_1: ["scopePacket", "workOrderOperations", "stopRule"].every(key => fieldHasValue(formData[key])),
    item_2: formData.vinRoMatch === "Match confirmed" && Number(formData.odometer) > 0 && fieldHasValue(formData.inspector),
    item_3: ["inspectionTemplate", "inspectionChecklistStatus", "safetyItems"].every(key => fieldHasValue(formData[key])),
    item_4: ["concernStatus", "testCondition", "inspectionSummary"].every(key => fieldHasValue(formData[key])),
    item_5: fieldHasValue(formData.measurementsRecorded),
    item_6: fieldHasValue(formData.inspectionEvidence),
    item_7: fieldHasValue(formData.nextDecision) && formData.inspectionPacketComplete === true,
  } : {};
  const diagnosisChecklist: Record<string, boolean> = selectedStage === "DIAGNOSIS" ? {
    item_1: formData.diagnosticEvidenceReviewed === true || formData.verifiedConcernReviewed === true,
    item_2: formData.diagnosticAssistInspectionPerformed === true || formData.diagnosticRouteSelected === true,
    item_3: formData.diagnosticTestDriveOrStaticCheckCompleted === true || formData.diagnosticTestsRecorded === true || formData.diagnosticMeasurementsAttached === true,
    item_4: formData.diagnosticDispositionSelected === true || formData.supportedCauseDocumented === true,
    item_5: formData.diagnosticNextStepControlled === true || formData.recommendedCorrectionEntered === true || formData.diagnosisSubmitted === true,
  } : {};
  const findingsRepairPlanChecklist: Record<string, boolean> = selectedStage === "FINDINGS_REPAIR_PLAN" ? {
    item_1: formData.findingsReviewed === true,
    item_2: formData.workNeededClassified === true,
    item_3: formData.repairPlanCreated === true,
    item_4: formData.costResourceImpactPrepared === true,
    item_5: formData.submittedForAuthorization === true,
  } : {};
  const authorizationChecklist: Record<string, boolean> = selectedStage === "AUTHORIZATION" ? {
    item_1: formData.repairPlanVersionReviewed === true,
    item_2: formData.approvalAuthorityConfirmed === true,
    item_3: formData.authorizationDecisionRecorded === true,
    item_4: formData.approvedScopeAmountCaptured === true,
    item_5: formData.authorizationSubmittedForReadiness === true,
  } : {};
  const partsResourceReadinessChecklist: Record<string, boolean> = selectedStage === "PARTS_RESOURCE_READINESS" ? {
    item_1: formData.authorizedRepairPlanReviewed === true,
    item_2: formData.partsDemandCreatedOrNotRequired === true,
    item_3: formData.partsAvailabilityConfirmed === true,
    item_4: formData.resourcesProcedureNeedsConfirmed === true,
    item_5: formData.subletVendorNeedResolved === true,
    item_6: formData.readinessDecisionSubmitted === true,
  } : {};
  const dispatchWorkStagingChecklist: Record<string, boolean> = selectedStage === "DISPATCH_WORK_STAGING" ? {
    item_1: formData.authorizationReadinessGatesPassed === true,
    item_2: formData.technicianEligibilityConfirmed === true,
    item_3: formData.bayTimeSlotReserved === true,
    item_4: formData.vehicleKeysPartsStaged === true,
    item_5: formData.currentRepairInstructionsReviewed === true,
    item_6: formData.wipQueuePositionConfirmed === true,
    item_7: formData.dispatchPublished === true,
  } : {};
  const repairExecutionChecklist: Record<string, boolean> = selectedStage === "REPAIR_EXECUTION" ? {
    item_1: formData.dispatchAcceptedWorkStarted === true,
    item_2: formData.authorizedInstructionsReviewedForRepair === true,
    item_3: formData.laborClockEventRecorded === true,
    item_4: formData.authorizedRepairWorkPerformed === true,
    item_5: formData.partsMaterialsConsumedRecorded === true,
    item_6: formData.repairEvidenceMeasurementsAttached === true,
    item_7: formData.changedScopeStoppedOrNoChangeConfirmed === true,
  } : {};
  const technicianCompletionChecklist: Record<string, boolean> = selectedStage === "TECHNICIAN_COMPLETION" ? {
    item_1: formData.executionCompleteConfirmed === true,
    item_2: formData.completionEvidenceAttached === true,
    item_3: formData.laborClosedNoRunningClock === true,
    item_4: formData.correctionMeasurementsDocumented === true,
    item_5: formData.submittedForIndependentQc === true,
  } : {};
  const qualityControlChecklist: Record<string, boolean> = selectedStage === "QUALITY_CONTROL_ROAD_TEST" ? {
    item_1: formData.repairEvidenceReviewedForQc === true,
    item_2: formData.independentQcPerformed === true,
    item_3: formData.roadTestCompletedOrNotRequired === true,
    item_4: formData.qcDispositionPassed === true,
    item_5: formData.reworkLoopControlledIfFailed === true,
  } : {};
  const releaseReadinessChecklist: Record<string, boolean> = selectedStage === "RELEASE_HANDOVER_READINESS" ? {
    item_1: formData.qcRoadTestPassConfirmed === true,
    item_2: formData.finalScopeCostReconciled === true,
    item_3: formData.keysDocumentsReconciled === true,
    item_4: formData.destinationReceivingPartyConfirmed === true,
    item_5: formData.releaseReadinessSubmitted === true,
  } : {};
  const shopExitChecklist: Record<string, boolean> = selectedStage === "VEHICLE_HANDOVER_SHOP_EXIT" ? {
    item_1: formData.releaseReadinessVerified === true,
    item_2: formData.vehicleKeysTransferred === true,
    item_3: formData.receivingPartyAcceptanceCaptured === true,
    item_4: formData.finalLocationExitRecorded === true,
    item_5: formData.returnPathSynced === true,
  } : {};
  const stageDerivedChecklist = derivedSourceChecklist(selectedStage, sourceFacts);
  const activeChecklist: Record<string, boolean> = selectedStage === "JOB_SCOPE_DEFINITION" ? { ...checklist, ...scopeBuilderChecklist, ...stageDerivedChecklist } : selectedStage === "VEHICLE_INTAKE_CUSTODY" ? { ...checklist, ...vehicleIntakeChecklist, ...stageDerivedChecklist } : selectedStage === "SAFETY_MOBILITY_TRIAGE" ? { ...checklist, ...safetyTriageChecklist, ...stageDerivedChecklist } : selectedStage === "INSPECTION_CONCERN_VERIFICATION" ? { ...checklist, ...inspectionChecklist, ...stageDerivedChecklist } : selectedStage === "DIAGNOSIS" ? { ...checklist, ...diagnosisChecklist, ...stageDerivedChecklist } : selectedStage === "FINDINGS_REPAIR_PLAN" ? { ...checklist, ...findingsRepairPlanChecklist, ...stageDerivedChecklist } : selectedStage === "AUTHORIZATION" ? { ...checklist, ...authorizationChecklist, ...stageDerivedChecklist } : selectedStage === "PARTS_RESOURCE_READINESS" ? { ...checklist, ...partsResourceReadinessChecklist, ...stageDerivedChecklist } : selectedStage === "DISPATCH_WORK_STAGING" ? { ...checklist, ...dispatchWorkStagingChecklist, ...stageDerivedChecklist } : selectedStage === "REPAIR_EXECUTION" ? { ...checklist, ...repairExecutionChecklist, ...stageDerivedChecklist } : selectedStage === "TECHNICIAN_COMPLETION" ? { ...checklist, ...technicianCompletionChecklist, ...stageDerivedChecklist } : selectedStage === "QUALITY_CONTROL_ROAD_TEST" ? { ...checklist, ...qualityControlChecklist, ...stageDerivedChecklist } : selectedStage === "RELEASE_HANDOVER_READINESS" ? { ...checklist, ...releaseReadinessChecklist, ...stageDerivedChecklist } : selectedStage === "VEHICLE_HANDOVER_SHOP_EXIT" ? { ...checklist, ...shopExitChecklist, ...stageDerivedChecklist } : { ...checklist, ...stageDerivedChecklist };
  const activeProgress = checklistProgress(activeChecklist, workspace.checklist.length);
  const syncedCount = Object.values(stageDerivedChecklist).filter(Boolean).length;
  const loopGuidance = stageLoopGuidance(selectedStage, item, lifecycle.blockerCodes);

  async function post(path: string, body: Record<string, unknown>) { const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "The action could not be completed."); return result; }
  async function saveDraft() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/draft`, { stage: lifecycle.stage, expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: saveReason, checklist: activeChecklist, formData, evidence }); setDirty(false); setFeedback({ tone: "success", text: "Draft saved. The vehicle did not move; your name and save time were recorded." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Draft could not be saved." }); } finally { setBusy(false); } }
  async function publishEvidence() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/evidence`, { expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: `Published authoritative operational evidence for ${workspace.formTitle}.` }); setFeedback({ tone: "success", text: "Operational evidence published and linked to its authoritative Shop records. The stage has not moved." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Operational evidence could not be published." }); } finally { setBusy(false); } }
  async function moveStage(destination: ShopReconStageCode) { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/transition`, { toStage: destination, expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: currentIndex === 15 && destination === lifecycle.stage ? "Completed the physical Shop exit and custody handoff under the approved terminal-stage policy." : destination === nextStage ? `Completed ${workspace.formTitle} and advanced under the approved stage policy.` : `General Manager controlled movement from ${lifecycle.stage} to ${destination}.`, facts: {}, overrideId: overrideId || null }); window.location.assign(getShopReconStageHref(item.id, destination, returnTo)); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Stage could not be completed." }); } finally { setBusy(false); } }
  async function grantOverride() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/override`, { kind: overrideKind, expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: overrideReason, boundaries: ["Applies only to this vehicle and current stage"] }); setFeedback({ tone: "success", text: "General Manager exception recorded. Safety, identity, authorization, QC, road-test, and release gates remain non-overridable." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Override could not be recorded." }); } finally { setBusy(false); } }
  async function submitScopeChange() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/scope-change`, { expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: "Additional finding changed the currently authorized repair scope.", finding: scopeFinding, affectedRepairJobIds: [], originalScope: formData, proposedScope: { finding: scopeFinding } }); setFeedback({ tone: "success", text: "Affected work stopped. A new scope version was created and the card returned to Findings Verification." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Scope change could not be submitted." }); } finally { setBusy(false); } }
  function changed() { setDirty(true); setFeedback(null); }
  function appendOperationalActivity(entry: Omit<OperationalActivity, "id" | "actor" | "occurredAt">) {
    setFormData(current => ({ ...current, __activity: [...operationalActivity(current.__activity), { ...entry, id: crypto.randomUUID(), actor: lifecycleWorkspace.permissions.currentUserName, occurredAt: new Date().toISOString() }] }));
  }
  function recordOperationalAction(index: number) {
    const action = operationalWorkspace?.actions[index];
    if (!action) return;
    if (!isCurrent) {
      setSelectedStage(lifecycle.stage);
      setWorkspaceView("work");
      setWorkGuidance(`Stage ${currentIndex + 1} is the active operational stage. Complete it before entering work in a future stage.`);
      return;
    }
    const missingFields = action.requiredFields.filter(field => !fieldHasValue(formData[field]));
    if (missingFields.length) {
      const labels = missingFields.map(field => operationalWorkspace.summaryFields?.find(item => item.key === field)?.label ?? workspace.fields.find(item => item.key === field)?.label ?? field);
      if (usesExternalIntake) {
        const source = item.workLane === "INVENTORY_RECON" ? "Inventory-to-Shop Handoff" : "Intake Form";
        setWorkGuidance(`Complete or correct ${labels.join(" and ")} in the ${source}, then return here to record "${action.title}".`);
        return;
      }
      setWorkGuidance(`Complete ${labels.join(" and ")} before recording “${action.title}.”`);
      requestAnimationFrame(() => document.getElementById(`shop-field-${missingFields[0]}`)?.focus());
      return;
    }
    const key = `item_${index + 1}`, wasComplete = checklist[key] === true;
    setChecklist(current => ({ ...current, [key]: !wasComplete }));
    appendOperationalActivity({ title: action.title, result: wasComplete ? "Operation reopened for correction." : "Operation performed and recorded on the current stage.", evidence: action.evidence });
    setWorkGuidance(wasComplete ? `${action.title} is open for correction.` : `${action.title} was recorded. Save stage work when the stage record is complete.`);
    changed();
  }
  function loadPilotExample() {
    if (!operationalWorkspace || !item.pilot || !isCurrent) return;
    setFormData(current => ({ ...current, ...operationalWorkspace.pilotValues }));
    setChecklist(current => ({ ...current, ...Object.fromEntries(operationalWorkspace.actions.map((_, index) => [`item_${index + 1}`, false])) }));
    setWorkGuidance("Sample facts loaded for review. Record each operation, inspect Stage Activity, then try Documents & Evidence and Stage Completion. Nothing is saved until you choose Save recorded stage work.");
    changed();
  }
  function updateOperationalField(key: string, value: unknown) {
    const actionIndex = operationalWorkspace?.actions.findIndex(action => action.requiredFields.includes(key)) ?? -1;
    const checklistKey = `item_${actionIndex + 1}`, invalidatesRecordedAction = actionIndex >= 0 && checklist[checklistKey] === true;
    if (invalidatesRecordedAction) setChecklist(current => ({ ...current, [checklistKey]: false }));
    setFormData(current => ({
      ...current,
      [key]: value,
      __activity: invalidatesRecordedAction
        ? [...operationalActivity(current.__activity), { id: crypto.randomUUID(), title: operationalWorkspace!.actions[actionIndex].title, result: "Recorded operation reopened because its supporting facts changed.", evidence: "Correction required", actor: lifecycleWorkspace.permissions.currentUserName, occurredAt: new Date().toISOString() }]
        : current.__activity,
    }));
    changed();
  }
  const completionControls = (() => {
    const publishLocked = dirty || !lifecycleWorkspace.currentDraft || !lifecycleWorkspace.permissions.canPublishEvidence;
    const completeLocked = dirty || !lifecycleWorkspace.currentDraft || !nextStage || (requiresPublishedEvidence && !lifecycleWorkspace.currentEvidence) || (!lifecycleWorkspace.permissions.canComplete && !overrideId);
    if (isCurrent) return <section className="srv-live-actions">
      <h2>Save Work, Publish Evidence, and Complete</h2>
      {sourceWorkspace ? <Link className="srv-source-workspace" href={sourceWorkspace.href}><Wrench />{sourceWorkspace.label}</Link> : null}
      {requiresPublishedEvidence ? <p className={`srv-publish-state ${lifecycleWorkspace.currentEvidence ? "published" : "draft"}`}>{lifecycleWorkspace.currentEvidence ? <><CheckCircle2 /><span><strong>Operational evidence published</strong><small>Version {lifecycleWorkspace.currentEvidence.version} by {lifecycleWorkspace.currentEvidence.publishedByName} · {date(lifecycleWorkspace.currentEvidence.publishedAt)}</small></span></> : <><AlertTriangle /><span><strong>{lifecycleWorkspace.currentDraft ? "Recorded work saved — publication required" : "Recorded work has not been saved"}</strong><small>Use the three numbered actions below in order. A locked action will explain what is missing when clicked.</small></span></>}</p> : null}
      <label><span>Work-record note</span><textarea disabled={busy} onChange={event => { setSaveReason(event.target.value); changed(); }} value={saveReason} /></label>
      {activeOverrides.length ? <label><span>Approved exception (optional)</span><select disabled={busy} onChange={event => setOverrideId(event.target.value)} value={overrideId}><option value="">No exception</option>{activeOverrides.map(record => <option key={record.id} value={record.id}>{words(record.kind)} · {record.authorizedByName}</option>)}</select></label> : null}
      <button disabled={busy || !lifecycleWorkspace.permissions.canSave} onClick={saveDraft} type="button"><Save />{busy ? "Working…" : "1. Save recorded stage work"}</button>
      {requiresPublishedEvidence ? <button className={publishLocked ? "is-locked" : ""} data-locked={publishLocked || undefined} disabled={busy} onClick={() => publishLocked ? setFeedback({ tone: "error", text: dirty ? "Save the latest stage changes first." : !lifecycleWorkspace.currentDraft ? "Record the stage work and save it first." : "You do not have evidence-publication authority for this stage." }) : publishEvidence()} type="button"><ShieldCheck />{lifecycleWorkspace.currentEvidence ? `2. Republish evidence · v${lifecycleWorkspace.currentEvidence.version}` : "2. Publish operational evidence"}</button> : null}
      <button className={completeLocked ? "is-locked" : ""} data-locked={completeLocked || undefined} disabled={busy} onClick={() => completeLocked ? setFeedback({ tone: "error", text: dirty ? "Save the latest changes before completing the stage." : !lifecycleWorkspace.currentDraft ? "Save recorded stage work first." : requiresPublishedEvidence && !lifecycleWorkspace.currentEvidence ? "Publish operational evidence before advancing." : "The named completion authority or an approved exception is required." }) : nextStage && moveStage(nextStage)} type="button"><CheckCircle2 />{currentIndex === 15 ? "3. Complete Shop exit" : "3. Complete stage & advance"}</button>
      <small>Saving records all work, corrections, evidence references, user attribution, and time without moving the vehicle. Completion separately rechecks every gate.</small>
    </section>;
    if (selectedIndex < currentIndex && lifecycleWorkspace.permissions.canOverride) return <section className="srv-live-actions"><h2>Controlled Stage Movement</h2><p>A General Manager override for backward movement or reopening is required.</p><label><span>Approved exception</span><select onChange={event => setOverrideId(event.target.value)} value={overrideId}><option value="">Select an active override</option>{activeOverrides.filter(record => ["CONTROLLED_BACKWARD_MOVEMENT", "REOPEN_STAGE"].includes(record.kind)).map(record => <option key={record.id} value={record.id}>{words(record.kind)} · {record.authorizedByName}</option>)}</select></label><button disabled={busy || !overrideId} onClick={() => moveStage(selectedStage)} type="button"><RotateCcw />Move vehicle to this stage</button></section>;
    return <section className="srv-live-actions"><h2>Future-stage preview</h2><p>This stage becomes operational after the current stage and all required gates are complete.</p></section>;
  })();

  return <section className={`srv-card lane-${laneClass}`} aria-label={`Unified vehicle card for ${item.vehicle}`}>
    <header className="srv-card-header">
      <Link href={returnTo}><ArrowLeft /> Shop &amp; Recon</Link>
      <div className="srv-card-identity">
        <span><CarFront /></span>
        <div>
          <small><LaneIcon lane={item.workLane} /> {item.workLaneLabel}{item.pilot ? <b className="srv-pilot-badge">Operational Pilot</b> : null}</small>
          <h1>{item.vehicle}</h1>
          <p>{item.vin ?? "VIN unavailable"} · {item.repairOrderNumber} · {item.subject}</p>
        </div>
      </div>
      <div className="srv-card-now">
        <small>Do This Now · Stage {currentIndex + 1} of 16</small>
        <strong>{lifecycle.nextAction}</strong>
        <span>{SHOP_RECON_STAGES[currentIndex].label} · {lifecycle.zoneCode}</span>
      </div>
      <div className="srv-card-status">
        <small><i /> Viewing Stage {selectedDefinition.order} of 16</small>
        <strong>{selectedDefinition.label}</strong>
        <span>{isCurrent ? "Current operational stage" : "Review selection only"}</span>
      </div>
    </header>

    <section className="srv-context-strip" aria-label="Vehicle lifecycle context">
      <p><span>Overall lifecycle</span><strong>{overallLifecycle}</strong></p>
      <p><span>Shop stage</span><strong>{currentIndex + 1}. {SHOP_RECON_STAGES[currentIndex].label}</strong></p>
      <p><span>Operating state</span><strong>{words(lifecycle.operatingState)}</strong></p>
      <p><span>Physical zone</span><strong>{lifecycle.zoneCode}</strong></p>
      <p><span>Owner</span><strong>{item.owner}</strong></p>
      <p><span>{item.commitmentLabel}</span><strong>{date(lifecycle.targetAt)}</strong></p>
    </section>

    <section className="srv-quick-dispatch" aria-label="Assign and dispatch this vehicle">
      <div>
        <span><Wrench /></span>
        <p><small>Quick execution</small><strong>Assign &amp; Dispatch</strong><em>{item.technician ? `Assigned to ${item.technician}` : "Technician not assigned"} · Uses {item.repairOrderNumber}</em></p>
      </div>
      <p>Continue the existing repair order—no duplicate intake or vehicle record.</p>
      <nav aria-label="Vehicle assignment shortcuts">
        <Link className="secondary" href={assignmentHref}><UserRound />{item.technician ? "Change technician" : "Assign technician"}</Link>
        <Link href={dispatchHref}><Wrench />Open Shop Dispatch</Link>
      </nav>
    </section>

    <div className="srv-design-notice"><ShieldCheck /><span><strong>Governed operational workspace</strong> Any authorized user with access may save an attributable draft. Saving never completes a stage or moves the vehicle. Movement requires all gates and the named stage authority.</span></div>

    {item.workLane === "INVENTORY_RECON" ? <ShopReconParallelTitlePreparation currentStageLabel={SHOP_RECON_STAGES[currentIndex].label} initial={titlePreparationWorkspace} repairOrderId={item.id} /> : null}

    <section className="srv-stage-control" aria-label="Shop stage selector">
      <div><span><i /> Current Shop Stage</span><strong>{currentIndex + 1}. {SHOP_RECON_STAGES[currentIndex].label}</strong><small>Select a stage below to review it. Selecting alone never moves the operational vehicle.</small></div>
      <b>{item.priorityBand} · {item.priorityScore}<small>{words(item.stageTargetBand)} · {item.stageElapsedMinutes} staffed min</small></b>
    </section>

    <nav className="srv-stage-nav" aria-label="Sixteen Shop and Recon stages">
      {SHOP_RECON_STAGES.map(stage => {
        const state = stage.order < currentIndex + 1 ? "complete" : stage.order === currentIndex + 1 ? "current" : "upcoming";
        const stageWorkspace = getShopReconStageWorkspace(stage.code), selectedProgress = stage.code === selectedStage ? activeProgress : null;
        const readiness = lifecycle.blockerCodes.length && stage.code === lifecycle.stage ? "blocked" : state === "complete" ? "ready" : selectedProgress?.ready ? "ready" : selectedProgress && selectedProgress.complete > 0 ? "partial" : "missing";
        return <button aria-current={selectedStage === stage.code ? "step" : undefined} className={`${state} ${readiness} ${selectedStage === stage.code ? "selected" : ""}`} key={stage.code} onClick={() => { setSelectedStage(stage.code); setWorkspaceView("work"); setWorkGuidance(null); }} type="button">
          <i>{selectedStage === stage.code ? <em /> : state === "complete" ? <Check /> : stage.order}</i>
          <span>{stage.label}<small>{stage.code === selectedStage ? `${selectedProgress?.complete ?? 0}/${stageWorkspace.checklist.length} ${readiness}` : state === "current" ? readiness === "blocked" ? "Blocked" : "Current work" : state === "complete" ? "Prior stage" : "Upcoming"}</small></span>
        </button>;
      })}
    </nav>

    <main className="srv-workspace">
      <section className="srv-workspace-main">
        <header>
          <span>Stage {selectedDefinition.order}</span>
          <div><small>{isCurrent ? "Current operational workspace" : "Read-only stage review"}</small><h2>{stageTitle}</h2><p>{stagePurpose}</p></div>
          <b>{isCurrent ? "CURRENT" : selectedDefinition.order < currentIndex + 1 ? "HISTORY" : "UPCOMING"}</b>
        </header>

        {operationalWorkspace ? <section className="srv-operational-shell">
          <nav aria-label="Stage operational workspace sections" className="srv-operational-tabs">
            <button className={workspaceView === "work" ? "active" : ""} onClick={() => setWorkspaceView("work")} type="button"><PlayCircle />Work to Perform <b>{workspace.checklist.filter((_, index) => activeChecklist[`item_${index + 1}`]).length}/{workspace.checklist.length}</b></button>
            <button className={workspaceView === "activity" ? "active" : ""} onClick={() => setWorkspaceView("activity")} type="button"><Activity />Stage Activity <b>{activityEntries.length + lifecycleWorkspace.history.length}</b></button>
            <button className={workspaceView === "evidence" ? "active" : ""} onClick={() => setWorkspaceView("evidence")} type="button"><Paperclip />Documents &amp; Evidence <b>{evidence.length}/{workspace.evidence.length}</b></button>
            <button className={workspaceView === "completion" ? "active" : ""} onClick={() => setWorkspaceView("completion")} type="button"><BookOpenCheck />Stage Completion</button>
          </nav>

          {workspaceView === "work" ? <div className="srv-operational-work">
            <header><div><small>Perform the work here</small><h3>{selectedStage === "JOB_SCOPE_DEFINITION" ? "Follow the Job Scope Checklist" : operationalWorkspace.workTitle}</h3><p>{operationalWorkspace.workInstruction}</p>{selectedStage !== "JOB_SCOPE_DEFINITION" && operationalWorkspace.tools?.length ? <nav aria-label={`${workspace.formTitle} tools`} className="srv-stage-tools">{operationalWorkspace.tools.map(tool => <Link href={resolveStageToolHref(tool, item, stageReturnTo, selectedDefinition)} key={tool.key} title={tool.description}><FileText />{tool.label}</Link>)}</nav> : null}</div><div className="srv-operational-header-actions"><span>{isCurrent ? `Working as ${lifecycleWorkspace.permissions.currentUserName}` : `Preview only · Stage ${currentIndex + 1} is active`}</span>{item.pilot && isCurrent ? <button onClick={loadPilotExample} type="button"><FlaskConical />Load sample stage work</button> : null}</div></header>
            {workGuidance ? <p className="srv-work-guidance"><AlertTriangle /><span>{workGuidance}</span></p> : null}
            <section className={`srv-source-sync ${activeProgress.ready ? "ready" : lifecycle.blockerCodes.length && isCurrent ? "blocked" : "missing"}`} aria-label="Source tool checklist synchronization"><ShieldCheck /><div><strong>Source tool sync</strong><span>{syncedCount ? `${syncedCount} checklist line${syncedCount === 1 ? "" : "s"} cleared from saved tool facts or published evidence.` : "Open the stage tool, save the work, then this card will use those facts to clear checklist lines."}</span></div><b>{activeProgress.complete}/{activeProgress.total} ready</b></section>
            {loopGuidance.length ? <section className="srv-loop-guidance" aria-label="Operational blocker and loop guidance">{loopGuidance.map(item => <p key={item}><AlertTriangle />{item}</p>)}</section> : null}
            {selectedStage === "JOB_SCOPE_DEFINITION" ? <ScopeCommandWorkspace checklist={activeChecklist} item={item} returnTo={stageReturnTo} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "WORK_ORDER_CREATION" ? <WorkOrderCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "VEHICLE_INTAKE_CUSTODY" ? <VehicleIntakeCommandWorkspace checklist={activeChecklist} item={item} returnTo={stageReturnTo} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "SAFETY_MOBILITY_TRIAGE" ? <SafetyTriageCommandWorkspace checklist={activeChecklist} item={item} returnTo={stageReturnTo} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "INSPECTION_CONCERN_VERIFICATION" ? <InspectionVerificationCommandWorkspace checklist={activeChecklist} item={item} returnTo={stageReturnTo} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "DIAGNOSIS" ? <DiagnosisCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "FINDINGS_REPAIR_PLAN" ? <FindingsRepairPlanCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "AUTHORIZATION" ? <AuthorizationCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "PARTS_RESOURCE_READINESS" ? <PartsResourceReadinessCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "DISPATCH_WORK_STAGING" ? <DispatchWorkStagingCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "REPAIR_EXECUTION" ? <RepairExecutionCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "TECHNICIAN_COMPLETION" ? <TechnicianCompletionCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "QUALITY_CONTROL_ROAD_TEST" ? <QualityControlCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "RELEASE_HANDOVER_READINESS" ? <ReleaseReadinessCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : selectedStage === "VEHICLE_HANDOVER_SHOP_EXIT" ? <ShopExitCommandWorkspace busy={busy} checklist={activeChecklist} isCurrent={isCurrent} item={item} onChange={changed} returnTo={stageReturnTo} setChecklist={setChecklist} setFormData={setFormData} tools={operationalWorkspace.tools ?? []} /> : <div className="srv-operational-grid">
              <section className="srv-operation-list">{operationalWorkspace.actions.map((action, index) => { const labelFor = (key: string) => operationalWorkspace.summaryFields?.find(item => item.key === key)?.label ?? workspace.fields.find(item => item.key === key)?.label ?? key, completed = checklist[`item_${index + 1}`] === true, missing = action.requiredFields.filter(field => !fieldHasValue(formData[field])), ready = missing.length === 0; return <article className={completed ? "complete" : ""} key={action.key}><header><i>{completed ? <Check /> : index + 1}</i><div><strong>{action.title}</strong><small>{action.owner}</small></div><b>{completed ? "Recorded" : ready ? "Ready" : "Needs facts"}</b></header><p>{action.instruction}</p><dl><div><dt>Required record</dt><dd>{action.requiredFields.map(labelFor).join(" · ")}</dd></div><div><dt>Evidence created</dt><dd>{action.evidence}</dd></div></dl>{!completed && !ready && isCurrent ? <small className="srv-operation-help">Click below to enter: {missing.map(labelFor).join(" and ")}</small> : null}<button disabled={busy} onClick={() => recordOperationalAction(index)} type="button">{!isCurrent ? <><RotateCcw />Return to active Stage {currentIndex + 1}</> : completed ? <><RotateCcw />Reopen operation</> : ready ? <><CheckCircle2 />Record operation</> : <><FileText />Enter required facts</>}</button></article>; })}</section>
              {usesExternalIntake ? <IntakeSummaryPanel formData={formData} item={item} returnTo={stageReturnTo} summaryFields={operationalWorkspace.summaryFields ?? []} summaryInstruction={operationalWorkspace.summaryInstruction} summaryTitle={operationalWorkspace.summaryTitle} tools={operationalWorkspace.tools ?? []} /> : <section className="srv-stage-record"><header><FileText /><div><h3>{workspace.formTitle}</h3><p>Enter the facts used by the operations. Changing a recorded fact reopens its operation for confirmation.</p></div><span>{lifecycleWorkspace.currentDraft?.revision ? `Saved v${lifecycleWorkspace.currentDraft.revision}` : "Unsaved work"}</span></header><div>{workspace.fields.map(field => isCurrent ? <OperationalField disabled={busy} field={field} key={field.key} onChange={updateOperationalField} value={formData[field.key]} /> : <PreviewField field={field} key={field.key} />)}</div></section>}
            </div>}
          </div> : null}

          {workspaceView === "activity" ? <section className="srv-operational-activity"><header><Activity /><div><h3>Attributable Stage Activity</h3><p>Every recorded operation, correction, save, publication, and movement remains associated with its user and time.</p></div></header><div>{activityEntries.map(entry => <article key={entry.id}><i><Check /></i><div><strong>{entry.title}</strong><p>{entry.result}</p><small>{entry.actor} · {date(entry.occurredAt)} · {entry.evidence}</small></div></article>)}{lifecycleWorkspace.history.map(event => <article key={`history-${event.sequence}`}><i><History /></i><div><strong>{words(event.eventType)}</strong><p>{event.reason}</p><small>{event.actorName} · {date(event.occurredAt)}</small></div></article>)}{!activityEntries.length && !lifecycleWorkspace.history.length ? <p className="srv-operational-empty">No stage operations have been recorded. Begin in Work to Perform.</p> : null}</div></section> : null}

          {workspaceView === "evidence" ? <section className="srv-evidence srv-operational-evidence"><header><Camera /><div><h3>Documents &amp; Evidence</h3><p>Attach or reference the actual photos, scans, measurements, records, and documents produced while performing this stage.</p></div></header><div>{workspace.evidence.map((requirement, index) => <p key={requirement}><span>{evidence[index] ? <CheckCircle2 /> : <Camera />}</span><strong>{requirement}</strong><small>{evidence[index] ?? "Evidence reference required"}</small></p>)}</div>{isCurrent ? <label className="srv-evidence-entry"><span>Evidence references</span><textarea disabled={busy} onChange={event => { setEvidenceText(event.target.value); changed(); }} placeholder="One photo, document, measurement, or source record per line" value={evidenceText} /></label> : null}</section> : null}

          {workspaceView === "completion" ? <section className="srv-completion-workspace" id="stage-completion"><header><BookOpenCheck /><div><h3>Stage Completion Gate</h3><p>Review recorded work separately from the decision to publish evidence and move the vehicle.</p></div></header><div className="srv-completion-summary"><p><span>Operations recorded</span><strong>{activeProgress.complete} / {activeProgress.total}</strong></p><p><span>Evidence supplied</span><strong>{evidence.length} / {workspace.evidence.length}</strong></p><p><span>Completion authority</span><strong>{workspace.authority}</strong></p><p><span>Current status</span><strong>{dirty ? "Unsaved changes" : lifecycleWorkspace.currentEvidence ? `Published by ${lifecycleWorkspace.currentEvidence.publishedByName}` : lifecycleWorkspace.currentDraft ? `Saved by ${lifecycleWorkspace.currentDraft.savedByName}` : "Work not saved"}</strong></p></div>{lifecycleWorkspace.currentDraft ? <p className="srv-saved-work-note"><Save />Saved work: revision {lifecycleWorkspace.currentDraft.revision} · {date(lifecycleWorkspace.currentDraft.savedAt)} · {lifecycleWorkspace.currentDraft.reason}</p> : null}{completionControls}{feedback ? <p className={`srv-action-feedback ${feedback.tone}`}>{feedback.text}</p> : null}</section> : null}
        </section> : <><div className="srv-work-grid"><section className="srv-checklist"><header><ClipboardCheck /><div><h3>Stage Checklist</h3><p>Required before the card can advance.</p></div><span>{workspace.checklist.filter((_, index) => checklist[`item_${index + 1}`]).length} / {workspace.checklist.length}</span></header>{workspace.checklist.map((label, index) => { const key = `item_${index + 1}`, checked = checklist[key] === true; return <label key={label}><input checked={checked} disabled={!isCurrent || busy} onChange={event => { setChecklist(value => ({ ...value, [key]: event.target.checked })); changed(); }} type="checkbox" /><i>{checked ? <Check /> : <Circle />}</i><span><strong>{label}</strong><small>Required gate {index + 1}</small></span></label>; })}</section><section className="srv-form-preview"><header><FileText /><div><h3>{workspace.formTitle}</h3><p>{isCurrent ? "Work saves as an attributable draft." : "Read-only stage review."}</p></div><span>{lifecycleWorkspace.currentDraft?.revision ? `Draft v${lifecycleWorkspace.currentDraft.revision}` : "New draft"}</span></header><div>{workspace.fields.map(field => isCurrent ? <OperationalField disabled={busy} field={field} key={field.key} onChange={(key, value) => { setFormData(current => ({ ...current, [key]: value })); changed(); }} value={formData[field.key]} /> : <PreviewField field={field} key={field.key} />)}</div></section></div><section className="srv-evidence"><header><Camera /><div><h3>Required Evidence</h3><p>Enter one attachment, photo, measurement, or source reference per line. The saved revision remains in history.</p></div></header><div>{workspace.evidence.map((requirement, index) => <p key={requirement}><span>{evidence[index] ? <CheckCircle2 /> : <Camera />}</span><strong>{requirement}</strong><small>{evidence[index] ?? "Evidence reference required"}</small></p>)}</div>{isCurrent ? <label className="srv-evidence-entry"><span>Evidence references</span><textarea disabled={busy} onChange={event => { setEvidenceText(event.target.value); changed(); }} placeholder="One evidence reference per line" value={evidenceText} /></label> : null}</section></>}
      </section>

      <aside className="srv-workspace-rail">
        {item.pilot ? <section className="srv-pilot-panel"><h2><FlaskConical /> {item.pilot.label}</h2><p>{item.pilot.objective}</p><strong>Journey validation</strong><div>{pilotProgress.map(group => <p className={group.status.toLowerCase()} key={group.id}>{group.status === "COMPLETE" ? <CheckCircle2 /> : group.status === "IN_PROGRESS" ? <Clock3 /> : <Circle />}<span>{group.label}<small>Stages {group.fromStage}–{group.toStage} · {words(group.status)}</small></span></p>)}</div><details><summary>Exception drills</summary>{item.pilot.exceptionDrills.map(drill => <p key={drill.id}><AlertTriangle /><span><strong>{drill.label}</strong><small>Stage {SHOP_RECON_STAGES.find(stage => stage.code === drill.stage)?.order}: {drill.expectedControl}</small></span></p>)}</details><footer>Expected exit: <strong>{item.pilot.expectedHandoff}</strong></footer></section> : null}
        <section className="srv-current-context"><h2>Current Vehicle Context</h2><Fact icon={MapPin} label="Location" value={item.location} /><Fact icon={UserRound} label="Accountable owner" value={item.owner} /><Fact icon={Wrench} label="Technician / bay" value={[item.technician, item.bay].filter(Boolean).join(" · ") || "Not assigned"} /><Fact icon={Clock3} label={item.commitmentLabel} value={date(lifecycle.targetAt)} /></section>
        <SourceReturnPathPanel item={item} />
        <section><h2>Decision Authority</h2><p className="srv-authority"><LockKeyhole />{workspace.authority}</p><small>{item.authorizationPath}</small></section>
        <section><h2>Constraint &amp; Priority</h2>{lifecycle.blockerCodes.length ? <p className="srv-blocker"><AlertTriangle />{lifecycle.blockerCodes.map(String).join(", ")}</p> : <p className="srv-clear"><CheckCircle2 />No controlling blocker recorded.</p>}<dl><div><dt>Priority</dt><dd>{item.priorityBand} · {item.priorityScore}</dd></div><div><dt>Timing</dt><dd>{words(item.stageTargetBand)}</dd></div><div><dt>Parts</dt><dd>{item.waitingParts ? "Constrained" : "No constraint"}</dd></div></dl></section>
        <section><h2>Completion Path</h2><p>{item.completionHandoff}</p><small>The same card and history continue through handoff.</small></section>
        {isCurrent && lifecycle.stage === "REPAIR_EXECUTION" ? <section className="srv-policy-action"><h2>Changed Scope</h2><p>Use this when a new finding exceeds the approved work. A draft save alone does not authorize additional repair.</p><textarea disabled={busy} onChange={event => setScopeFinding(event.target.value)} placeholder="Describe the new finding and affected work" value={scopeFinding} /><button disabled={busy || scopeFinding.trim().length < 10} onClick={submitScopeChange} type="button"><RotateCcw />Stop affected work &amp; start scope review</button></section> : null}
        {isCurrent && lifecycleWorkspace.permissions.canOverride ? <details className="srv-policy-action"><summary>General Manager exception</summary><p>Permitted only for WIP, timing, queue, noncritical documentation, temporary resources, controlled backward movement, or reopening.</p><select disabled={busy} onChange={event => setOverrideKind(event.target.value)} value={overrideKind}><option value="WIP_LIMIT">WIP limit</option><option value="TARGET_TIME">Target time</option><option value="QUEUE_ORDER">Queue order</option><option value="NONCRITICAL_DOCUMENTATION">Noncritical documentation</option><option value="TEMPORARY_RESOURCE">Temporary resource</option><option value="CONTROLLED_BACKWARD_MOVEMENT">Controlled backward movement</option><option value="REOPEN_STAGE">Reopen stage</option></select><textarea disabled={busy} onChange={event => setOverrideReason(event.target.value)} placeholder="Explain the exception, boundary, and follow-up" value={overrideReason} /><button disabled={busy || overrideReason.trim().length < 10} onClick={grantOverride} type="button"><ShieldCheck />Record GM exception</button><small>Identity, custody, safety, customer authorization, inventory spending authority, technician qualification, legal records, failed QC, failed road test, and release acceptance cannot be overridden.</small></details> : null}
        {operationalWorkspace ? null : completionControls}
        {!operationalWorkspace && feedback ? <p className={`srv-action-feedback ${feedback.tone}`}>{feedback.text}</p> : null}
        <section><h2><History /> Recent Stage History</h2>{lifecycleWorkspace.history.length ? lifecycleWorkspace.history.slice(0, 5).map(event => <p className="srv-history-event" key={event.sequence}><strong>{words(event.eventType)}</strong><span>{event.actorName} · {date(event.occurredAt)}</span><small>{event.reason}</small></p>) : <small>No governed stage events yet. The first save initializes the operational lifecycle.</small>}</section>
        <section><h2>Policy Guardrails</h2><small>Scope change stops affected work and loops through findings, plan, authorization, and readiness. Failed QC or road test forces rework and a fresh QC; it cannot be overridden.</small></section>
      </aside>
    </main>
  </section>;
}

function LaneIcon({ lane }: { lane: ShopReconVehicleCardModel["workLane"] }) { return lane === "INVENTORY_RECON" ? <Building2 /> : <UserRound />; }
function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) { return <p className="srv-fact"><Icon /><span>{label}<strong>{value}</strong></span></p>; }
function resolveStageToolHref(tool: ShopReconOperationalTool, item: ShopReconVehicleCardModel, returnTo: string, stage?: (typeof SHOP_RECON_STAGES)[number]) {
  const stageFromReturn = (() => {
    try {
      const value = new URL(returnTo, "http://local").searchParams.get("stage");
      return value ? SHOP_RECON_STAGES.find(candidate => String(candidate.order) === value || candidate.code === value) : null;
    } catch {
      return null;
    }
  })();
  const stageContext = stage ?? stageFromReturn;
  const returnLabel = stageContext ? `Return to Shop & Recon · Stage ${stageContext.order}: ${stageContext.label}` : "Return to Shop & Recon";
  const returnContext = { returnLabel, returnTo };
  const encodedReturn = encodeURIComponent(returnTo);
  if (tool.key === "SCOPE_BUILDER") return `/vehicles/shop-recon/${encodeURIComponent(item.id)}/scope-builder?${new URLSearchParams(returnContext).toString()}`;
  if (tool.key === "LABOR_GUIDE") return `/diagnostics/labor-guide?${new URLSearchParams({ repairOrderId: item.id, ...returnContext }).toString()}`;
  if (tool.key === "VEHICLE_INTAKE_CUSTODY") return `/vehicles/shop-recon/${encodeURIComponent(item.id)}/vehicle-intake-custody?${new URLSearchParams(returnContext).toString()}`;
  if (tool.key === "SAFETY_MOBILITY_TRIAGE") return `/vehicles/shop-recon/${encodeURIComponent(item.id)}/safety-mobility-triage?${new URLSearchParams(returnContext).toString()}`;
  if (tool.key === "INSPECTION_CONCERN_VERIFICATION") return `/vehicles/shop-recon/${encodeURIComponent(item.id)}/inspection-concern-verification?${new URLSearchParams(returnContext).toString()}`;
  if (tool.key === "DIAGNOSTIC_MODULE") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/repair-workbench?${params.toString()}#diagnosis`;
  }
  if (tool.key === "DIAGNOSTIC_ASSIST_INSPECTION") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/repair-workbench?${params.toString()}#enterprise-diagnostics`;
  }
  if (tool.key === "REPAIR_WORKBENCH") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/repair-workbench?${params.toString()}#estimate`;
  }
  if (tool.key === "REPAIR_WORKBENCH_AUTHORIZATION") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/repair-workbench?${params.toString()}#authorization`;
  }
  if (tool.key === "PARTS_ORDERING_FORM") {
    const params = new URLSearchParams({ repairOrderId: item.id, repairOrderNumber: item.repairOrderNumber, vehicle: item.vehicle, ...returnContext });
    return `/diagnostics/parts-ordering?${params.toString()}`;
  }
  if (tool.key === "SHOP_DISPATCH") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/shop-dispatch?${params.toString()}`;
  }
  if (tool.key === "TECHNICIAN_WORKSPACE") return `/my-tasks?${new URLSearchParams(returnContext).toString()}`;
  if (tool.key === "REPAIR_WORKBENCH_EXECUTION") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/repair-workbench?${params.toString()}#repair`;
  }
  if (tool.key === "QUALITY_CONTROL") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/quality-control?${params.toString()}`;
  }
  if (tool.key === "SERVICE_ADVISOR") {
    const params = new URLSearchParams({ repairOrderId: item.id, ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}), ...returnContext });
    return `/vehicles/advisor?${params.toString()}`;
  }
  if (tool.key === "INVENTORY_LIFECYCLE_RETURN" && item.vehicleId) return `/vehicles/${encodeURIComponent(item.vehicleId)}/inventory-planning?returnTo=${encodedReturn}`;
  if (tool.key === "VEHICLE_360" && item.vehicleId) return `/vehicles/360/${encodeURIComponent(item.vehicleId)}?returnTo=${encodedReturn}`;
  if (tool.key === "INVENTORY_CARD" && item.vehicleId) return `/vehicles/360/${encodeURIComponent(item.vehicleId)}?returnTo=${encodedReturn}`;
  if (tool.key === "INVENTORY_LIFECYCLE_AUTHORIZATION" && item.vehicleId) return `/vehicles/${encodeURIComponent(item.vehicleId)}/inventory-planning?returnTo=${encodedReturn}`;
  if (tool.key === "INVENTORY_HANDOFF" && item.vehicleId) return `/vehicles/repair-orders?intakeSource=INVENTORY_RECON&vehicleId=${encodeURIComponent(item.vehicleId)}&returnTo=${encodedReturn}`;
  if (tool.key === "PRIOR_INSPECTION" && item.vehicleId) return `/vehicles/${encodeURIComponent(item.vehicleId)}/inventory-planning?returnTo=${encodedReturn}`;
  if (tool.key === "ACCEPT_HANDOFF") return "#stage-completion";
  return tool.href;
}
function SourceReturnPathPanel({ item }: { item: ShopReconVehicleCardModel }) {
  const inventory = item.workLane === "INVENTORY_RECON";
  return <section className="srv-source-path"><h2>Source &amp; Return Path</h2><dl><div><dt>Source system</dt><dd>{inventory ? "Inventory Lifecycle" : "Service Advisor"}</dd></div><div><dt>Shop lane</dt><dd>{item.workLaneLabel}</dd></div><div><dt>Source context</dt><dd>{inventory ? words(item.inventoryLifecycleStage ?? "RECON_PLAN_AND_APPROVAL") : item.repairOrderNumber}</dd></div><div><dt>Return destination</dt><dd>{inventory ? "Inventory Lifecycle" : "Service Advisor / Customer"}</dd></div><div><dt>Writeback status</dt><dd>{inventory ? "Pending Shop exit sync" : "Advisor handoff pending"}</dd></div></dl><p>{inventory ? "At Stage 16, Shop exit returns this dealership-owned unit to the Inventory Lifecycle with repair, QC, cost, and readiness evidence." : "At Stage 16, Shop exit returns this customer-owned vehicle to advisor/customer handoff with repair, QC, and release evidence."}</p></section>;
}
function PreviewField({ field }: { field: ShopReconFormField }) {
  if (field.type === "textarea") return <label className="wide"><span>{field.label}</span><textarea disabled placeholder={field.placeholder ?? "Stage notes"} /></label>;
  if (field.type === "select") return <label><span>{field.label}</span><select disabled defaultValue=""><option value="">Select…</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "checkbox") return <label className="checkbox"><input disabled type="checkbox" /><span>{field.label}</span></label>;
  return <label><span>{field.label}</span><input disabled placeholder={field.placeholder} type={field.type} /></label>;
}

function IntakeSummaryPanel({ formData, item, returnTo, summaryFields, summaryInstruction, summaryTitle, tools }: { formData: Record<string, unknown>; item: ShopReconVehicleCardModel; returnTo: string; summaryFields: readonly ShopReconOperationalSummaryField[]; summaryInstruction?: string; summaryTitle?: string; tools: readonly ShopReconOperationalTool[] }) {
  const valueFor = (field: ShopReconOperationalSummaryField) => {
    const value = formData[field.key];
    if (fieldHasValue(value)) return String(value);
    if (field.fallback === "workLaneLabel") return item.workLaneLabel;
    if (field.fallback === "vehicleIdentifier") return item.vin ?? item.subject;
    if (field.fallback === "subject") return item.subject;
    if (field.fallback === "concern") return item.concern;
    if (field.fallback === "targetDate") return item.targetAt ? new Date(item.targetAt).toLocaleDateString("en-US") : "";
    if (field.fallback === "owner") return item.owner;
    if (field.fallback === "inventoryLifecycleStage") return words(item.inventoryLifecycleStage ?? "RECON_PLAN_AND_APPROVAL");
    if (field.fallback === "completionHandoff") return item.completionHandoff;
    if (field.fallback === "repairOrderNumber") return item.repairOrderNumber;
    if (field.fallback === "authorizationPath") return item.authorizationPath;
  };
  const rows = summaryFields.map(field => ({ field, value: valueFor(field) }));
  const missing = rows.filter(row => !fieldHasValue(row.value));
  const complete = missing.length === 0;
  const correctionLabel = item.workLane === "INVENTORY_RECON" ? "Correct in Inventory Handoff" : "Correct in Intake Form";
  const normalizedVin = item.vin?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "";
  const vinLooksValid = /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin);
  const identityRows = [
    { key: "vin", label: "VIN / decode", ready: vinLooksValid, value: vinLooksValid ? `${normalizedVin} ready for decode verification` : item.vin ? "VIN exception review required" : "VIN or documented exception required" },
    { key: "canonical", label: "Canonical vehicle", ready: Boolean(item.vehicleId), value: item.vehicleId ? item.vehicle : "Vehicle 360 record not linked" },
    { key: "source", label: item.workLane === "INVENTORY_RECON" ? "Inventory source" : "Customer source", ready: item.workLane === "INVENTORY_RECON" ? Boolean(item.inventoryLifecycleStage) : Boolean(item.repairOrderNumber), value: item.workLane === "INVENTORY_RECON" ? words(item.inventoryLifecycleStage ?? "RECON_PLAN_AND_APPROVAL") : item.repairOrderNumber },
    { key: "duplicate", label: "Duplicate guard", ready: true, value: item.workLane === "INVENTORY_RECON" ? "Verify against inventory unit and open shop work" : "Verify against customer, appointment, and open RO" },
  ];
  return <section className="srv-intake-summary"><header><FileText /><div><h3>{summaryTitle ?? "Stage 1 Intake Summary"}</h3><p>{summaryInstruction ?? "The source workspace supplies Stage 1 facts. The vehicle card verifies readiness and records the governed stage decision."}</p></div><span className={complete ? "complete" : "missing"}>{complete ? item.workLane === "INVENTORY_RECON" ? "Handoff ready" : "Ready from intake" : `${missing.length} missing`}</span></header><div className="srv-intake-summary-grid">{rows.map(({ field, value }) => <p className={fieldHasValue(value) ? "complete" : "missing"} key={field.key}><span>{field.label}</span><strong>{fieldHasValue(value) ? value : item.workLane === "INVENTORY_RECON" ? "Needs Inventory Handoff" : "Needs Intake Form"}</strong></p>)}</div><section className="srv-identity-intelligence" aria-label="Vehicle identity intelligence"><header><Search /><div><small>Vehicle Identity Intelligence</small><strong>Verify the vehicle before Stage 1 can be trusted.</strong><span>{item.workLane === "INVENTORY_RECON" ? "Inventory source controls ownership; shop confirms identity and duplicate risk." : "Intake source controls customer identity; shop confirms the exact vehicle and RO path."}</span></div></header><div>{identityRows.map(row => <p className={row.ready ? "ready" : "missing"} key={row.key}>{row.ready ? <CheckCircle2 /> : <AlertTriangle />}<span><b>{row.label}</b>{row.value}</span></p>)}</div></section>{missing.length ? <p className="srv-intake-missing"><AlertTriangle />Missing Stage 1 facts: {missing.map(row => row.field.label).join(", ")}</p> : <p className="srv-intake-ready"><CheckCircle2 />Required Stage 1 handoff facts are present for review.</p>}<nav aria-label="Correct Stage 1 source facts">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key} title={tool.description}><FileText />{tool.key === "INTAKE_FORM" || tool.key === "INVENTORY_HANDOFF" ? correctionLabel : tool.label}</Link>)}</nav></section>;
}

function ScopeCommandWorkspace({ checklist, item, returnTo, tools }: { checklist: Record<string, boolean>; item: ShopReconVehicleCardModel; returnTo: string; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Reason selected", checklist.item_1, "Why the vehicle is here has been selected."],
    ["Work area selected", checklist.item_2, "The concern/recon area has been identified."],
    ["Allowed work defined", checklist.item_3, "The shop knows what it is allowed to do."],
    ["Stop rule defined", checklist.item_4, "The technician knows when to stop and ask."],
    ["Risk check completed", checklist.item_5, "Safety, road-test, parts and sublet risks have been answered."],
    ["Approval owner named", checklist.item_6, "The decision owner is named."],
    ["Scope reviewed and ready", checklist.item_7, "The summary was reviewed and scope is ready for Work Order."],
  ] as const;
  const completed = gates.filter(([, checked]) => checked).length;
  return <section className="srv-scope-command lifecycle-style" aria-label="Job Scope Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 2 Tool</small><h3>Scope Builder</h3><p>The Scope Builder form is the source of truth. Complete it there; the checklist underneath clears from the saved form answers.</p></div><span>{completed}/7 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Scope Builder tool link">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 2">{gates.map(([label, checked, note], index) => <article className={checked ? "checked" : ""} key={label}><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Locked"}</b></article>)}</section>
  </section>;
}

function WorkOrderCommandWorkspace({ busy, checklist, isCurrent, item, onChange, returnTo, setChecklist, setFormData, tools }: { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Scope Builder packet reviewed", "scopePacketReviewed", checklist.item_1, "Labor Guide is using the approved Stage 2 scope and stop rules."],
    ["Work order type selected", "workOrderTypeSelected", checklist.item_2, "The Labor Guide order type is selected."],
    ["Labor operations created", "laborOperationsCreated", checklist.item_3, "At least one technician-actionable labor operation exists."],
    ["Parts/material needs identified", "partsMaterialNeedsIdentified", checklist.item_4, "Parts, fluids, tires, sublet, or unknown needs are identified."],
    ["Authorization/approval path attached", "authorizationPathAttached", checklist.item_5, "Customer/advisor or inventory/Brock approval path is attached."],
    ["Technician stop instructions recorded", "technicianStopInstructionsRecorded", checklist.item_6, "The technician knows what is allowed and when to stop."],
    ["Work order ready for dispatch", "workOrderReadyForDispatch", checklist.item_7, "The Labor Guide packet is ready for the next Shop stage."],
  ] as const;
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label="Work Order Creation Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 3 Tool</small><h3>Labor Guide</h3><p>Use Labor Guide to create the actual work order. Then confirm each checklist line below before Stage 3 can advance.</p></div><span>{completed}/7 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Labor Guide tool link">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 3">{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function VehicleIntakeCommandWorkspace({ checklist, item, returnTo, tools }: { checklist: Record<string, boolean>; item: ShopReconVehicleCardModel; returnTo: string; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Vehicle identity matched", checklist.item_1, "Observed VIN, stock, or RO matches the controlled record."],
    ["Arrival condition recorded", checklist.item_2, "Arrival condition and visible damage notes are recorded."],
    ["Keys counted and tagged", checklist.item_3, "Key count and key tag/locker are controlled."],
    ["Photos/evidence captured", checklist.item_4, "Intake photo or evidence reference is attached."],
    ["Physical location assigned", checklist.item_5, "Current zone or lot position is recorded."],
    ["Movement restriction noted", checklist.item_6, "Movement boundary is recorded before safety triage."],
    ["Custody accepted", checklist.item_7, "Brock or Eli accepted accountable Shop custody."],
  ] as const;
  const completed = gates.filter(([, checked]) => checked).length;
  return <section className="srv-scope-command lifecycle-style" aria-label="Vehicle Intake & Custody Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 4 Tool</small><h3>Vehicle Intake &amp; Custody</h3><p>The physical check-in form is the source of truth. Complete it there; the checklist underneath clears from the saved form answers.</p></div><span>{completed}/7 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Vehicle Intake & Custody tool link">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 4">{gates.map(([label, checked, note], index) => <article className={checked ? "checked" : ""} key={label}><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Locked"}</b></article>)}</section>
  </section>;
}

function SafetyTriageCommandWorkspace({ checklist, item, returnTo, tools }: { checklist: Record<string, boolean>; item: ShopReconVehicleCardModel; returnTo: string; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Immediate safety hazard screen completed", checklist.item_1, "Leaks, brake/steering, and fire/electrical risks are screened."],
    ["Mobility status classified", checklist.item_2, "Vehicle mobility, start/run status, and move method are classified."],
    ["Road-test eligibility decided", checklist.item_3, "Road-test decision, reason, and authority are recorded."],
    ["Shop movement restriction recorded", checklist.item_4, "The movement boundary is clear before inspection."],
    ["Priority / risk level assigned", checklist.item_5, "The safety priority controls urgency and queue behavior."],
    ["Required containment action recorded", checklist.item_6, "Containment action and hold location are recorded."],
    ["Safety triage decision confirmed", checklist.item_7, "The movement, road-test, and inspection boundary is confirmed."],
  ] as const;
  const completed = gates.filter(([, checked]) => checked).length;
  return <section className="srv-scope-command lifecycle-style" aria-label="Safety & Mobility Triage Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 5 Tool</small><h3>Safety &amp; Mobility Triage</h3><p>The triage form is the source of truth. Complete it there; the checklist underneath clears from the saved form answers.</p></div><span>{completed}/7 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Safety & Mobility Triage tool link">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 5">{gates.map(([label, checked, note], index) => <article className={checked ? "checked" : ""} key={label}><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Locked"}</b></article>)}</section>
  </section>;
}

function InspectionVerificationCommandWorkspace({ checklist, item, returnTo, tools }: { checklist: Record<string, boolean>; item: ShopReconVehicleCardModel; returnTo: string; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Scope and work order reviewed", checklist.item_1, "Approved scope, Labor Guide operation, and stop rule are reviewed."],
    ["Vehicle identity and odometer confirmed", checklist.item_2, "VIN/RO match, odometer, and inspector are recorded."],
    ["Required inspection checklist completed", checklist.item_3, "The correct inspection template and safety items are recorded."],
    ["Concern verified or outcome classified", checklist.item_4, "The concern outcome and test condition are classified."],
    ["Measurements and observations recorded", checklist.item_5, "Measurements and observations are captured for diagnosis or repair planning."],
    ["Photo / video / scan evidence attached", checklist.item_6, "Material inspection evidence is attached or referenced."],
    ["Inspection result submitted for next decision", checklist.item_7, "The inspection packet is complete and the next decision path is selected."],
  ] as const;
  const completed = gates.filter(([, checked]) => checked).length;
  return <section className="srv-scope-command lifecycle-style" aria-label="Inspection & Concern Verification Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 6 Tool</small><h3>Inspection / Concern Verification</h3><p>The inspection form is the source of truth. Complete it there; the checklist underneath clears from the saved form answers.</p></div><span>{completed}/7 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Inspection & Concern Verification tool link">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 6">{gates.map(([label, checked, note], index) => <article className={checked ? "checked" : ""} key={label}><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Locked"}</b></article>)}</section>
  </section>;
}

function DiagnosisCommandWorkspace({ busy, checklist, isCurrent, item, onChange, returnTo, setChecklist, setFormData, tools }: { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Diagnostic evidence reviewed", "diagnosticEvidenceReviewed", checklist.item_1, "Verified concern, prior inspection, scan data, photos, and measurements are reviewed."],
    ["Diagnostic assist inspection performed", "diagnosticAssistInspectionPerformed", checklist.item_2, "The familiar inspection checklist is used to collect evidence for diagnosis, not to pass final QC."],
    ["Road test or static check completed or marked not needed", "diagnosticTestDriveOrStaticCheckCompleted", checklist.item_3, "Road-test, static check, or not-needed reason is recorded."],
    ["Diagnostic disposition selected", "diagnosticDispositionSelected", checklist.item_4, "No concern observed, concern found, possible repair needed, more diagnosis needed, or manager hold is selected."],
    ["Next decision controlled if concern found", "diagnosticNextStepControlled", checklist.item_5, "Concern found routes to repair planning, more diagnosis, scope review, or manager hold with observations attached."],
  ] as const;
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label="Diagnosis Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 7 Tool</small><h3>Diagnostic Module + Assist Inspection</h3><p>Use the Diagnostic Module for the decision. The assist inspection borrows the final-QC checklist pattern only to collect evidence for diagnosis.</p></div><span>{completed}/5 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Diagnostic Module tool link">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 7">{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function FindingsRepairPlanCommandWorkspace({ busy, checklist, isCurrent, item, onChange, returnTo, setChecklist, setFormData, tools }: { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Findings reviewed", "findingsReviewed", checklist.item_1, "Inspection and diagnosis evidence has been reviewed before planning."],
    ["Work needed classified", "workNeededClassified", checklist.item_2, "Findings are classified as safety, required, recommended, optional, cosmetic, deferred, or no action."],
    ["Repair plan created", "repairPlanCreated", checklist.item_3, "Repair operations are clear enough for labor, parts, dispatch, and technician execution."],
    ["Cost / resource impact prepared", "costResourceImpactPrepared", checklist.item_4, "Labor, parts, sublet, tools, bay needs, dependencies, and cost impact are identified."],
    ["Submitted for authorization", "submittedForAuthorization", checklist.item_5, "The current repair-plan version is ready for the correct approval path."],
  ] as const;
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label="Findings & Repair Plan Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 8 Tools</small><h3>Repair Workbench + Labor Guide</h3><p>Use Repair Workbench to build the plan and Labor Guide to support labor operations. The checklist below governs readiness for authorization.</p></div><span>{completed}/5 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Findings & Repair Plan tool links">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 8">{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function AuthorizationCommandWorkspace({ busy, checklist, isCurrent, item, onChange, returnTo, setChecklist, setFormData, tools }: { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] }) {
  const inventory = item.workLane === "INVENTORY_RECON";
  const gates = [
    ["Current repair-plan version reviewed", "repairPlanVersionReviewed", checklist.item_1, "The approving party is looking at the exact current Stage 8 repair plan and estimate version."],
    ["Approval authority confirmed", "approvalAuthorityConfirmed", checklist.item_2, inventory ? "Inventory lifecycle owner, Brock, or GM exception authority is confirmed." : "Customer authorization through Service Advisor is confirmed."],
    ["Decision recorded", "authorizationDecisionRecorded", checklist.item_3, "Accepted, partially accepted, declined, pending, or revision requested is recorded."],
    ["Approved scope and amount captured", "approvedScopeAmountCaptured", checklist.item_4, "Approved work, declined work, and dollar/labor/resource limit are captured."],
    ["Authorization submitted for readiness", "authorizationSubmittedForReadiness", checklist.item_5, "The authorized scope is ready to move into Parts & Resource Readiness."],
  ] as const;
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label="Authorization Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 9 Tools</small><h3>{inventory ? "Repair Workbench + Inventory Lifecycle Authorization" : "Repair Workbench + Service Advisor"}</h3><p>{inventory ? "Record the authorization decision in Repair Workbench and confirm the inventory lifecycle owner approved the dealership-owned repair scope." : "Record the authorization decision in Repair Workbench and use Service Advisor for customer approval communication."}</p></div><span>{completed}/5 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Authorization tool links">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 9">{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function PartsResourceReadinessCommandWorkspace({ busy, checklist, isCurrent, item, onChange, returnTo, setChecklist, setFormData, tools }: { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Authorized repair plan reviewed", "authorizedRepairPlanReviewed", checklist.item_1, "The Stage 9 approved scope is reviewed before ordering, reserving, or staging resources."],
    ["Parts demand created or marked not required", "partsDemandCreatedOrNotRequired", checklist.item_2, "Required parts, fluids, tires, and materials are created, or no parts are required."],
    ["Parts availability / order status confirmed", "partsAvailabilityConfirmed", checklist.item_3, "Parts are reserved, ordered, received, backordered, or intentionally held."],
    ["Resources and procedure needs confirmed", "resourcesProcedureNeedsConfirmed", checklist.item_4, "Special tools, bay needs, scan/calibration, service information, and procedures are identified."],
    ["Sublet / vendor need resolved", "subletVendorNeedResolved", checklist.item_5, "Vendor/sublet work is not required, selected, scheduled, or recorded as blocking."],
    ["Readiness decision submitted", "readinessDecisionSubmitted", checklist.item_6, "The job is marked ready for dispatch, waiting parts/resource/vendor, or manager review."],
  ] as const;
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label="Parts & Resource Readiness Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 10 Tools</small><h3>Parts Ordering Form + Repair Workbench</h3><p>Use the adopted Parts Ordering Form as the source of truth. Use Repair Workbench to verify the authorized repair plan.</p></div><span>{completed}/6 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Parts & Resource Readiness tool links">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 10">{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function DispatchWorkStagingCommandWorkspace({ busy, checklist, isCurrent, item, onChange, returnTo, setChecklist, setFormData, tools }: { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Authorization and readiness gates passed", "authorizationReadinessGatesPassed", checklist.item_1, "Stage 9 authorization and Stage 10 parts/resource readiness are clear."],
    ["Technician eligibility confirmed", "technicianEligibilityConfirmed", checklist.item_2, "Walter Hernandez or another qualified technician is matched to the work."],
    ["Bay and time slot reserved", "bayTimeSlotReserved", checklist.item_3, "One of the two shop bays and a staffed time window are assigned."],
    ["Vehicle, keys, and parts staged", "vehicleKeysPartsStaged", checklist.item_4, "Vehicle location, keys, parts kit/materials, and sublet items are ready."],
    ["Current repair instructions reviewed", "currentRepairInstructionsReviewed", checklist.item_5, "The technician sees the latest authorized scope, stop rules, safety limits, and notes."],
    ["WIP limit / queue position confirmed", "wipQueuePositionConfirmed", checklist.item_6, "The two-bay WIP limit and queue order are respected, or a GM exception exists."],
    ["Dispatch published", "dispatchPublished", checklist.item_7, "The dispatch decision records who, where, when, and under what instructions."],
  ] as const;
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label="Dispatch & Work Staging Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 11 Tools</small><h3>Shop Dispatch + Repair Workbench</h3><p>Use Shop Dispatch as the control tower for assignment, bay, WIP, keys, parts, and staging. Use Repair Workbench to review the current authorized instructions.</p></div><span>{completed}/7 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Dispatch & Work Staging tool links">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 11">{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function RepairExecutionCommandWorkspace({ busy, checklist, isCurrent, item, onChange, returnTo, setChecklist, setFormData, tools }: { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] }) {
  const gates = [
    ["Dispatch accepted and work started", "dispatchAcceptedWorkStarted", checklist.item_1, "The assigned technician accepted the dispatched job and began controlled work."],
    ["Current authorized instructions reviewed", "authorizedInstructionsReviewedForRepair", checklist.item_2, "Latest scope, stop rules, safety limits, parts status, and procedure notes are reviewed."],
    ["Labor clock / event recorded", "laborClockEventRecorded", checklist.item_3, "An attributable labor start, pause, resume, or finish event exists."],
    ["Authorized repair work performed", "authorizedRepairWorkPerformed", checklist.item_4, "Only the approved repair work was performed using current procedures and staged resources."],
    ["Parts/materials consumed recorded", "partsMaterialsConsumedRecorded", checklist.item_5, "Installed parts, fluids, materials, or no-consumption status are recorded."],
    ["Repair evidence / measurements attached", "repairEvidenceMeasurementsAttached", checklist.item_6, "Photos, measurements, scans, readings, or repair proof are attached for QC."],
    ["Changed scope stopped or no-change confirmed", "changedScopeStoppedOrNoChangeConfirmed", checklist.item_7, "New findings were stopped for scope review, or no scope change is confirmed."],
  ] as const;
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label="Repair Execution Checklist">
    <header><ClipboardCheck /><div><small>Official Stage 12 Tools</small><h3>Technician Workspace + Repair Workbench</h3><p>Use Technician Workspace / My Work for labor clocks, repair events, evidence, and changed-scope control. Use Repair Workbench to review the current authorized packet.</p></div><span>{completed}/7 checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label="Repair Execution tool links">{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label="Checklist required to unlock Stage 12">{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function TechnicianCompletionCommandWorkspace(props: FinalStageCommandProps) {
  return <FinalStageCommandWorkspace {...props} ariaLabel="Technician Completion Checklist" checklistLabel="Checklist required to unlock Stage 13" countLabel="5" gates={[
    ["Execution complete confirmed", "executionCompleteConfirmed", props.checklist.item_1, "The authorized repair is complete enough for QC."],
    ["Completion evidence attached", "completionEvidenceAttached", props.checklist.item_2, "Photos, measurements, scans, readings, or proof are attached."],
    ["Labor closed / no running clock", "laborClosedNoRunningClock", props.checklist.item_3, "Labor is finished and no running repair clock remains."],
    ["Correction and measurements documented", "correctionMeasurementsDocumented", props.checklist.item_4, "The correction, final measurements, and technician notes are documented."],
    ["Submitted for independent QC", "submittedForIndependentQc", props.checklist.item_5, "The completed repair packet is submitted for QC."],
  ]} heading="Technician Workspace + Repair Workbench" stageLabel="Official Stage 13 Tools" text="Use Technician Workspace / My Work to finish labor and submit completion evidence. Use Repair Workbench to review job status and execution history." />;
}

function QualityControlCommandWorkspace(props: FinalStageCommandProps) {
  return <FinalStageCommandWorkspace {...props} ariaLabel="Quality Control & Road Test Checklist" checklistLabel="Checklist required to unlock Stage 14" countLabel="5" gates={[
    ["Repair evidence reviewed", "repairEvidenceReviewedForQc", props.checklist.item_1, "Technician completion evidence and repair history are reviewed."],
    ["Independent QC performed", "independentQcPerformed", props.checklist.item_2, "QC is performed independently from the repair technician whenever possible."],
    ["Road test completed or marked not required", "roadTestCompletedOrNotRequired", props.checklist.item_3, "Road test result or not-required reason is recorded."],
    ["QC disposition passed", "qcDispositionPassed", props.checklist.item_4, "QC pass decision is recorded for release readiness."],
    ["Rework loop controlled if failed", "reworkLoopControlledIfFailed", props.checklist.item_5, "Failed QC/road test is routed back to repair; otherwise no rework loop is open."],
  ]} heading="Quality Control + Repair Workbench" stageLabel="Official Stage 14 Tools" text="Use Quality Control for independent verification and road-test decision. Failed QC returns to repair execution for rework." />;
}

function ReleaseReadinessCommandWorkspace(props: FinalStageCommandProps) {
  const inventory = props.item.workLane === "INVENTORY_RECON";
  return <FinalStageCommandWorkspace {...props} ariaLabel="Release & Handover Readiness Checklist" checklistLabel="Checklist required to unlock Stage 15" countLabel="5" gates={[
    ["QC and road-test pass confirmed", "qcRoadTestPassConfirmed", props.checklist.item_1, "QC passed and road test passed or was not required."],
    ["Final scope and cost reconciled", "finalScopeCostReconciled", props.checklist.item_2, "Final scope, cost, approval, declined work, and lane-specific charges are reconciled."],
    ["Keys and documents reconciled", "keysDocumentsReconciled", props.checklist.item_3, "Keys, documents, photos, and final notes are ready."],
    ["Destination and receiving party confirmed", "destinationReceivingPartyConfirmed", props.checklist.item_4, "The receiving destination and accountable receiving party are clear."],
    ["Release readiness submitted", "releaseReadinessSubmitted", props.checklist.item_5, "Release readiness is submitted for physical handoff."],
  ]} heading={inventory ? "Inventory Lifecycle Return + Repair Workbench" : "Service Advisor + Repair Workbench"} stageLabel="Official Stage 15 Tools" text={inventory ? "Prepare the dealership-owned vehicle to return to Inventory Lifecycle with final cost, QC, keys, and readiness evidence." : "Prepare the customer vehicle for advisor/customer release with final cost, QC, keys, and readiness evidence."} />;
}

function ShopExitCommandWorkspace(props: FinalStageCommandProps) {
  const inventory = props.item.workLane === "INVENTORY_RECON";
  return <FinalStageCommandWorkspace {...props} ariaLabel="Vehicle Handover & Shop Exit Checklist" checklistLabel="Checklist required to unlock Stage 16" countLabel="5" gates={[
    ["Release readiness verified", "releaseReadinessVerified", props.checklist.item_1, "The current release-readiness version is verified before handoff."],
    ["Vehicle and keys transferred", "vehicleKeysTransferred", props.checklist.item_2, "Vehicle, keys, documents, and custody are transferred."],
    ["Receiving-party acceptance captured", "receivingPartyAcceptanceCaptured", props.checklist.item_3, "Receiving Inventory owner, Service Advisor, or customer acceptance is recorded."],
    ["Final location and exit recorded", "finalLocationExitRecorded", props.checklist.item_4, "Final location, exit time, and physical Shop exit are recorded."],
    ["Return path synced", "returnPathSynced", props.checklist.item_5, "The card returns to Inventory Lifecycle or Service Advisor/customer handoff."],
  ]} heading={inventory ? "Inventory Lifecycle Return + Vehicle 360" : "Service Advisor + Vehicle 360"} stageLabel="Official Stage 16 Tools" text={inventory ? "Record accepted custody transfer back to Inventory Lifecycle and close Shop control." : "Record customer/advisor handoff, final custody transfer, and Shop exit."} />;
}

type FinalStageCommandProps = { busy: boolean; checklist: Record<string, boolean>; isCurrent: boolean; item: ShopReconVehicleCardModel; onChange: () => void; returnTo: string; setChecklist: Dispatch<SetStateAction<Record<string, boolean>>>; setFormData: Dispatch<SetStateAction<Record<string, unknown>>>; tools: readonly ShopReconOperationalTool[] };
function FinalStageCommandWorkspace({ ariaLabel, busy, checklistLabel, countLabel, gates, heading, isCurrent, item, onChange, returnTo, setChecklist, setFormData, stageLabel, text, tools }: FinalStageCommandProps & { ariaLabel: string; checklistLabel: string; countLabel: string; gates: readonly (readonly [string, string, boolean, string])[]; heading: string; stageLabel: string; text: string }) {
  const completed = gates.filter(([, , checked]) => checked).length;
  function toggle(index: number, fieldKey: string, current: boolean) {
    if (!isCurrent || busy) return;
    const next = !current;
    setChecklist(value => ({ ...value, [`item_${index + 1}`]: next }));
    setFormData(value => ({ ...value, [fieldKey]: next }));
    onChange();
  }
  return <section className="srv-scope-command lifecycle-style" aria-label={ariaLabel}>
    <header><ClipboardCheck /><div><small>{stageLabel}</small><h3>{heading}</h3><p>{text}</p></div><span>{completed}/{countLabel} checked</span></header>
    <section className="srv-scope-tool-tray single" aria-label={`${ariaLabel} tool links`}>{tools.map(tool => <Link href={resolveStageToolHref(tool, item, returnTo)} key={tool.key}><FileText /><span><b>Open {tool.label}</b>{tool.description}</span></Link>)}</section>
    <section className="srv-scope-action-checklist official" aria-label={checklistLabel}>{gates.map(([label, fieldKey, checked, note], index) => <button className={checked ? "checked" : ""} disabled={!isCurrent || busy} key={fieldKey} onClick={() => toggle(index, fieldKey, checked)} type="button"><i>{checked ? <Check /> : index + 1}</i><div><strong>{label}</strong><span>{note}</span></div><b>{checked ? "Checked" : "Check when done"}</b></button>)}</section>
  </section>;
}

function OperationalField({ field, value, disabled, onChange }: { field: ShopReconFormField; value: unknown; disabled: boolean; onChange: (key: string, value: unknown) => void }) {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (field.type === "textarea") return <label className="wide"><span>{field.label}</span><textarea disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, event.target.value)} placeholder={field.placeholder ?? "Stage notes"} value={text} /></label>;
  if (field.type === "select") return <label><span>{field.label}</span><select disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, event.target.value)} value={text}><option value="">Select…</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "checkbox") return <label className="checkbox"><input checked={value === true} disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, event.target.checked)} type="checkbox" /><span>{field.label}</span></label>;
  return <label><span>{field.label}</span><input disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, field.type === "number" ? event.target.valueAsNumber : event.target.value)} placeholder={field.placeholder} type={field.type} value={text} /></label>;
}

