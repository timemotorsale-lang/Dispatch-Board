import { describe, expect, it } from "vitest";
import { evaluateTimeCardApprovalEligibility } from "@/server/time-attendance/card-approval-service";

const clean = {
  actorUserId: "manager-1",
  staffUserId: "staff-1",
  cardChecksum: "sha256:card",
  version: 4,
  attestations: [{ cardChecksum: "sha256:card", statement: "Employee confirms this card.", timeCardVersion: 4 }],
  exceptions: [],
  correctionRequests: []
};

describe("time card approval eligibility", () => {
  it("allows only a clean exact attested version", () => {
    expect(evaluateTimeCardApprovalEligibility(clean)).toEqual({ eligible: true, reason: "CLEAN_EXACT_VERSION" });
  });

  it("blocks self approval, stale/disputed attestations, exceptions, and corrections", () => {
    expect(evaluateTimeCardApprovalEligibility({ ...clean, actorUserId: "staff-1" }).reason).toBe("SELF_APPROVAL_FORBIDDEN");
    expect(evaluateTimeCardApprovalEligibility({ ...clean, attestations: [{ ...clean.attestations[0], timeCardVersion: 3 }] }).reason).toBe("EXACT_ATTESTATION_REQUIRED");
    expect(evaluateTimeCardApprovalEligibility({ ...clean, attestations: [{ ...clean.attestations[0], statement: "Employee disputes card" }] }).reason).toBe("EXACT_ATTESTATION_REQUIRED");
    expect(evaluateTimeCardApprovalEligibility({ ...clean, exceptions: [{ blocking: true, status: "OPEN" }] }).reason).toBe("BLOCKING_EXCEPTION");
    expect(evaluateTimeCardApprovalEligibility({ ...clean, correctionRequests: [{ status: "SUBMITTED" }] }).reason).toBe("OPEN_CORRECTION");
  });
});
