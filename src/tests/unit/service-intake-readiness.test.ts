import { describe, expect, it } from "vitest";

import { buildServiceIntakeReadiness } from "@/server/service-intake/readiness-service";

type Facts = Parameters<typeof buildServiceIntakeReadiness>[0];

const now = new Date("2026-07-20T15:00:00.000Z");

function baseFacts(overrides: Partial<Facts> = {}): Facts {
  return {
    appointments: [],
    identity: { customer: true, location: true, vehicle: true },
    openRepairOrders: 2,
    overdueRepairOrders: 0,
    resources: [
      { capacity: 2, kind: "STAFF", reservations: [], unavailability: [] },
      { capacity: 1, kind: "SERVICE_BAY", reservations: [], unavailability: [] },
    ],
    ...overrides,
  };
}

describe("service-intake readiness policy", () => {
  it("returns ready when a timely appointment has committed mandatory resources", () => {
    const appointment = {
      appointmentNumber: "APT-100",
      attendanceStatus: "EXPECTED",
      endsAt: new Date("2026-07-20T17:00:00.000Z"),
      id: "appointment-1",
      ownerUser: { name: "Alex Advisor" },
      resourceRequirements: [
        { assignmentTiming: "BOOKING", hardBlockIfUnfulfilled: true, isMandatory: true, requirementCode: "TECH", reservations: [{ resource: { resourceType: { kind: "STAFF" } }, status: "COMMITTED" }] },
        { assignmentTiming: "BOOKING", hardBlockIfUnfulfilled: true, isMandatory: true, requirementCode: "BAY", reservations: [{ resource: { resourceType: { kind: "SERVICE_BAY" } }, status: "COMMITTED" }] },
      ],
      startsAt: new Date("2026-07-20T15:15:00.000Z"),
      title: "Brake inspection",
      version: 7,
    };
    const result = buildServiceIntakeReadiness(baseFacts({ appointments: [appointment] }), now, now);

    expect(result.status).toBe("READY");
    expect(result.appointment).toMatchObject({ appointmentNumber: "APT-100", expectedVersion: 7, timing: "ON_TIME" });
    expect(result.canAcceptCustody).toBe(true);
    expect(result.promiseConfidence).toBe("HIGH");
  });

  it("accepts a walk-in with transparent constraints when live capacity exists", () => {
    const result = buildServiceIntakeReadiness(baseFacts(), now, now);

    expect(result.status).toBe("ACCEPT_WITH_CONSTRAINTS");
    expect(result.appointment).toBeNull();
    expect(result.canAcceptCustody).toBe(true);
    expect(result.promiseConfidence).toBe("CONDITIONAL");
    expect(result.alternatives).toContain("Review the next qualified appointment window.");
  });

  it("requires manager review before a promise when mandatory resources and capacity are unavailable", () => {
    const appointment = {
      appointmentNumber: "APT-200",
      attendanceStatus: "EXPECTED",
      endsAt: null,
      id: "appointment-2",
      ownerUser: null,
      resourceRequirements: [
        { assignmentTiming: "BOOKING", hardBlockIfUnfulfilled: true, isMandatory: true, requirementCode: "LIFT", reservations: [] },
      ],
      startsAt: now,
      title: "Suspension diagnosis",
      version: 2,
    };
    const result = buildServiceIntakeReadiness(baseFacts({ appointments: [appointment], openRepairOrders: 9, overdueRepairOrders: 5, resources: [] }), now, now);

    expect(result.status).toBe("MANAGER_REVIEW");
    expect(result.canAcceptCustody).toBe(true);
    expect(result.diagnosisOutlook).toBe("CAPACITY_REVIEW");
    expect(result.promiseConfidence).toBe("DO_NOT_PROMISE");
    expect(result.checks.some((check) => check.code === "RESOURCES" && check.status === "REVIEW")).toBe(true);
  });
});
