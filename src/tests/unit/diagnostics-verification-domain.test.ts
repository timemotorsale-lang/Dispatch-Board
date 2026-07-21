import { describe, expect, it } from "vitest";
import { evaluateDiagnosticVerificationControls, normalizeDiagnosticVerificationCommand } from "@/server/diagnostics/verification-domain";

const conclusion = { id: "conclusion-1", status: "CONFIRMED", conclusionChecksum: "a".repeat(64), causeStatement: "Starter ground path has excessive resistance." };
const repairHandoff = { id: "handoff-1", status: "PUBLISHED", repairDiagnosisVersionId: "diag-1", handoffChecksum: "b".repeat(64), occurredAt: "2026-07-21T22:00:00.000Z" };
const checks = [{ key: "original_concern", label: "Original concern", method: "customer_concern_reproduction", expectedResult: "No crank no longer reproduces.", required: true, safetyCritical: false }];

describe("DGN-033-034 verification controls", () => {
  it("normalizes a concern-specific verification plan", () => {
    const result = normalizeDiagnosticVerificationCommand({ action: "plan", expectedVersion: 9, idempotencyKey: "verification-plan", reason: "Create post repair verification plan.", originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks });
    expect(result.action).toBe("PLAN");
    expect(result.checks[0]).toMatchObject({ key: "ORIGINAL_CONCERN", method: "CUSTOMER_CONCERN_REPRODUCTION" });
  });

  it("allows a plan only after diagnosis publication", () => {
    const result = evaluateDiagnosticVerificationControls({ action: "PLAN", diagnosticCaseId: "case-1", currentCaseStatus: "HANDED_OFF", riskTier: "R1", conclusion, repairHandoff, latestVerification: null, originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks: normalizeDiagnosticVerificationCommand({ action: "PLAN", expectedVersion: 9, idempotencyKey: "verification-plan", reason: "Create post repair verification plan.", originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks }).checks, performedChecks: [], regressionChecks: [], roadTestSafety: "NOT_REQUIRED", independentReviewRequired: false, reviewerUserId: null, actorUserId: "tech-1" });
    expect(result).toMatchObject({ allowed: true, status: "PLANNED" });
  });

  it("blocks case closure until required checks and regression are passed", () => {
    const planChecks = normalizeDiagnosticVerificationCommand({ action: "PLAN", expectedVersion: 9, idempotencyKey: "verification-plan", reason: "Create post repair verification plan.", originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks }).checks;
    const base = { action: "PASS" as const, diagnosticCaseId: "case-1", currentCaseStatus: "POST_REPAIR_VERIFICATION", riskTier: "R1" as const, conclusion, repairHandoff, latestVerification: { id: "plan-1", status: "PLANNED" as const }, originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks: planChecks, roadTestSafety: "NOT_REQUIRED" as const, independentReviewRequired: false, reviewerUserId: null, actorUserId: "tech-1" };
    expect(evaluateDiagnosticVerificationControls({ ...base, performedChecks: [{ checkKey: "ORIGINAL_CONCERN", result: "PASS", evidenceKeys: [], notes: null }], regressionChecks: [] }).reasonCodes).toContain("VERIFICATION_REGRESSION_CHECK_REQUIRED");
    expect(evaluateDiagnosticVerificationControls({ ...base, performedChecks: [{ checkKey: "ORIGINAL_CONCERN", result: "FAIL", evidenceKeys: [], notes: null }], regressionChecks: ["ORIGINAL_CONCERN"] }).reasonCodes).toContain("VERIFICATION_REQUIRED_CHECK_NOT_PASSED");
    expect(evaluateDiagnosticVerificationControls({ ...base, performedChecks: [{ checkKey: "ORIGINAL_CONCERN", result: "PASS", evidenceKeys: [], notes: null }], regressionChecks: ["ORIGINAL_CONCERN"] }).allowed).toBe(true);
  });

  it("routes unsafe road-test outcomes to unsafe verification, not closure", () => {
    const result = evaluateDiagnosticVerificationControls({ action: "UNSAFE", diagnosticCaseId: "case-1", currentCaseStatus: "POST_REPAIR_VERIFICATION", riskTier: "R2", conclusion, repairHandoff, latestVerification: { id: "plan-1", status: "PLANNED" }, originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks: normalizeDiagnosticVerificationCommand({ action: "PLAN", expectedVersion: 9, idempotencyKey: "verification-plan", reason: "Create post repair verification plan.", originalConcern: "No crank no start.", repairSummary: "Starter ground connection repaired.", checks }).checks, performedChecks: [{ checkKey: "ORIGINAL_CONCERN", result: "NOT_PERFORMED", evidenceKeys: [], notes: "Road test stopped." }], regressionChecks: [], roadTestSafety: "UNSAFE", independentReviewRequired: false, reviewerUserId: null, actorUserId: "tech-1" });
    expect(result).toMatchObject({ allowed: true, status: "UNSAFE" });
  });
});
