import { describe, expect, it } from "vitest";
import { buildStandardDiagnosticEstimateDraftLines, evaluateDiagnosticEstimateAdvisorControls, normalizeDiagnosticEstimateAdvisorCommand } from "@/server/diagnostics/estimate-advisor-domain";
import type { DiagnosticRepairOperation } from "@/server/diagnostics/repair-handoff-domain";

const operation: DiagnosticRepairOperation = {
  key: "starter-ground-repair",
  description: "Repair starter ground cable connection.",
  workTypeCode: "DIAGNOSTIC_REPAIR",
  durationMinutes: { minimum: 30, likely: 90, maximum: 150 },
  requiredSkills: ["DIAGNOSTIC_REPAIR"],
  requiredCertifications: [],
  bayRequirements: ["SERVICE_BAY"],
  toolRequirements: ["DVOM"],
  parts: [{ partKey: "GROUND_STRAP", description: "Ground strap", quantity: 1, fitmentBasis: "VIN review required.", substituteReviewRequired: true }],
  hazards: ["BATTERY_SAFE_WORK"],
  procedures: ["Follow approved service information."],
  qcChecks: ["Verify crank performance."]
};

const conclusion = { id: "conclusion-1", status: "CONFIRMED", causeStatement: "Starter ground path has excessive resistance.", uncertainty: "LOW", conclusionChecksum: "a".repeat(64) };
const repairHandoff = { id: "handoff-1", status: "PUBLISHED", handoffType: "PUBLISH_DIAGNOSIS", repairDiagnosisVersionId: "diag-1", handoffChecksum: "b".repeat(64), operations: [operation], estimateBoundary: { advisorReviewRequired: true }, recommendation: "Repair starter ground path.", proposedCorrection: "Repair starter ground cable connection." };

describe("DGN-035-037 advisor estimate domain", () => {
  it("normalizes selectable estimate strategies and advisor language", () => {
    const result = normalizeDiagnosticEstimateAdvisorCommand({ expectedVersion: 11, idempotencyKey: "estimate-draft-1", reason: "Create advisor estimate draft.", selectedStrategy: "three_tier_labor_guide_model", advisorSummary: "Advisor should review labor and parts.", customerConcernSummary: "No crank.", customerCauseSummary: "High resistance in starter ground path.", customerCorrectionSummary: "Repair starter ground cable connection.", laborRateCents: 16500, expiresAt: "2026-07-30T10:00:00Z" }, new Date("2026-07-21T10:00:00Z"));
    expect(result).toMatchObject({ selectedStrategy: "THREE_TIER_LABOR_GUIDE_MODEL", laborRateCents: 16500 });
  });

  it("builds draft labor and demand-signal part lines from repair operations", () => {
    const lines = buildStandardDiagnosticEstimateDraftLines({ operations: [operation], laborRateCents: 16500 });
    expect(lines).toMatchObject([{ type: "LABOR", quantity: 2, unitPriceCents: 16500, laborGuideMinutes: 90 }, { type: "PART", unitPriceCents: 0 }]);
  });

  it("blocks advisor draft when the published repair diagnosis handoff is missing", () => {
    const lines = buildStandardDiagnosticEstimateDraftLines({ operations: [operation], laborRateCents: 16500 });
    const result = evaluateDiagnosticEstimateAdvisorControls({ diagnosticCaseId: "case-1", repairOrderId: "ro-1", currentCaseStatus: "HANDED_OFF", conclusion, repairHandoff: null, selectedStrategy: "STANDARD_SHOP_MODEL", advisorSummary: "Advisor should review labor and parts.", customerConcernSummary: "No crank.", customerCauseSummary: "High resistance in starter ground path.", customerCorrectionSummary: "Repair starter ground cable connection.", assumptions: [], notIncluded: [], draftLines: lines, taxBoundary: "Tax calculated by estimate authority.", expiresAt: "2026-07-30T10:00:00Z", occurredAt: "2026-07-21T10:00:00Z" });
    expect(result.allowed).toBe(false);
    expect(result.reasonCodes).toContain("ADVISOR_ESTIMATE_PUBLISHED_REPAIR_HANDOFF_REQUIRED");
  });

  it("allows advisor-ready draft but warns when part pricing remains pending", () => {
    const lines = buildStandardDiagnosticEstimateDraftLines({ operations: [operation], laborRateCents: 16500 });
    const result = evaluateDiagnosticEstimateAdvisorControls({ diagnosticCaseId: "case-1", repairOrderId: "ro-1", currentCaseStatus: "HANDED_OFF", conclusion, repairHandoff, selectedStrategy: "STANDARD_SHOP_MODEL", advisorSummary: "Advisor should review labor and parts.", customerConcernSummary: "No crank.", customerCauseSummary: "High resistance in starter ground path.", customerCorrectionSummary: "Repair starter ground cable connection.", assumptions: [], notIncluded: [], draftLines: lines, taxBoundary: "Tax calculated by estimate authority.", expiresAt: "2026-07-30T10:00:00Z", occurredAt: "2026-07-21T10:00:00Z" });
    expect(result).toMatchObject({ allowed: true, status: "READY_FOR_ADVISOR_REVIEW", laborSubtotalCents: 33000 });
    expect(result.warningCodes).toContain("ADVISOR_ESTIMATE_PART_PRICE_PENDING");
  });
});
