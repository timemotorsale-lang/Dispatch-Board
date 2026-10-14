import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import {
  createTimeCardCorrectionDecisionRepository,
  decideTimeCardCorrectionRequest,
  normalizeTimeCardCorrectionManagerDecision,
  type TimeCardCorrectionDecisionRepository
} from "@/server/time-attendance";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.com",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Staff One",
  email: "staff@example.com",
  isActive: true,
  roles: ["Mechanic"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    decision: "APPROVE",
    idempotencyKey: "manager-decision-1",
    managerReason: "Employee explanation matches the shift record.",
    requestId: "correction-1",
    ...overrides
  };
}

describe("time card manager correction decisions", () => {
  it("normalizes a reasoned manager correction decision", () => {
    expect(normalizeTimeCardCorrectionManagerDecision(manager, payload(), {
      organizationId: "org-1"
    })).toMatchObject({
      decision: "APPROVE",
      idempotencyKey: "manager-decision-1",
      managerReason: "Employee explanation matches the shift record.",
      managerUserId: "manager-1",
      organizationId: "org-1",
      requestId: "correction-1"
    });
  });

  it("requires manager authority", async () => {
    await expect(decideTimeCardCorrectionRequest(staff, payload(), {
      organizationId: "org-1",
      repository: { decide: vi.fn() }
    })).rejects.toThrow("Only managers");
  });

  it("records approval evidence without changing the original punch trail", async () => {
    const update = vi.fn(async (input) => ({
      id: "correction-1",
      managerDecision: input.data.managerDecision,
      managerReason: input.data.managerReason,
      status: input.data.status,
      evidence: input.data.evidence
    }));
    const repository = createTimeCardCorrectionDecisionRepository({
      timeCardCorrectionRequest: {
        findFirst: async () => ({
          id: "correction-1",
          evidence: { originalPunchTrailUnchanged: true },
          managerDecision: null,
          managerReason: null,
          status: "SUBMITTED"
        }),
        update
      }
    });

    await expect(decideTimeCardCorrectionRequest(manager, payload(), {
      organizationId: "org-1",
      repository
    })).resolves.toMatchObject({
      duplicate: false,
      request: {
        id: "correction-1",
        managerDecision: "APPROVE",
        status: "APPROVED"
      }
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        evidence: expect.objectContaining({
          managerDecisionHistory: [
            expect.objectContaining({
              originalPunchTrailUnchanged: true,
              payrollRecalculationRequired: false
            })
          ]
        })
      })
    }));
  });

  it("requires approval before applying a correction", async () => {
    const repository = createTimeCardCorrectionDecisionRepository({
      timeCardCorrectionRequest: {
        findFirst: async () => ({
          id: "correction-1",
          evidence: {},
          managerDecision: null,
          managerReason: null,
          status: "SUBMITTED"
        }),
        update: async () => {
          throw new Error("Should not update");
        }
      }
    });

    await expect(decideTimeCardCorrectionRequest(manager, payload({
      decision: "APPLY",
      managerReason: "Correction is approved and ready for payroll review."
    }), {
      organizationId: "org-1",
      repository
    })).rejects.toThrow("must be approved");
  });

  it("returns duplicate manager decisions safely and rejects conflicting idempotency reuse", async () => {
    const normalized = normalizeTimeCardCorrectionManagerDecision(manager, payload(), {
      organizationId: "org-1"
    });
    const repository = createTimeCardCorrectionDecisionRepository({
      timeCardCorrectionRequest: {
        findFirst: async () => ({
          id: "correction-1",
          evidence: {
            managerDecisionHistory: [{
              idempotencyKey: normalized.idempotencyKey,
              requestHash: normalized.requestHash
            }]
          },
          managerDecision: "APPROVE",
          managerReason: "Employee explanation matches the shift record.",
          status: "APPROVED"
        }),
        update: async () => {
          throw new Error("Should not update duplicate");
        }
      }
    });

    await expect(decideTimeCardCorrectionRequest(manager, payload(), {
      organizationId: "org-1",
      repository
    })).resolves.toMatchObject({ duplicate: true });

    await expect(decideTimeCardCorrectionRequest(manager, payload({
      managerReason: "Different manager explanation with the same retry key."
    }), {
      organizationId: "org-1",
      repository
    })).rejects.toBeInstanceOf(EnterpriseCommandConflictError);
  });

  it("submits through the injected manager decision repository", async () => {
    const decide = vi.fn<TimeCardCorrectionDecisionRepository["decide"]>(async (input) => ({
      duplicate: false,
      request: {
        id: input.requestId,
        managerDecision: input.decision,
        managerReason: input.managerReason,
        status: "APPROVED"
      }
    }));

    await expect(decideTimeCardCorrectionRequest(manager, payload(), {
      organizationId: "org-1",
      repository: { decide }
    })).resolves.toMatchObject({
      request: {
        managerDecision: "APPROVE",
        status: "APPROVED"
      }
    });
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({
      managerUserId: "manager-1"
    }));
  });
});
