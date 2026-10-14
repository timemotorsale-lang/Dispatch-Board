import { describe, expect, it } from "vitest";
import { assertActivationAuthority, evaluateExpansionReadiness, evaluatePrePilotReadiness, PRE_PILOT_GATES, SIGNOFF_DIMENSIONS, validatePilotScope } from "@/server/enterprise-readiness/domain";

describe("R12 enterprise readiness gates", () => {
  it("does not treat missing evidence as readiness", () => {
    const result = evaluatePrePilotReadiness([]);
    expect(result.ready).toBe(false);
    expect(result.blockers).toHaveLength(6);
  });

  it("requires an independent reviewer for passed evidence", () => {
    const evidence = PRE_PILOT_GATES.map((gateCode) => ({ gateCode, status: "PASSED", submittedByUserId: "same-user", reviewedByUserId: "same-user" }));
    const result = evaluatePrePilotReadiness(evidence);
    expect(result.ready).toBe(false);
    expect(result.blockers.every((item) => item.includes("independent review"))).toBe(true);
  });

  it("accepts current, independently reviewed pre-pilot evidence", () => {
    const evidence = PRE_PILOT_GATES.map((gateCode) => ({ gateCode, status: "PASSED", submittedByUserId: "submitter", reviewedByUserId: "reviewer", expiresAt: "2099-01-01T00:00:00.000Z" }));
    expect(evaluatePrePilotReadiness(evidence).ready).toBe(true);
  });

  it("requires all ten gates and eight explicit sign-offs for expansion", () => {
    const evidence = Array.from({ length: 10 }, (_, index) => ({ gateCode: `IC-${120 + index}`, status: "PASSED", submittedByUserId: "submitter", reviewedByUserId: "reviewer" }));
    const incomplete = evaluateExpansionReadiness(evidence, []);
    expect(incomplete.ready).toBe(false);
    expect(incomplete.blockers).toHaveLength(8);
    const complete = evaluateExpansionReadiness(evidence, SIGNOFF_DIMENSIONS.map((dimension) => ({ dimension, decision: "APPROVE" })));
    expect(complete.ready).toBe(true);
  });

  it("rejects unbounded pilot scope", () => {
    expect(() => validatePilotScope({ locationIds: ["loc"], roleCodes: [], sliceCodes: ["IC-126"], commandCodes: ["START"] })).toThrow(/location, role, slice, and command/);
  });

  it("keeps activation fail-closed", () => {
    expect(() => assertActivationAuthority(false)).toThrow(/activation is disabled/i);
    expect(() => assertActivationAuthority(true)).not.toThrow();
  });
});
