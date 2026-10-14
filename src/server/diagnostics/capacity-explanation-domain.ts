import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

import type { DiagnosticLaborGuideRecommendation } from "./labor-guide-domain";
import type { DiagnosticPartsLaborEconomicsResult } from "./parts-labor-economics-domain";
import type { DiagnosticRepairOperation } from "./repair-handoff-domain";

export const DIAGNOSTIC_CAPACITY_EXPLANATION_VERSION = "DGN-042-043/CAPACITY-EXPLANATION/1.0.0";

export type DiagnosticCapacityImpactInput = {
  diagnosticCaseId: string;
  repairOrderId: string;
  operations: DiagnosticRepairOperation[];
  laborGuideRecommendations: DiagnosticLaborGuideRecommendation[];
  economics: DiagnosticPartsLaborEconomicsResult;
  customerConcernSummary?: string;
  customerCauseSummary?: string;
  customerCorrectionSummary?: string;
  occurredAt: string;
};

export type DiagnosticCapacityImpact = {
  totalBillableMinutes: number;
  projectedElapsedHours: number;
  cycleTimeDays: number;
  requiredSkills: string[];
  requiredCertifications: string[];
  requiredTools: string[];
  requiredBays: string[];
  blockerCodes: string[];
  feasibilityCodes: string[];
  capacityRisk: "LOW" | "MEDIUM" | "HIGH";
  authorityBoundary: {
    advisoryOnly: true;
    dispatchMutationProhibited: true;
    schedulingMutationProhibited: true;
    appointmentPromiseProhibited: true;
  };
};

export type DiagnosticExplanationPackage = {
  audience: "CUSTOMER" | "INSURANCE" | "INTERNAL_ADVISOR";
  concern: string;
  cause: string;
  correction: string;
  consequence: string;
  verification: string;
  notIncluded: string[];
  editRequired: boolean;
  explanationCodes: string[];
  authorityBoundary: {
    draftOnly: true;
    customerPresentationProhibited: true;
    insurerSubmissionProhibited: true;
    authorizationRequestProhibited: true;
  };
};

export type DiagnosticCapacityExplanationResult = {
  version: string;
  occurredAt: string;
  capacityImpact: DiagnosticCapacityImpact;
  explanationPackages: DiagnosticExplanationPackage[];
  warningCodes: string[];
  managerReviewCodes: string[];
  authorityBoundary: {
    advisoryOnly: true;
    dispatchMutationProhibited: true;
    schedulingMutationProhibited: true;
    customerPresentationProhibited: true;
    insurerSubmissionProhibited: true;
    authorizationRequestProhibited: true;
  };
  resultChecksum: string;
};

const capacityBoundary = {
  advisoryOnly: true,
  dispatchMutationProhibited: true,
  schedulingMutationProhibited: true,
  appointmentPromiseProhibited: true
} as const;

const explanationBoundary = {
  draftOnly: true,
  customerPresentationProhibited: true,
  insurerSubmissionProhibited: true,
  authorizationRequestProhibited: true
} as const;

const authorityBoundary = {
  advisoryOnly: true,
  dispatchMutationProhibited: true,
  schedulingMutationProhibited: true,
  customerPresentationProhibited: true,
  insurerSubmissionProhibited: true,
  authorizationRequestProhibited: true
} as const;

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function capacityRisk(days: number, blockerCodes: string[]): DiagnosticCapacityImpact["capacityRisk"] {
  if (blockerCodes.length > 1 || days > 3) return "HIGH";
  if (blockerCodes.length || days > 1.5) return "MEDIUM";
  return "LOW";
}

function buildCapacity(input: DiagnosticCapacityImpactInput): DiagnosticCapacityImpact {
  const totalBillableMinutes = input.economics.totals.effectiveLaborMinutes;
  const autobodyCount = input.laborGuideRecommendations.filter((item) => item.domain === "AUTOBODY").length;
  const highComplexityCount = input.laborGuideRecommendations.filter((item) => item.complexityTier === "HIGH").length;
  const requiredSkills = unique(input.laborGuideRecommendations.flatMap((item) => item.requiredSkills));
  const requiredCertifications = unique(input.laborGuideRecommendations.flatMap((item) => item.requiredCertifications));
  const requiredTools = unique(input.laborGuideRecommendations.flatMap((item) => item.toolRequirements));
  const requiredBays = unique(input.laborGuideRecommendations.flatMap((item) => item.bayRequirements));
  const projectedElapsedHours = Math.max(1, Math.round((totalBillableMinutes / 60) * (autobodyCount ? 1.35 : 1.15) * 10) / 10);
  const cycleTimeDays = Math.max(0.5, Math.round((projectedElapsedHours / 7.5 + (input.economics.partDemandCandidates.some((part) => part.pricingStatus === "PLACEHOLDER") ? 0.5 : 0)) * 10) / 10);
  const blockerCodes = unique([
    input.economics.partDemandCandidates.some((part) => part.pricingStatus === "PLACEHOLDER") ? "CAPACITY_PARTS_PRICING_PENDING" : "",
    requiredBays.some((bay) => /PAINT_BOOTH|FRAME|CALIBRATION/.test(bay)) ? "CAPACITY_SPECIAL_RESOURCE_REQUIRED" : "",
    requiredCertifications.length ? "CAPACITY_CERTIFICATION_REVIEW_REQUIRED" : "",
    highComplexityCount ? "CAPACITY_HIGH_COMPLEXITY_REVIEW_REQUIRED" : ""
  ]);
  const feasibilityCodes = unique([
    "CAPACITY_ADVISORY_ONLY",
    autobodyCount ? "CAPACITY_AUTOBODY_CYCLE_TIME_PROJECTED" : "CAPACITY_MECHANICAL_CYCLE_TIME_PROJECTED",
    input.economics.partDemandCandidates.length ? "CAPACITY_PARTS_DEMAND_DEPENDENCY" : "",
    highComplexityCount ? "CAPACITY_HIGH_COMPLEXITY_WORK" : ""
  ]);
  return {
    totalBillableMinutes,
    projectedElapsedHours,
    cycleTimeDays,
    requiredSkills,
    requiredCertifications,
    requiredTools,
    requiredBays,
    blockerCodes,
    feasibilityCodes,
    capacityRisk: capacityRisk(cycleTimeDays, blockerCodes),
    authorityBoundary: capacityBoundary
  };
}

function summaryFromOperations(operations: DiagnosticRepairOperation[]) {
  const descriptions = operations.map((operation) => operation.description);
  return descriptions.length === 1 ? descriptions[0] : `${descriptions.slice(0, -1).join(", ")} and ${descriptions.at(-1)}`;
}

function buildExplanation(input: DiagnosticCapacityImpactInput, capacity: DiagnosticCapacityImpact, audience: DiagnosticExplanationPackage["audience"]): DiagnosticExplanationPackage {
  const operationSummary = summaryFromOperations(input.operations);
  const autobody = input.laborGuideRecommendations.some((item) => item.domain === "AUTOBODY");
  const safety = input.laborGuideRecommendations.some((item) => ["ADAS_CALIBRATION", "FRAME_STRUCTURAL"].includes(item.operationType));
  const partsPending = input.economics.partDemandCandidates.some((part) => part.pricingStatus === "PLACEHOLDER");
  const concern = input.customerConcernSummary?.trim() || (autobody ? "Collision or bodywork damage requires estimator review." : "The vehicle requires repair review.");
  const cause = input.customerCauseSummary?.trim() || (autobody ? "Visible damage, possible hidden damage, and safety-system involvement must be verified before final approval." : "The confirmed repair package identifies the affected system and required correction.");
  const correction = input.customerCorrectionSummary?.trim() || `Prepare a draft repair package for ${operationSummary}.`;
  const consequence = safety
    ? "Safety-system or structural work may require scan, calibration, or additional evidence before release."
    : partsPending ? "Parts pricing or fitment remains pending and may affect the final estimate." : "The draft is ready for advisor review before customer presentation.";
  const verification = autobody
    ? "Estimator review, repair evidence, refinish/QC checks, and any required scan or calibration proof must be attached before delivery."
    : "Advisor and technician verification must confirm the repair scope before the final customer estimate or repair execution.";
  return {
    audience,
    concern,
    cause,
    correction,
    consequence,
    verification,
    notIncluded: [
      "Final tax, fees, and customer-presented estimate are controlled by the official estimate authority.",
      "Parts order, reservation, substitution, and receiving remain controlled by Parts authority.",
      "Dispatch, scheduling, and completion promises remain controlled by Dispatch and scheduling authorities."
    ],
    editRequired: true,
    explanationCodes: unique([
      "EXPLANATION_DRAFT_ONLY",
      `EXPLANATION_AUDIENCE_${audience}`,
      autobody ? "EXPLANATION_AUTOBODY_INSURANCE_READY_DRAFT" : "EXPLANATION_MECHANICAL_CUSTOMER_READY_DRAFT",
      safety ? "EXPLANATION_SAFETY_CALIBRATION_REVIEW" : "",
      capacity.capacityRisk === "HIGH" ? "EXPLANATION_CAPACITY_RISK_HIGH" : "",
      partsPending ? "EXPLANATION_PARTS_PENDING" : ""
    ]),
    authorityBoundary: explanationBoundary
  };
}

export function evaluateDiagnosticCapacityExplanation(input: DiagnosticCapacityImpactInput): DiagnosticCapacityExplanationResult {
  if (!input.operations.length) throw new Error("Capacity explanation requires at least one repair operation.");
  if (!input.laborGuideRecommendations.length) throw new Error("Capacity explanation requires labor guide recommendations.");
  const capacityImpact = buildCapacity(input);
  const hasAutobody = input.laborGuideRecommendations.some((item) => item.domain === "AUTOBODY");
  const explanationPackages = [
    buildExplanation(input, capacityImpact, "CUSTOMER"),
    buildExplanation(input, capacityImpact, "INTERNAL_ADVISOR"),
    ...(hasAutobody ? [buildExplanation(input, capacityImpact, "INSURANCE")] : [])
  ];
  const warningCodes = unique([
    ...capacityImpact.blockerCodes,
    capacityImpact.capacityRisk === "HIGH" ? "CAPACITY_EXPLANATION_HIGH_RISK" : "",
    explanationPackages.some((item) => item.editRequired) ? "EXPLANATION_ADVISOR_EDIT_REQUIRED" : ""
  ]);
  const managerReviewCodes = unique([
    capacityImpact.capacityRisk === "HIGH" ? "CAPACITY_MANAGER_REVIEW_REQUIRED" : "",
    capacityImpact.requiredCertifications.length ? "CAPACITY_CERTIFICATION_MANAGER_REVIEW" : ""
  ]);
  const result = { version: DIAGNOSTIC_CAPACITY_EXPLANATION_VERSION, occurredAt: input.occurredAt, capacityImpact, explanationPackages, warningCodes, managerReviewCodes, authorityBoundary };
  return { ...result, resultChecksum: hashEnterpriseCommand({ input, result }) };
}
