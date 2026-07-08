import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  recommendAppointmentAvailability: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-availability-recommendation-service", () => ({
  recommendAppointmentAvailability: mocks.recommendAppointmentAvailability
}));

import { GET } from "@/app/api/appointments/[id]/availability-recommendations/route";

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

describe("appointment availability recommendation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.recommendAppointmentAvailability.mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      bookingStatus: "DRAFT",
      templateCode: "APT-GENERAL",
      templateSource: "GENERAL_FALLBACK",
      windowStartLocalDate: "2026-07-06",
      windowEndLocalDate: "2026-07-10",
      searchedCandidateCount: 6,
      truncated: true,
      candidateCount: 3,
      ownerStaffCount: 1,
      requiredParticipantCount: 0,
      selectedResourceCount: 0,
      candidates: [
        {
          candidateRank: 1,
          score: 1200,
          localDate: "2026-07-06",
          startMinuteOfDay: 600,
          startsAt: new Date("2026-07-06T15:00:00.000Z"),
          endsAt: new Date("2026-07-06T16:00:00.000Z"),
          status: "AVAILABLE",
          canCommit: true,
          explanation: ["Candidate has no hard blocks or unresolved warnings."],
          reasons: []
        }
      ]
    });
  });

  it("returns availability recommendations for an appointment", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointments/appointment-1/availability-recommendations"),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      availabilityRecommendations: {
        appointmentId: "appointment-1",
        templateCode: "APT-GENERAL",
        candidates: [
          {
            candidateRank: 1,
            status: "AVAILABLE"
          }
        ]
      }
    });
    expect(mocks.recommendAppointmentAvailability).toHaveBeenCalledWith(
      managerUser,
      "appointment-1"
    );
  });

  it("passes proposed scheduling and search options to the recommendation service", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/appointments/appointment-1/availability-recommendations?proposedStartsAt=2026-07-06T16%3A00%3A00.000Z&proposedEndsAt=2026-07-06T17%3A00%3A00.000Z&proposedSchedulingTimezone=America%2FChicago&maximumCandidates=4&searchHorizonDays=3"
      ),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.recommendAppointmentAvailability).toHaveBeenCalledWith(
      managerUser,
      "appointment-1",
      undefined,
      undefined,
      {
        proposedStartsAt: new Date("2026-07-06T16:00:00.000Z"),
        proposedEndsAt: new Date("2026-07-06T17:00:00.000Z"),
        proposedSchedulingTimezone: "America/Chicago",
        maximumCandidates: 4,
        searchHorizonDays: 3
      }
    );
  });

  it("rejects invalid proposed scheduling windows", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/appointments/appointment-1/availability-recommendations?proposedStartsAt=not-a-date"
      ),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Proposed appointment start must be a valid date."
    });
  });

  it("rejects invalid positive integer search options", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/appointments/appointment-1/availability-recommendations?maximumCandidates=0"
      ),
      {
        params: Promise.resolve({
          id: "appointment-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Availability recommendation maximum candidates must be a positive integer."
    });
  });

  it("maps missing appointments to 404", async () => {
    mocks.recommendAppointmentAvailability.mockRejectedValue(new Error("Appointment not found."));

    const response = await GET(
      new Request("http://localhost/api/appointments/missing/availability-recommendations"),
      {
        params: Promise.resolve({
          id: "missing"
        })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment not found."
    });
  });
});
