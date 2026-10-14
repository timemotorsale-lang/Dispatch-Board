import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateTimeAttendanceHardeningPilotReadiness } from "@/server/time-attendance";

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

describe("time attendance hardening and pilot readiness", () => {
  it("requires authentication", () => {
    expect(() => evaluateTimeAttendanceHardeningPilotReadiness(null)).toThrow("Authentication required");
  });

  it("hides hardening gate detail from non-managers", () => {
    expect(evaluateTimeAttendanceHardeningPilotReadiness(staff, new Date("2026-07-24T15:00:00.000Z"))).toMatchObject({
      permitted: false,
      pilotEligible: false,
      productionEligible: false,
      totals: { blocked: 0, evidenceRequired: 0, gates: 0, sourceReady: 0 },
      gates: []
    });
  });

  it("surfaces all TA-G5 gates for managers without claiming pilot or production eligibility", () => {
    const readiness = evaluateTimeAttendanceHardeningPilotReadiness(manager, new Date("2026-07-24T15:00:00.000Z"));

    expect(readiness).toMatchObject({
      generatedAt: "2026-07-24T15:00:00.000Z",
      permitted: true,
      phase: "TA-G5",
      pilotEligible: false,
      productionEligible: false,
      totals: {
        blocked: 2,
        evidenceRequired: 4,
        gates: 6,
        sourceReady: 0
      }
    });
    expect(readiness.gates.map((gate) => gate.id)).toEqual([
      "TA-050",
      "TA-051",
      "TA-052",
      "TA-053",
      "TA-054",
      "TA-055"
    ]);
  });

  it("keeps security, restore, accessibility, pilot, training, and rollback evidence explicit", () => {
    const readiness = evaluateTimeAttendanceHardeningPilotReadiness(manager);

    expect(readiness.gates.find((gate) => gate.id === "TA-050")?.requiredEvidence).toContain("restricted leave-data access review");
    expect(readiness.gates.find((gate) => gate.id === "TA-052")?.blockers).toContain("a real backup/restore drill and post-restore checksum reconciliation remain pending");
    expect(readiness.gates.find((gate) => gate.id === "TA-053")?.requiredEvidence).toContain("screen-reader review of employee, manager, and payroll panels");
    expect(readiness.gates.find((gate) => gate.id === "TA-054")?.blockers).toContain("parallel payroll pilot has not run");
    expect(readiness.gates.find((gate) => gate.id === "TA-055")?.requiredEvidence).toContain("rollback drill proving feature disablement without data deletion");
  });
});
