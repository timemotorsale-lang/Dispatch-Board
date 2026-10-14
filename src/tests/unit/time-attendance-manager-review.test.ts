import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createTimeAttendanceManagerReviewRepository,
  getTimeAttendanceManagerReviewQueue
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

describe("time attendance manager review queue", () => {
  it("hides manager queue details from non-managers", async () => {
    await expect(getTimeAttendanceManagerReviewQueue(staff, {
      now: new Date("2026-07-24T15:00:00.000Z"),
      organizationId: "org-1"
    })).resolves.toMatchObject({
      permitted: false,
      totals: { all: 0, blocking: 0, corrections: 0, disputes: 0, exceptions: 0, timeOff: 0 },
      items: []
    });
  });

  it("projects correction requests, exceptions, and disputes for managers", async () => {
    const repository = createTimeAttendanceManagerReviewRepository({
      timeCardCorrectionRequest: {
        findMany: async () => [{
          id: "correction-1",
          employeeExplanation: "Forgot to end meal break at the correct time.",
          requestedAt: new Date("2026-07-24T14:00:00.000Z"),
          requestedChangeType: "MEAL_TIME",
          status: "SUBMITTED",
          staffUser: { name: "Staff One" }
        }]
      },
      timeCardException: {
        findMany: async () => [{
          id: "exception-1",
          blocking: true,
          code: "MISSING_CLOCK_OUT",
          createdAt: new Date("2026-07-24T13:00:00.000Z"),
          message: "Clock out is missing.",
          status: "OPEN",
          timeCard: { staffUser: { name: "Staff Two" } }
        }]
      },
      timeCardAttestation: {
        findMany: async () => [{
          id: "attestation-1",
          attestedAt: new Date("2026-07-24T12:00:00.000Z"),
          statement: "Employee disputes this time card and requests review.",
          timeCard: { staffUser: { name: "Staff Three" } },
          timeCardId: "card-1",
          timeCardVersion: 2
        }]
      },
      timeOffRequest: {
        findMany: async () => [{
          createdAt: new Date("2026-07-24T14:30:00.000Z"),
          endsAt: new Date("2026-07-25T18:00:00.000Z"),
          id: "time-off-1",
          operationalNote: null,
          protectedRouting: true,
          requesterUser: { name: "Staff Four" },
          requestedMinutes: 240,
          requestType: "ESST",
          startsAt: new Date("2026-07-25T14:00:00.000Z"),
          status: "LEAVE_ADMIN_REVIEW"
        }]
      }
    });

    await expect(getTimeAttendanceManagerReviewQueue(manager, {
      now: new Date("2026-07-24T15:00:00.000Z"),
      organizationId: "org-1",
      repository
    })).resolves.toMatchObject({
      permitted: true,
      totals: { all: 4, blocking: 2, corrections: 1, disputes: 1, exceptions: 1, timeOff: 1 },
      items: [
        { category: "ATTESTATION_DISPUTE", severity: "danger", staffName: "Staff Three" },
        { category: "CARD_EXCEPTION", severity: "danger", staffName: "Staff Two" },
        { category: "CORRECTION_REQUEST", severity: "warning", staffName: "Staff One" },
        { category: "TIME_OFF_REQUEST", severity: "warning", staffName: "Staff Four" }
      ]
    });
  });
});
