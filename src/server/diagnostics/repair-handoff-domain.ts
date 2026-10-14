import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_REPAIR_HANDOFF_POLICY_VERSION = "DGN-028-032/POLICY/1.0.0";
export const DIAGNOSTIC_REPAIR_HANDOFF_TYPES = ["PUBLISH_DIAGNOSIS", "REPAIR_RECOMMENDATION", "ESTIMATE_AUTHORIZATION", "DISPATCH_REQUIREMENTS", "PARTS_READINESS"] as const;
export type DiagnosticRepairHandoffType = (typeof DIAGNOSTIC_REPAIR_HANDOFF_TYPES)[number];
export type DiagnosticRepairHandoffStatus = "READY_FOR_REVIEW" | "PUBLISHED" | "BLOCKED";

export type DiagnosticRepairOperation = {
  key: string;
  description: string;
  workTypeCode: string;
  durationMinutes: { minimum: number; likely: number; maximum: number };
  requiredSkills: string[];
  requiredCertifications: string[];
  bayRequirements: string[];
  toolRequirements: string[];
  parts: Array<{ partKey: string; description: string; quantity: number; fitmentBasis: string; substituteReviewRequired: boolean }>;
  hazards: string[];
  procedures: string[];
  qcChecks: string[];
};

export type DiagnosticRepairHandoffControlInput = {
  diagnosticCaseId: string;
  repairOrderId: string;
  handoffType: DiagnosticRepairHandoffType;
  conclusion: { id: string; status: string; causeStatement: string | null; uncertainty: string; conclusionChecksum: string; occurredAt: string } | null;
  latestConclusionId: string | null;
  repairDiagnosisVersionId: string | null;
  recommendation: string;
  proposedCorrection: string;
  operations: DiagnosticRepairOperation[];
  estimateBoundary: { advisorReviewRequired: boolean; customerAuthorizationRequired: boolean; changedScopeReturnPath: string; staleAfterHours: number | null };
  dispatchBoundary: { resourceRequirementOnly: boolean; managerOverrideRequired: boolean; earliestStartAt: string | null; latestFinishAt: string | null };
  partsBoundary: { demandSignalOnly: boolean; substituteReviewRequired: boolean; purchaseMutationProhibited: boolean; shortageReviewRequired: boolean };
  sourceVersions: Array<{ sourceKey: string; version: string; rightsStatus: string; current: boolean }>;
  actorUserId: string;
};

const canonical = (value: string) => value.trim().toUpperCase();
const unique = (values: string[]) => [...new Set(values.map(canonical).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function text(value: unknown, label: string, max = 1000) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

function optionalText(value: unknown, max = 1000) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max) throw new Error(`Text value must be ${max} characters or fewer.`);
  return result || null;
}

function positiveWhole(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1) throw new Error(`${label} must be a positive whole number.`);
  return result;
}

function strings(value: unknown, label: string, required = false) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  const result = unique(value.map(String));
  if (required && !result.length) throw new Error(`${label} requires at least one item.`);
  return result;
}

function normalizeOperation(value: unknown, index: number): DiagnosticRepairOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Repair operation ${index + 1} is invalid.`);
  const raw = value as Record<string, unknown>;
  const minimum = positiveWhole(raw.minimumMinutes ?? raw.durationMinimumMinutes, `Repair operation ${index + 1} minimum duration`);
  const likely = positiveWhole(raw.likelyMinutes ?? raw.durationLikelyMinutes, `Repair operation ${index + 1} likely duration`);
  const maximum = positiveWhole(raw.maximumMinutes ?? raw.durationMaximumMinutes, `Repair operation ${index + 1} maximum duration`);
  if (minimum > likely || likely > maximum) throw new Error(`Repair operation ${index + 1} duration range must be minimum <= likely <= maximum.`);
  const parts = Array.isArray(raw.parts) ? raw.parts.map((part, partIndex) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) throw new Error(`Repair operation ${index + 1} part ${partIndex + 1} is invalid.`);
    const row = part as Record<string, unknown>;
    return { partKey: canonical(text(row.partKey, `Repair operation ${index + 1} part ${partIndex + 1} key`, 100)), description: text(row.description, `Repair operation ${index + 1} part ${partIndex + 1} description`, 300), quantity: positiveWhole(row.quantity, `Repair operation ${index + 1} part ${partIndex + 1} quantity`), fitmentBasis: text(row.fitmentBasis, `Repair operation ${index + 1} part ${partIndex + 1} fitment basis`, 500), substituteReviewRequired: row.substituteReviewRequired === true };
  }) : [];
  return {
    key: canonical(text(raw.key, `Repair operation ${index + 1} key`, 100)),
    description: text(raw.description, `Repair operation ${index + 1} description`, 500),
    workTypeCode: canonical(text(raw.workTypeCode, `Repair operation ${index + 1} work type`, 100)),
    durationMinutes: { minimum, likely, maximum },
    requiredSkills: strings(raw.requiredSkills ?? [], `Repair operation ${index + 1} required skills`, true),
    requiredCertifications: strings(raw.requiredCertifications ?? [], `Repair operation ${index + 1} required certifications`),
    bayRequirements: strings(raw.bayRequirements ?? [], `Repair operation ${index + 1} bay requirements`),
    toolRequirements: strings(raw.toolRequirements ?? [], `Repair operation ${index + 1} tool requirements`),
    parts,
    hazards: strings(raw.hazards ?? [], `Repair operation ${index + 1} hazards`),
    procedures: strings(raw.procedures ?? [], `Repair operation ${index + 1} procedures`, true),
    qcChecks: strings(raw.qcChecks ?? [], `Repair operation ${index + 1} QC checks`, true)
  };
}

export function normalizeDiagnosticRepairHandoffCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Diagnostic repair handoff request must be an object.");
  const raw = value as Record<string, unknown>;
  const handoffType = canonical(String(raw.handoffType ?? "")) as DiagnosticRepairHandoffType;
  if (!DIAGNOSTIC_REPAIR_HANDOFF_TYPES.includes(handoffType)) throw new Error("Diagnostic repair handoff type is invalid.");
  const expectedVersion = positiveWhole(raw.expectedVersion, "Expected diagnostic-case version");
  const idempotencyKey = text(raw.idempotencyKey, "Handoff idempotency key", 200);
  const reason = text(raw.reason, "Handoff reason", 500);
  const operations = Array.isArray(raw.operations) ? raw.operations.map(normalizeOperation) : [];
  return {
    handoffType,
    expectedVersion,
    idempotencyKey,
    reason,
    conclusionId: optionalText(raw.conclusionId, 200),
    recommendation: text(raw.recommendation, "Repair recommendation", 2000),
    proposedCorrection: text(raw.proposedCorrection, "Proposed correction", 2000),
    operations,
    estimateBoundary: {
      advisorReviewRequired: raw.advisorReviewRequired !== false,
      customerAuthorizationRequired: raw.customerAuthorizationRequired !== false,
      changedScopeReturnPath: text(raw.changedScopeReturnPath ?? "Return changed scope to Diagnostics for superseding conclusion or limitation.", "Changed-scope return path", 1000),
      staleAfterHours: raw.staleAfterHours == null ? null : positiveWhole(raw.staleAfterHours, "Estimate stale-after hours")
    },
    dispatchBoundary: {
      resourceRequirementOnly: raw.resourceRequirementOnly !== false,
      managerOverrideRequired: raw.managerOverrideRequired === true,
      earliestStartAt: optionalText(raw.earliestStartAt, 80),
      latestFinishAt: optionalText(raw.latestFinishAt, 80)
    },
    partsBoundary: {
      demandSignalOnly: raw.demandSignalOnly !== false,
      substituteReviewRequired: raw.substituteReviewRequired === true || operations.some((operation) => operation.parts.some((part) => part.substituteReviewRequired)),
      purchaseMutationProhibited: raw.purchaseMutationProhibited !== false,
      shortageReviewRequired: raw.shortageReviewRequired === true
    },
    sourceVersions: Array.isArray(raw.sourceVersions) ? raw.sourceVersions.map((source, index) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(`Source version ${index + 1} is invalid.`);
      const row = source as Record<string, unknown>;
      return { sourceKey: canonical(text(row.sourceKey, `Source version ${index + 1} key`, 100)), version: text(row.version, `Source version ${index + 1} version`, 100), rightsStatus: canonical(text(row.rightsStatus, `Source version ${index + 1} rights status`, 100)), current: row.current === true };
    }) : [],
    supersedesId: optionalText(raw.supersedesId, 200)
  };
}

export function evaluateDiagnosticRepairHandoffControls(input: DiagnosticRepairHandoffControlInput) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.conclusion) blockers.push("HANDOFF_CONFIRMED_CONCLUSION_REQUIRED");
  if (input.conclusion && input.conclusion.status !== "CONFIRMED") blockers.push("HANDOFF_CONCLUSION_NOT_CONFIRMED");
  if (input.conclusion && input.latestConclusionId !== input.conclusion.id) blockers.push("HANDOFF_LATEST_CONCLUSION_REQUIRED");
  if (input.conclusion && !/^[0-9a-f]{64}$/.test(input.conclusion.conclusionChecksum)) blockers.push("HANDOFF_CONCLUSION_CHECKSUM_REQUIRED");
  if (!input.recommendation.trim() || !input.proposedCorrection.trim()) blockers.push("HANDOFF_RECOMMENDATION_REQUIRED");
  if (!input.operations.length) blockers.push("HANDOFF_OPERATION_PACKAGE_REQUIRED");
  if (input.sourceVersions.some((source) => source.rightsStatus !== "AUTHORIZED" || !source.current)) blockers.push("HANDOFF_SOURCE_UNAVAILABLE");
  if (["REPAIR_RECOMMENDATION", "ESTIMATE_AUTHORIZATION", "DISPATCH_REQUIREMENTS", "PARTS_READINESS"].includes(input.handoffType) && !input.repairDiagnosisVersionId) blockers.push("HANDOFF_REPAIR_DIAGNOSIS_PUBLICATION_REQUIRED");
  if (input.handoffType === "PUBLISH_DIAGNOSIS" && input.repairDiagnosisVersionId) blockers.push("HANDOFF_DIAGNOSIS_ALREADY_PUBLISHED");
  if (input.handoffType === "ESTIMATE_AUTHORIZATION" && (!input.estimateBoundary.advisorReviewRequired || !input.estimateBoundary.customerAuthorizationRequired)) blockers.push("HANDOFF_ESTIMATE_AUTHORITY_BOUNDARY_REQUIRED");
  if (input.handoffType === "DISPATCH_REQUIREMENTS" && !input.dispatchBoundary.resourceRequirementOnly) blockers.push("HANDOFF_DISPATCH_MUTATION_PROHIBITED");
  if (input.handoffType === "PARTS_READINESS" && (!input.partsBoundary.demandSignalOnly || !input.partsBoundary.purchaseMutationProhibited)) blockers.push("HANDOFF_PARTS_MUTATION_PROHIBITED");
  const totalLikelyMinutes = input.operations.reduce((sum, operation) => sum + operation.durationMinutes.likely, 0);
  const partCount = input.operations.reduce((sum, operation) => sum + operation.parts.length, 0);
  if (input.operations.some((operation) => !operation.hazards.length)) warnings.push("HANDOFF_OPERATION_HAZARD_REVIEW_EMPTY");
  if (input.partsBoundary.substituteReviewRequired) warnings.push("HANDOFF_SUBSTITUTE_PART_REVIEW_REQUIRED");
  const reasonCodes = unique(blockers);
  const warningCodes = unique(warnings);
  const allowed = reasonCodes.length === 0;
  const status: DiagnosticRepairHandoffStatus = allowed && input.handoffType === "PUBLISH_DIAGNOSIS" ? "PUBLISHED" : allowed ? "READY_FOR_REVIEW" : "BLOCKED";
  const decision = { allowed, status, reasonCodes, warningCodes, policyVersion: DIAGNOSTIC_REPAIR_HANDOFF_POLICY_VERSION, totalLikelyMinutes, operationCount: input.operations.length, partCount };
  return { ...decision, decisionChecksum: hashEnterpriseCommand({ input, decision }) };
}

export function diagnosticRepairHandoffId(organizationId: string, caseId: string, idempotencyKey: string) {
  return `drh_${hashEnterpriseCommand({ organizationId, caseId, idempotencyKey }).slice(0, 24)}`;
}
