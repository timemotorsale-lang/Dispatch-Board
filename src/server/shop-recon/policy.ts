import type { AuthenticatedUser } from "@/server/auth/store";
import { isGeneralManager } from "@/server/policies/access";
import { SHOP_RECON_STAGES, type ShopReconStageCode } from "./foundation";
import { getShopReconOperationalWorkspace, type ShopReconWorkLane } from "./operational-workspace";
import { getShopReconStageWorkspace } from "./stage-workspace";
import { evaluateShopReconTransition, type ShopReconGateFact } from "./workflow";

export const SHOP_RECON_OVERRIDE_KINDS = [
  "WIP_LIMIT",
  "TARGET_TIME",
  "QUEUE_ORDER",
  "NONCRITICAL_DOCUMENTATION",
  "TEMPORARY_RESOURCE",
  "CONTROLLED_BACKWARD_MOVEMENT",
  "REOPEN_STAGE",
] as const;

export type ShopReconOverrideKind = (typeof SHOP_RECON_OVERRIDE_KINDS)[number];

export const SHOP_RECON_NON_OVERRIDABLE_BOUNDARIES = [
  "VEHICLE_IDENTITY",
  "CUSTODY_ACCEPTANCE",
  "SAFETY_CLEARANCE",
  "CUSTOMER_AUTHORIZATION",
  "INVENTORY_SPENDING_AUTHORITY",
  "TECHNICIAN_QUALIFICATION",
  "LEGAL_DOCUMENTATION",
  "FAILED_QC",
  "FAILED_ROAD_TEST",
  "RELEASE_ACCEPTANCE",
] as const;

const technicalStages: ShopReconStageCode[] = ["INSPECTION_CONCERN_VERIFICATION", "DIAGNOSIS", "REPAIR_EXECUTION", "TECHNICIAN_COMPLETION"];
const shopAuthorityStages: ShopReconStageCode[] = ["JOB_SCOPE_DEFINITION", "WORK_ORDER_CREATION", "VEHICLE_INTAKE_CUSTODY", "SAFETY_MOBILITY_TRIAGE", "FINDINGS_REPAIR_PLAN", "PARTS_RESOURCE_READINESS", "DISPATCH_WORK_STAGING", "RELEASE_HANDOVER_READINESS", "VEHICLE_HANDOVER_SHOP_EXIT"];
const technicalRoles = ["Technician", "Mechanic", "Service Technician", "Master Technician"];
const hardFacts: ShopReconGateFact[] = ["JOB_INTAKE_COMPLETE", "JOB_SCOPE_DEFINED", "WORK_ORDER_CREATED", "IDENTITY_MATCHED", "CUSTODY_ACCEPTED", "AUTHORIZATION_CURRENT", "TECHNICIAN_ELIGIBLE", "PROCEDURE_CURRENT", "EXECUTION_COMPLETE", "COMPLETION_EVIDENCE", "TECHNICIAN_SIGNOFF", "QC_PASSED", "ROAD_TEST_PASSED_OR_NOT_REQUIRED", "RELEASE_READY", "HANDOFF_ACCEPTED"];

function requiredText(value: unknown, label: string, minimum = 1, maximum = 2_000) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < minimum) throw new Error(`${label} is required.`);
  if (text.length > maximum) throw new Error(`${label} must be ${maximum} characters or fewer.`);
  return text;
}

function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function strings(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  return [...new Set(value.map(item => typeof item === "string" ? item.trim() : "").filter(Boolean))];
}

function stage(value: unknown, label = "Stage") {
  const candidate = String(value ?? "") as ShopReconStageCode;
  if (!SHOP_RECON_STAGES.some(item => item.code === candidate)) throw new Error(`${label} is invalid.`);
  return candidate;
}

function named(actor: AuthenticatedUser, name: string) { return actor.name.trim().toLowerCase() === name.toLowerCase() || actor.name.trim().toLowerCase().startsWith(`${name.toLowerCase()} `); }

export function normalizeShopReconDraft(value: unknown) {
  const raw = record(value, "Stage draft"), checklist = record(raw.checklist ?? {}, "Checklist"), formData = record(raw.formData ?? {}, "Form data");
  return {
    stage: stage(raw.stage),
    expectedVersion: Number(raw.expectedVersion),
    idempotencyKey: requiredText(raw.idempotencyKey, "Idempotency key", 1, 200),
    reason: requiredText(raw.reason, "Save reason", 10, 500),
    checklist: Object.fromEntries(Object.entries(checklist).map(([key, checked]) => [key, checked === true])),
    formData,
    evidence: strings(raw.evidence ?? [], "Evidence"),
  };
}

export function normalizeShopReconTransition(value: unknown) {
  const raw = record(value, "Stage transition"), factsRaw = record(raw.facts ?? {}, "Gate facts");
  return {
    toStage: stage(raw.toStage, "Destination stage"),
    expectedVersion: Number(raw.expectedVersion),
    idempotencyKey: requiredText(raw.idempotencyKey, "Idempotency key", 1, 200),
    reason: requiredText(raw.reason, "Transition reason", 10, 500),
    facts: factsRaw as Partial<Record<ShopReconGateFact, boolean>>,
    overrideId: typeof raw.overrideId === "string" && raw.overrideId.trim() ? raw.overrideId.trim() : null,
  };
}

export function normalizePublishShopReconEvidence(value: unknown) {
  const raw = record(value, "Operational evidence");
  return { expectedVersion: Number(raw.expectedVersion), idempotencyKey: requiredText(raw.idempotencyKey, "Idempotency key", 1, 200), reason: requiredText(raw.reason, "Publication reason", 10, 500) };
}

export function normalizeShopReconOverride(value: unknown) {
  const raw = record(value, "Override"), kind = String(raw.kind ?? "") as ShopReconOverrideKind;
  if (!SHOP_RECON_OVERRIDE_KINDS.includes(kind)) throw new Error("Override kind is invalid.");
  const parseDate = (candidate: unknown) => candidate ? new Date(String(candidate)) : null;
  const expiresAt = parseDate(raw.expiresAt), followUpAt = parseDate(raw.followUpAt);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error("Override expiry is invalid.");
  if (followUpAt && Number.isNaN(followUpAt.getTime())) throw new Error("Override follow-up is invalid.");
  return { kind, expectedVersion: Number(raw.expectedVersion), idempotencyKey: requiredText(raw.idempotencyKey, "Idempotency key", 1, 200), reason: requiredText(raw.reason, "Override explanation", 10, 1_000), boundaries: strings(raw.boundaries ?? [], "Override boundaries"), expiresAt, followUpAt };
}

export function normalizeShopReconScopeChange(value: unknown) {
  const raw = record(value, "Scope change");
  return {
    expectedVersion: Number(raw.expectedVersion),
    idempotencyKey: requiredText(raw.idempotencyKey, "Idempotency key", 1, 200),
    reason: requiredText(raw.reason, "Scope-change reason", 10, 500),
    finding: requiredText(raw.finding, "New finding", 10, 2_000),
    affectedRepairJobIds: strings(raw.affectedRepairJobIds ?? [], "Affected repair jobs"),
    originalScope: record(raw.originalScope ?? {}, "Original scope"),
    proposedScope: record(raw.proposedScope ?? {}, "Proposed scope"),
  };
}

export function canCompleteShopReconStage(actor: AuthenticatedUser, stageCode: ShopReconStageCode) {
  if (stageCode === "SERVICE_RECON_JOB_INTAKE") return { allowed: named(actor, "Brock") || named(actor, "Eli") || actor.roles.includes("Service Advisor") || actor.roles.includes("Inventory Manager"), authority: "Service Advisor or Inventory intake authority" };
  if (stageCode === "AUTHORIZATION") return { allowed: named(actor, "Brock") || named(actor, "Eli") || actor.roles.includes("Service Advisor") || actor.roles.includes("Inventory Manager"), authority: "Lane authorization authority" };
  if (stageCode === "QUALITY_CONTROL_ROAD_TEST") return { allowed: named(actor, "Brock") || actor.roles.includes("Quality Control") || actor.roles.includes("Quality Inspector"), authority: "Qualified independent QC" };
  if (technicalStages.includes(stageCode)) return { allowed: named(actor, "Walter Hernandez") || actor.roles.some(role => technicalRoles.includes(role)), authority: "Assigned qualified technician" };
  if (shopAuthorityStages.includes(stageCode)) return { allowed: named(actor, "Brock") || named(actor, "Eli") || actor.roles.includes("Service Department Manager"), authority: "Shop operations authority" };
  return { allowed: false, authority: "Designated stage authority" };
}

export function evaluateDraftCompletion(stageCode: ShopReconStageCode, draft: { checklist: unknown; formData: unknown; evidence: unknown }, lane?: ShopReconWorkLane) {
  const workspace = getShopReconStageWorkspace(stageCode), checklist = record(draft.checklist, "Checklist"), formData = record(draft.formData, "Form data"), evidence = strings(draft.evidence, "Evidence");
  const operationalWorkspace = stageCode === "SERVICE_RECON_JOB_INTAKE" ? getShopReconOperationalWorkspace(stageCode, lane) : null;
  const checklistItems = operationalWorkspace?.actions ?? workspace.checklist;
  const requiredFieldKeys = operationalWorkspace?.actions.flatMap(action => action.requiredFields) ?? workspace.fields.map(field => field.key);
  const incompleteChecklist = checklistItems.filter((_, index) => checklist[`item_${index + 1}`] !== true);
  const missingFields = [...new Set(requiredFieldKeys)].filter(key => {
    const value = formData[key];
    const definition = workspace.fields.find(field => field.key === key);
    return value === undefined || value === null || value === "" || (definition?.type === "checkbox" && value !== true);
  });
  const missingEvidenceCount = Math.max(0, workspace.evidence.length - evidence.length);
  return { complete: !incompleteChecklist.length && !missingFields.length && missingEvidenceCount === 0, incompleteChecklist, missingFields, missingEvidenceCount };
}

export function evaluateGovernedTransition(input: { actor: AuthenticatedUser; fromStage: ShopReconStageCode; toStage: ShopReconStageCode; facts: Partial<Record<ShopReconGateFact, boolean>>; draft: { checklist: unknown; formData: unknown; evidence: unknown }; lane?: ShopReconWorkLane; override: { kind: string; authorizedByUserId: string; expiresAt: Date | null } | null; now: Date }) {
  const base = evaluateShopReconTransition({ fromStage: input.fromStage, toStage: input.toStage, facts: input.facts }), draft = evaluateDraftCompletion(input.fromStage, input.draft, input.lane), authority = canCompleteShopReconStage(input.actor, input.fromStage);
  const overrideActive = Boolean(input.override && (!input.override.expiresAt || input.override.expiresAt > input.now));
  const hardMissingFacts = base.missingFacts.filter(fact => hardFacts.includes(fact));
  const backwards = SHOP_RECON_STAGES.find(item => item.code === input.toStage)!.order <= SHOP_RECON_STAGES.find(item => item.code === input.fromStage)!.order;
  const transitionOverridden = overrideActive && backwards && ["CONTROLLED_BACKWARD_MOVEMENT", "REOPEN_STAGE"].includes(input.override!.kind);
  const documentationOverridden = overrideActive && input.override!.kind === "NONCRITICAL_DOCUMENTATION";
  const resourceOverridden = overrideActive && input.override!.kind === "TEMPORARY_RESOURCE";
  const authorityOverridden = overrideActive && isGeneralManager(input.actor);
  const remainingMissingFacts = base.missingFacts.filter(fact => !(resourceOverridden && fact === "BAY_ELIGIBLE"));
  const blockerCodes = [
    ...(!base.transitionAllowed && !transitionOverridden ? ["BLK-WORKFLOW-TRANSITION_INVALID"] : []),
    ...remainingMissingFacts.map(fact => `${hardFacts.includes(fact) ? "BLK-NONOVERRIDABLE" : "BLK-GATE"}-${fact}`),
    ...(!draft.complete && !documentationOverridden ? ["BLK-STAGE-DRAFT-INCOMPLETE"] : []),
    ...(!authority.allowed && !authorityOverridden ? ["BLK-STAGE-AUTHORITY"] : []),
  ];
  return { allowed: blockerCodes.length === 0, blockerCodes, missingFacts: base.missingFacts, hardMissingFacts, draft, authority, overrideActive, transitionOverridden, documentationOverridden, resourceOverridden };
}
