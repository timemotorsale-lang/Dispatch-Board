import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { evaluateTimeAttendanceCapability } from "@/server/time-attendance/capabilities";

const employee: AuthenticatedUser = {
  id: "employee-1",
  name: "Employee",
  email: "employee@example.com",
  isActive: true,
  roles: ["Service Advisor"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

describe("time attendance capabilities", () => {
  it("allows employee self service without exposing payroll administration", () => {
    expect(evaluateTimeAttendanceCapability({ actor: employee, capability: "TIME_SELF_SERVICE" }).allowed).toBe(true);
    expect(evaluateTimeAttendanceCapability({ actor: employee, capability: "TIME_PAYROLL_ADMIN" }).allowed).toBe(false);
  });

  it("honors explicit deny over a role baseline", () => {
    const manager = { ...employee, roles: ["General Manager"] };
    const decision = evaluateTimeAttendanceCapability({
      actor: manager,
      capability: "TIME_EXPORT_RECONCILIATION",
      grants: [{
        capability: "TIME_EXPORT_RECONCILIATION",
        constraints: {},
        effect: "DENY",
        locationId: null,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null
      }]
    });
    expect(decision).toEqual({ allowed: false, reason: "EXPLICIT_DENY" });
  });

  it("enforces independent approval constraints", () => {
    const decision = evaluateTimeAttendanceCapability({
      actor: employee,
      capability: "TIME_ATTENDANCE_MANAGER",
      priorActorUserId: employee.id,
      grants: [{
        capability: "TIME_ATTENDANCE_MANAGER",
        constraints: { requiresIndependentApproval: true },
        effect: "ALLOW",
        locationId: null,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null
      }]
    });
    expect(decision.allowed).toBe(false);
  });
});
