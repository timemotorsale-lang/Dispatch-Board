import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { DiagnosticRepairOperation } from "./repair-handoff-domain";

export const DIAGNOSTIC_ESTIMATE_ADVISOR_POLICY_VERSION = "DGN-035-037/POLICY/1.0.0";
export const DIAGNOSTIC_ESTIMATE_STRATEGIES = ["STANDARD_SHOP_MODEL", "THREE_TIER_LABOR_GUIDE_MODEL", "ELITE_ENTERPRISE_MODEL"] as const;
export type DiagnosticEstimateStrategy = (typeof DIAGNOSTIC_ESTIMATE_STRATEGIES)[number];
export type DiagnosticEstimateDraftStatus = "DRAFTED" | "READY_FOR_ADVISOR_REVIEW" | "BLOCKED";

export type DiagnosticEstimateDraftLine = {
  key: string;
  type: "LABOR" | "PART" | "FEE";
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxable: boolean;
  workTypeCode: string;
  laborGuideMinutes: number;
  plannedCorrection: string;
  sourceOperationKey: string | null;
  advisorNote: string;
};

export type DiagnosticEstimateAdvisorControlInput = {
  diagnosticCaseId: string;
  repairOrderId: string;
  currentCaseStatus: string;
  conclusion: { id: string; status: string; causeStatement: string | null; uncertainty: string; conclusionChecksum: string } | null;
  repairHandoff: { id: string; status: string; handoffType: string; repairDiagnosisVersionId: string | null; handoffChecksum: string; operations: DiagnosticRepairOperation[]; estimateBoundary: Record<string, unknown>; recommendation: string; proposedCorrection: string } | null;
  selectedStrategy: DiagnosticEstimateStrategy;
  advisorSummary: string;
  customerConcernSummary: string;
  customerCauseSummary: string;
  customerCorrectionSummary: string;
  notIncluded: string[];
  assumptions: string[];
  draftLines: DiagnosticEstimateDraftLine[];
  taxBoundary: string;
  expiresAt: string;
  occurredAt: string;
};

const canonical = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

function text(value: unknown, label: string, max = 2000) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

function optionalList(value: unknown, label: string) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  return unique(value.map(String));
}

function nonnegativeInteger(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new Error(`${label} must be a nonnegative whole number.`);
  return result;
}

function positiveInteger(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1) throw new Error(`${label} must be a positive whole number.`);
  return result;
}

function date(value: unknown, label: string) {
  const result = new Date(String(value ?? ""));
  if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date.`);
  return result;
}

function normalizeLine(value: unknown, index: number): DiagnosticEstimateDraftLine {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Draft estimate line ${index + 1} is invalid.`);
  const raw = value as Record<string, unknown>;
  const type = canonical(String(raw.type ?? "")) as DiagnosticEstimateDraftLine["type"];
  if (!["LABOR", "PART", "FEE"].includes(type)) throw new Error(`Draft estimate line ${index + 1} type is invalid.`);
  return {
    key: canonical(text(raw.key, `Draft estimate line ${index + 1} key`, 100)),
    type,
    description: text(raw.description, `Draft estimate line ${index + 1} description`, 500),
    quantity: positiveInteger(raw.quantity, `Draft estimate line ${index + 1} quantity`),
    unitPriceCents: nonnegativeInteger(raw.unitPriceCents, `Draft estimate line ${index + 1} unit price`),
    taxable: raw.taxable === true,
    workTypeCode: canonical(text(raw.workTypeCode ?? type, `Draft estimate line ${index + 1} work type`, 100)),
    laborGuideMinutes: nonnegativeInteger(raw.laborGuideMinutes ?? 0, `Draft estimate line ${index + 1} labor guide minutes`),
    plannedCorrection: text(raw.plannedCorrection ?? raw.description, `Draft estimate line ${index + 1} correction`, 500),
    sourceOperationKey: typeof raw.sourceOperationKey === "string" && raw.sourceOperationKey.trim() ? canonical(raw.sourceOperationKey) : null,
    advisorNote: text(raw.advisorNote ?? "Advisor must review this draft line before presenting an estimate.", `Draft estimate line ${index + 1} advisor note`, 500)
  };
}

export function buildStandardDiagnosticEstimateDraftLines(input: { operations: DiagnosticRepairOperation[]; laborRateCents: number; partPlaceholderUnitCents?: number }) {
  const laborRateCents = positiveInteger(input.laborRateCents, "Labor rate");
  const partPlaceholderUnitCents = nonnegativeInteger(input.partPlaceholderUnitCents ?? 0, "Part placeholder unit price");
  return input.operations.flatMap((operation): DiagnosticEstimateDraftLine[] => {
    const opKey = canonical(operation.key);
    const laborHours = Math.max(1, Math.ceil(operation.durationMinutes.likely / 60));
    const laborLine: DiagnosticEstimateDraftLine = {
      key: `LABOR_${opKey}`,
      type: "LABOR",
      description: operation.description,
      quantity: laborHours,
      unitPriceCents: laborRateCents,
      taxable: false,
      workTypeCode: operation.workTypeCode,
      laborGuideMinutes: operation.durationMinutes.likely,
      plannedCorrection: operation.description,
      sourceOperationKey: operation.key,
      advisorNote: `Drafted from diagnostic repair operation ${operation.key}; advisor must review labor guide, rate, and included work.`
    };
    const partLines = operation.parts.map((part): DiagnosticEstimateDraftLine => ({
      key: `PART_${opKey}_${canonical(part.partKey)}`,
      type: "PART",
      description: part.description,
      quantity: part.quantity,
      unitPriceCents: partPlaceholderUnitCents,
      taxable: true,
      workTypeCode: "PART",
      laborGuideMinutes: 0,
      plannedCorrection: operation.description,
      sourceOperationKey: operation.key,
      advisorNote: `Demand signal only; Parts authority must confirm fitment, price, availability, ETA, and substitute review${part.substituteReviewRequired ? " before use" : ""}.`
    }));
    return [laborLine, ...partLines];
  });
}

export function normalizeDiagnosticEstimateAdvisorCommand(value: unknown, now = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Diagnostic advisor estimate request must be an object.");
  const raw = value as Record<string, unknown>;
  const selectedStrategy = canonical(String(raw.selectedStrategy ?? "STANDARD_SHOP_MODEL")) as DiagnosticEstimateStrategy;
  if (!DIAGNOSTIC_ESTIMATE_STRATEGIES.includes(selectedStrategy)) throw new Error("Estimate strategy is invalid.");
  const expectedVersion = positiveInteger(raw.expectedVersion, "Expected diagnostic-case version");
  const expiresAt = date(raw.expiresAt, "Draft estimate expiry");
  if (expiresAt <= now) throw new Error("Draft estimate expiry must be in the future.");
  const draftLines = Array.isArray(raw.draftLines) ? raw.draftLines.map(normalizeLine) : [];
  const keys = new Set<string>();
  for (const line of draftLines) {
    if (keys.has(line.key)) throw new Error("Draft estimate line keys must be unique.");
    keys.add(line.key);
  }
  return {
    expectedVersion,
    idempotencyKey: text(raw.idempotencyKey, "Advisor estimate idempotency key", 200),
    reason: text(raw.reason, "Advisor estimate reason", 500),
    repairHandoffId: typeof raw.repairHandoffId === "string" && raw.repairHandoffId.trim() ? raw.repairHandoffId.trim() : null,
    selectedStrategy,
    advisorSummary: text(raw.advisorSummary, "Advisor summary", 2000),
    customerConcernSummary: text(raw.customerConcernSummary, "Customer concern summary", 1000),
    customerCauseSummary: text(raw.customerCauseSummary, "Customer cause summary", 1000),
    customerCorrectionSummary: text(raw.customerCorrectionSummary, "Customer correction summary", 1000),
    assumptions: optionalList(raw.assumptions, "Estimate assumptions"),
    notIncluded: optionalList(raw.notIncluded, "Not-included boundaries"),
    draftLines,
    laborRateCents: raw.laborRateCents == null ? null : positiveInteger(raw.laborRateCents, "Labor rate"),
    partPlaceholderUnitCents: raw.partPlaceholderUnitCents == null ? null : nonnegativeInteger(raw.partPlaceholderUnitCents, "Part placeholder unit price"),
    taxBoundary: text(raw.taxBoundary ?? "Existing Repair Estimate authority must calculate final tax before presentation.", "Tax boundary", 500),
    expiresAt,
    supersedesId: typeof raw.supersedesId === "string" && raw.supersedesId.trim() ? raw.supersedesId.trim() : null
  };
}

export function evaluateDiagnosticEstimateAdvisorControls(input: DiagnosticEstimateAdvisorControlInput) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.conclusion) blockers.push("ADVISOR_ESTIMATE_CONFIRMED_CONCLUSION_REQUIRED");
  if (input.conclusion && input.conclusion.status !== "CONFIRMED") blockers.push("ADVISOR_ESTIMATE_CONCLUSION_NOT_CONFIRMED");
  if (input.conclusion && !/^[0-9a-f]{64}$/.test(input.conclusion.conclusionChecksum)) blockers.push("ADVISOR_ESTIMATE_CONCLUSION_CHECKSUM_REQUIRED");
  if (!input.repairHandoff) blockers.push("ADVISOR_ESTIMATE_PUBLISHED_REPAIR_HANDOFF_REQUIRED");
  if (input.repairHandoff && (input.repairHandoff.status !== "PUBLISHED" || input.repairHandoff.handoffType !== "PUBLISH_DIAGNOSIS" || !input.repairHandoff.repairDiagnosisVersionId)) blockers.push("ADVISOR_ESTIMATE_REPAIR_DIAGNOSIS_PUBLICATION_REQUIRED");
  if (input.repairHandoff && input.repairHandoff.operations.length === 0) blockers.push("ADVISOR_ESTIMATE_OPERATION_PACKAGE_REQUIRED");
  if (!["HANDED_OFF", "POST_REPAIR_VERIFICATION", "VERIFIED_CLOSED"].includes(input.currentCaseStatus)) blockers.push("ADVISOR_ESTIMATE_CASE_NOT_HANDED_OFF");
  if (input.advisorSummary.trim().length < 10) blockers.push("ADVISOR_ESTIMATE_SUMMARY_REQUIRED");
  if (input.customerConcernSummary.trim().length < 5 || input.customerCauseSummary.trim().length < 10 || input.customerCorrectionSummary.trim().length < 10) blockers.push("ADVISOR_ESTIMATE_CUSTOMER_LANGUAGE_REQUIRED");
  if (!input.draftLines.length) blockers.push("ADVISOR_ESTIMATE_LINES_REQUIRED");
  if (!input.taxBoundary.trim()) blockers.push("ADVISOR_ESTIMATE_TAX_BOUNDARY_REQUIRED");
  if (new Date(input.expiresAt) <= new Date(input.occurredAt)) blockers.push("ADVISOR_ESTIMATE_EXPIRY_REQUIRED");
  if (input.draftLines.some((line) => line.type === "PART" && line.unitPriceCents === 0)) warnings.push("ADVISOR_ESTIMATE_PART_PRICE_PENDING");
  if (input.draftLines.some((line) => line.type === "LABOR" && line.laborGuideMinutes === 0)) warnings.push("ADVISOR_ESTIMATE_LABOR_GUIDE_PENDING");
  const reasonCodes = unique(blockers).map(canonical);
  const warningCodes = unique(warnings).map(canonical);
  const status: DiagnosticEstimateDraftStatus = reasonCodes.length ? "BLOCKED" : "READY_FOR_ADVISOR_REVIEW";
  const totals = {
    laborSubtotalCents: input.draftLines.filter((line) => line.type === "LABOR").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
    partsSubtotalCents: input.draftLines.filter((line) => line.type === "PART").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0),
    feeSubtotalCents: input.draftLines.filter((line) => line.type === "FEE").reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0)
  };
  const decision = { allowed: status !== "BLOCKED", status, reasonCodes, warningCodes, policyVersion: DIAGNOSTIC_ESTIMATE_ADVISOR_POLICY_VERSION, ...totals, totalBeforeTaxCents: totals.laborSubtotalCents + totals.partsSubtotalCents + totals.feeSubtotalCents };
  return { ...decision, decisionChecksum: hashEnterpriseCommand({ input, decision }) };
}

export function diagnosticEstimateDraftId(organizationId: string, caseId: string, idempotencyKey: string) {
  return `ded_${hashEnterpriseCommand({ organizationId, caseId, idempotencyKey }).slice(0, 24)}`;
}
