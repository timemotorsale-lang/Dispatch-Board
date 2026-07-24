import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import {
  normalizeTimeCardCorrectionRequest,
  submitTimeCardCorrectionRequest,
  type TimeCardCorrectionRequestRepository
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
    employeeExplanation: "I forgot to end my meal break at the correct time.",
    idempotencyKey: "correction-1",
    requestedChangeType: "MEAL_TIME",
    requestedDate: "2026-07-24",
    requestedEndAt: "2026-07-24T18:30:00.000Z",
    requestedStartAt: "2026-07-24T18:00:00.000Z",
    ...overrides
  };
}

describe("time card correction requests", () => {
  it("normalizes an employee correction request without mutating punch events", () => {
    expect(normalizeTimeCardCorrectionRequest(staff, request(), {
      locationId: "loc-1",
      organizationId: "org-1"
    })).toMatchObject({
      employeeExplanation: "I forgot to end my meal break at the correct time.",
      idempotencyKey: "correction-1",
      locationId: "loc-1",
      organizationId: "org-1",
      requestedChangeType: "MEAL_TIME",
      staffUserId: "staff-1",
      timeCardId: null
    });
  });

  it("rejects invalid or too-short correction explanations", () => {
    expect(() => normalizeTimeCardCorrectionRequest(staff, request({
      employeeExplanation: "Too short"
    }), {
      locationId: "loc-1",
      organizationId: "org-1"
    })).toThrow("Correction explanation");
  });

  it("submits through the repository with the authenticated staff member", async () => {
    const submit = vi.fn<TimeCardCorrectionRequestRepository["submit"]>(async (input) => ({
      duplicate: false,
      request: {
        id: "correction-request-1",
        employeeExplanation: input.employeeExplanation,
        idempotencyKey: input.idempotencyKey,
        requestedChangeType: input.requestedChangeType,
        requestedDate: "2026-07-24",
        requestedEndAt: input.requestedEndAt?.toISOString() ?? null,
        requestedStartAt: input.requestedStartAt?.toISOString() ?? null,
        status: "SUBMITTED"
      }
    }));

    await expect(submitTimeCardCorrectionRequest(staff, request(), {
      locationId: "loc-1",
      organizationId: "org-1",
      repository: { submit }
    })).resolves.toMatchObject({
      duplicate: false,
      request: {
        id: "correction-request-1",
        requestedChangeType: "MEAL_TIME",
        status: "SUBMITTED"
      }
    });
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      staffUserId: "staff-1"
    }));
  });

  it("surfaces idempotency conflicts", async () => {
    const submit = vi.fn<TimeCardCorrectionRequestRepository["submit"]>(async () => {
      throw new EnterpriseCommandConflictError(
        "Idempotency key was already used with a different correction request.",
        "IDEMPOTENCY_KEY_REUSED"
      );
    });

    await expect(submitTimeCardCorrectionRequest(staff, request(), {
      locationId: "loc-1",
      organizationId: "org-1",
      repository: { submit }
    })).rejects.toThrow("Idempotency key");
  });
});
