import { describe, expect, it } from "vitest";
import { evaluateDiagnosticConclusionControls, type DiagnosticConclusionControlSnapshot } from "@/server/diagnostics/conclusion-domain";

const candidate = { hypothesisId: "hyp-1", hypothesisKey: "HYP_GROUND", status: "SUPPORTED", causalState: "CAUSAL_SUPPORT", assumptions: ["GROUND_PATH"], supportingEvidenceKeys: ["EV_DROP"], contradictingEvidenceKeys: [], missingExpectedEvidenceKeys: [] };
const snapshot = (overrides: Partial<DiagnosticConclusionControlSnapshot> = {}): DiagnosticConclusionControlSnapshot => ({ action: "CONFIRM", diagnosticCaseId: "case-1", riskTier: "R1", reasoningEvaluationId: "reason-1", reasoningResultChecksum: "a".repeat(64), reasoningComplete: true, reasoningAbstentionRequired: false, reasoningHardBlockers: [], selectedCandidate: candidate, viableCandidates: [candidate], causeStatement: "Excessive resistance in the starter ground path.", uncertainty: "LOW", evidenceBasisKeys: ["EV_DROP"], addressedAlternativeHypothesisKeys: [], limitations: [], sourceVersions: [{ sourceKey: "OEM", version: "1", rightsStatus: "AUTHORIZED", current: true }], qualityDisposition: "READY", qualificationValid: true, confirmationCapability: true, highRiskCapability: false, evidenceSufficient: true, authorUserId: "tech-1", independentReviewRequired: false, reviewerUserId: null, reviewerQualified: false, reviewerAuthorized: false, priorConclusion: { id: "proposal-1", status: "PROPOSED", hypothesisKey: "HYP_GROUND" }, ...overrides });

describe("DGN-026 diagnostic conclusion controls", () => {
  it("confirms an evidence-supported cause with deterministic lineage", () => {
    const result = evaluateDiagnosticConclusionControls(snapshot()); expect(result).toMatchObject({ allowed: true, status: "CONFIRMED", hypothesisKey: "HYP_GROUND", reasonCodes: [] }); expect(result.decisionChecksum).toMatch(/^[0-9a-f]{64}$/);
  });
  it("blocks insufficient, conflicting, association-only, and out-of-model conclusions", () => {
    const result = evaluateDiagnosticConclusionControls(snapshot({ evidenceSufficient: false, selectedCandidate: { ...candidate, status: "CONTRADICTED", causalState: "ASSOCIATION_ONLY", contradictingEvidenceKeys: ["EV_DISPROOF"] } }));
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["CONCLUSION_EVIDENCE_INSUFFICIENT", "CONCLUSION_HYPOTHESIS_NOT_VIABLE", "CONCLUSION_ASSOCIATION_ONLY", "CONCLUSION_UNRESOLVED_CONTRADICTION"]));
  });
  it("requires every viable alternative to be addressed", () => {
    const alternative = { ...candidate, hypothesisId: "hyp-2", hypothesisKey: "HYP_STARTER" };
    expect(evaluateDiagnosticConclusionControls(snapshot({ viableCandidates: [candidate, alternative] })).reasonCodes).toContain("CONCLUSION_ALTERNATIVES_NOT_ADDRESSED");
    expect(evaluateDiagnosticConclusionControls(snapshot({ viableCandidates: [candidate, alternative], addressedAlternativeHypothesisKeys: ["HYP_STARTER"] })).allowed).toBe(true);
  });
  it("enforces independent qualified review and named authority for high risk", () => {
    const blocked = evaluateDiagnosticConclusionControls(snapshot({ riskTier: "R3", independentReviewRequired: true, reviewerUserId: "tech-1" }));
    expect(blocked.reasonCodes).toEqual(expect.arrayContaining(["CONCLUSION_HIGH_RISK_CAPABILITY_REQUIRED", "CONCLUSION_REVIEWER_MUST_BE_INDEPENDENT", "CONCLUSION_REVIEWER_QUALIFICATION_REQUIRED", "CONCLUSION_REVIEWER_AUTHORITY_REQUIRED"]));
    expect(evaluateDiagnosticConclusionControls(snapshot({ riskTier: "R3", highRiskCapability: true, independentReviewRequired: true, reviewerUserId: "reviewer-1", reviewerQualified: true, reviewerAuthorized: true })).allowed).toBe(true);
  });
  it("never permits an R4 or unavailable-source confirmation", () => {
    expect(evaluateDiagnosticConclusionControls(snapshot({ riskTier: "R4", sourceVersions: [{ sourceKey: "OEM", version: "1", rightsStatus: "PROHIBITED", current: false }] })).reasonCodes).toEqual(expect.arrayContaining(["CONCLUSION_R4_PROHIBITED", "CONCLUSION_SOURCE_UNAVAILABLE"]));
  });
  it("supports honest abstention and escalation with recorded limitations", () => {
    expect(evaluateDiagnosticConclusionControls(snapshot({ action: "ABSTAIN", selectedCandidate: null, causeStatement: null, limitations: ["NO_REPRODUCTION"], priorConclusion: null }))).toMatchObject({ allowed: true, status: "ABSTAINED" });
    expect(evaluateDiagnosticConclusionControls(snapshot({ action: "ESCALATE", selectedCandidate: null, causeStatement: null, limitations: [], priorConclusion: null })).reasonCodes).toContain("CONCLUSION_LIMITATION_REQUIRED");
  });
  it("requires explicit proposal, rejection, and supersession lineage", () => {
    expect(evaluateDiagnosticConclusionControls(snapshot({ priorConclusion: null })).reasonCodes).toContain("CONCLUSION_PROPOSAL_REQUIRED");
    expect(evaluateDiagnosticConclusionControls(snapshot({ selectedCandidate: { ...candidate, hypothesisId: "hyp-2", hypothesisKey: "HYP_STARTER" } })).reasonCodes).toContain("CONCLUSION_CONFIRM_MUST_MATCH_PROPOSAL");
    expect(evaluateDiagnosticConclusionControls(snapshot({ action: "REJECT", selectedCandidate: null, causeStatement: null, priorConclusion: null })).reasonCodes).toContain("CONCLUSION_REJECT_REQUIRES_PROPOSAL");
    expect(evaluateDiagnosticConclusionControls(snapshot({ action: "SUPERSEDE", priorConclusion: { id: "old", status: "CONFIRMED", hypothesisKey: "HYP_BATTERY" } })).allowed).toBe(true);
  });
});
