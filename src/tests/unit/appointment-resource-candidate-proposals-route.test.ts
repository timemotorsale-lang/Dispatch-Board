import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  proposeAppointmentResourceCandidate: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-resource-planning-service", () => ({
  proposeAppointmentResourceCandidate: mocks.proposeAppointmentResourceCandidate
}));

import { POST } from "@/app/api/appointments/[id]/resource-requirements/[requirementId]/candidate-proposals/route";
import { AppointmentVersionConflictError } from "@/server/services/appointment-version-conflict";

const managerUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

describe("appointment resource candidate proposals route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.proposeAppointmentResourceCandidate.mockResolvedValue({
      id: "reservation-proposed",
      appointmentId: "appointment-1",
      requirementId: "requirement-1",
      resourceId: "resource-bay-1",
      resourceCode: "BAY_1",
      resourceName: "Service Bay 1",
      status: "PROPOSED",
      startsAt: new Date("2026-07-06T15:00:00.000Z"),
      endsAt: new Date("2026-07-06T16:00:00.000Z"),
      capacityUnits: 1,
      created: true,
      cancelledPriorProposalCount: 0,
      appointmentVersion: 4
    });
  });

  it("proposes a resource candidate for an attached requirement", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-requirements/requirement-1/candidate-proposals",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-1",
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
            reasonNotes: "Propose Bay 1 before scheduling.",
            correlationId: "correlation-1"
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          requirementId: "requirement-1"
        })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      proposal: {
        id: "reservation-proposed",
        resourceName: "Service Bay 1",
        status: "PROPOSED",
        created: true,
        appointmentVersion: 4
      }
    });
    expect(mocks.proposeAppointmentResourceCandidate).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        requirementId: "requirement-1",
        resourceId: "resource-bay-1",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
        reasonNotes: "Propose Bay 1 before scheduling.",
        correlationId: "correlation-1",
        proposedStartsAt: null,
        proposedEndsAt: null,
        proposedSchedulingTimezone: null
      }
    );
  });

  it("passes proposed scheduling window fields for unscheduled draft candidate proposals", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-requirements/requirement-1/candidate-proposals",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-1",
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
            reasonNotes: "Propose Bay 1 for the selected draft slot.",
            correlationId: "correlation-1",
            proposedStartsAt: "2026-07-06T16:00:00.000Z",
            proposedEndsAt: "2026-07-06T17:00:00.000Z",
            proposedSchedulingTimezone: "America/Chicago"
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          requirementId: "requirement-1"
        })
      }
    );

    expect(response.status).toBe(201);
    expect(mocks.proposeAppointmentResourceCandidate).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      {
        requirementId: "requirement-1",
        resourceId: "resource-bay-1",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
        reasonNotes: "Propose Bay 1 for the selected draft slot.",
        correlationId: "correlation-1",
        proposedStartsAt: new Date("2026-07-06T16:00:00.000Z"),
        proposedEndsAt: new Date("2026-07-06T17:00:00.000Z"),
        proposedSchedulingTimezone: "America/Chicago"
      }
    );
  });

  it("rejects invalid proposed scheduling windows", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-requirements/requirement-1/candidate-proposals",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-1",
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
            reasonNotes: "Propose Bay 1 for the selected draft slot.",
            proposedStartsAt: "not-a-date"
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          requirementId: "requirement-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Proposed appointment start must be a valid date."
    });
  });

  it("maps stale versions to conflict", async () => {
    mocks.proposeAppointmentResourceCandidate.mockRejectedValue(
      new AppointmentVersionConflictError({
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 4
      })
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-requirements/requirement-1/candidate-proposals",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-1",
            expectedAppointmentVersion: 2,
            reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
            reasonNotes: "Propose Bay 1 before scheduling."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          requirementId: "requirement-1"
        })
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment version is stale.",
      conflict: {
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 4
      }
    });
  });

  it("maps missing requirements to not found", async () => {
    mocks.proposeAppointmentResourceCandidate.mockRejectedValue(
      new Error("Resource requirement not found for this appointment.")
    );

    const response = await POST(
      new Request(
        "http://localhost/api/appointments/appointment-1/resource-requirements/missing/candidate-proposals",
        {
          method: "POST",
          body: JSON.stringify({
            resourceId: "resource-bay-1",
            expectedAppointmentVersion: 3,
            reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
            reasonNotes: "Propose Bay 1 before scheduling."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "appointment-1",
          requirementId: "missing"
        })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Resource requirement not found for this appointment."
    });
  });
});
