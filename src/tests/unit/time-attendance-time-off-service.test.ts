import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import {
  normalizeStaffTimeOffRequest,
  submitStaffTimeOffRequest,
  type StaffTimeOffRequestRepository
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
    endsAt: "2026-07-27T18:00:00.000Z",
    idempotencyKey: "time-off-1",
    operationalNote: "Family appointment coverage needed.",
    requestType: "PTO",
    startsAt: "2026-07-27T14:00:00.000Z",
    ...overrides
  };
}

describe("staff time-off requests", () => {
  it("normalizes ordinary PTO as a manager-submitted request", () => {
    expect(normalizeStaffTimeOffRequest(staff, request(), {
      locationId: "loc-1",
      organizationId: "org-1"
    })).toMatchObject({
      idempotencyKey: "time-off-1",
      locationId: "loc-1",
      organizationId: "org-1",
      protectedRouting: false,
      requestType: "PTO",
      requestedMinutes: 240,
      requesterUserId: "staff-1",
      status: "SUBMITTED"
    });
  });

  it("routes Minnesota ESST with restricted reason handling", () => {
    const normalized = normalizeStaffTimeOffRequest(staff, request({
      operationalNote: "",
      requestType: "ESST",
      restrictedReason: "Sick and safe time qualifying reason."
    }), {
      locationId: "loc-1",
      organizationId: "org-1"
    });

    expect(normalized).toMatchObject({
      operationalNote: "Protected ESST request. Private reason is restricted.",
      protectedRouting: true,
      requestType: "ESST",
      status: "LEAVE_ADMIN_REVIEW"
    });
    expect(normalized.restrictedReasonHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects ESST requests without a private reason", () => {
    expect(() => normalizeStaffTimeOffRequest(staff, request({
      requestType: "ESST",
      restrictedReason: "short"
    }), {
      locationId: "loc-1",
      organizationId: "org-1"
    })).toThrow("ESST requests require");
  });

  it("submits through the repository with the authenticated staff member", async () => {
    const submit = vi.fn<StaffTimeOffRequestRepository["submit"]>(async (input) => ({
      duplicate: false,
      request: {
        endsAt: input.endsAt.toISOString(),
        id: "time-off-request-1",
        protectedRouting: input.protectedRouting,
        requestedMinutes: input.requestedMinutes,
        requestType: input.requestType,
        startsAt: input.startsAt.toISOString(),
        status: input.status
      }
    }));

    await expect(submitStaffTimeOffRequest(staff, request(), {
      locationId: "loc-1",
      organizationId: "org-1",
      repository: { submit }
    })).resolves.toMatchObject({
      request: {
        id: "time-off-request-1",
        requestType: "PTO",
        status: "SUBMITTED"
      }
    });
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      requesterUserId: "staff-1"
    }));
  });

  it("surfaces idempotency conflicts", async () => {
    const submit = vi.fn<StaffTimeOffRequestRepository["submit"]>(async () => {
      throw new EnterpriseCommandConflictError(
        "Idempotency key was already used with a different time-off request.",
        "IDEMPOTENCY_KEY_REUSED"
      );
    });

    await expect(submitStaffTimeOffRequest(staff, request(), {
      locationId: "loc-1",
      organizationId: "org-1",
      repository: { submit }
    })).rejects.toThrow("Idempotency key");
  });
});
