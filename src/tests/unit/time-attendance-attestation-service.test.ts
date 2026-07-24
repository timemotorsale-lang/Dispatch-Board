import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import {
  normalizeTimeCardAttestationRequest,
  submitTimeCardAttestation,
  type TimeCardAttestationRepository
} from "@/server/time-attendance";

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Staff One",
  email: "staff@example.com",
  isActive: true,
  roles: ["Mechanic"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    cardChecksum: "sha256:" + "a".repeat(64),
    decision: "ATTEST",
    idempotencyKey: "attest-1",
    timeCardId: "card-1",
    timeCardVersion: 2,
    ...overrides
  };
}

describe("time card attestation", () => {
  it("normalizes a no-rights-waiver employee attestation", () => {
    const normalized = normalizeTimeCardAttestationRequest(staff, request(), {
      organizationId: "org-1"
    });

    expect(normalized).toMatchObject({
      cardChecksum: "sha256:" + "a".repeat(64),
      decision: "ATTEST",
      staffUserId: "staff-1",
      statement: expect.stringContaining("does not waive")
    });
  });

  it("requires a meaningful dispute explanation", () => {
    expect(() => normalizeTimeCardAttestationRequest(staff, request({
      decision: "DISPUTE",
      disputeExplanation: "Too short"
    }), {
      organizationId: "org-1"
    })).toThrow("Dispute explanation");
  });

  it("submits a versioned card attestation through the repository", async () => {
    const submit = vi.fn<TimeCardAttestationRepository["submit"]>(async (input) => ({
      duplicate: false,
      attestation: {
        cardChecksum: input.cardChecksum,
        decision: input.decision,
        id: "attestation-1",
        statement: input.statement,
        timeCardId: input.timeCardId,
        timeCardVersion: input.timeCardVersion
      }
    }));

    await expect(submitTimeCardAttestation(staff, request(), {
      organizationId: "org-1",
      repository: { submit }
    })).resolves.toMatchObject({
      duplicate: false,
      attestation: {
        decision: "ATTEST",
        id: "attestation-1",
        timeCardVersion: 2
      }
    });
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      staffUserId: "staff-1",
      timeCardId: "card-1",
      timeCardVersion: 2
    }));
  });

  it("surfaces conflicting attestations for the same card version", async () => {
    const submit = vi.fn<TimeCardAttestationRepository["submit"]>(async () => {
      throw new EnterpriseCommandConflictError(
        "This card version already has a different employee attestation.",
        "VERSION_CONFLICT"
      );
    });

    await expect(submitTimeCardAttestation(staff, request(), {
      organizationId: "org-1",
      repository: { submit }
    })).rejects.toThrow("different employee attestation");
  });
});
