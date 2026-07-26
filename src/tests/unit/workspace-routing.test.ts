import { describe, expect, it } from "vitest";

import {
  getDefaultLandingRoute,
  getWorkspaceKey,
  isTechnicianOnlyUser,
  resolvePostLoginRoute,
  resolveWorkRecordRoute
} from "@/server/auth/navigation";
import type { AuthenticatedUser } from "@/server/auth/store";

function user(roles: string[], duties: string[] = []): AuthenticatedUser {
  return {
    id: "user-1",
    name: "Test User",
    email: "user@example.test",
    isActive: true,
    roles,
    duties: { direct: duties, roleDefaults: [], all: duties }
  };
}

describe("role landing and record routing", () => {
  it("routes each primary role to its approved landing", () => {
    expect(getDefaultLandingRoute(user(["General Manager"]))).toBe("/board");
    expect(getDefaultLandingRoute(user(["Service Department Manager"]))).toBe("/vehicles/shop-recon");
    expect(getDefaultLandingRoute(user(["Inventory Manager"]))).toBe("/vehicles");
    expect(getDefaultLandingRoute(user(["Service Advisor"]))).toBe("/appointments");
    expect(getDefaultLandingRoute(user(["Mechanic"]))).toBe("/my-tasks");
    expect(getDefaultLandingRoute(user(["Salesperson"]))).toBe("/tasks?department=SALES");
    expect(getDefaultLandingRoute(user(["Unknown Staff"]))).toBe("/my-tasks");
  });

  it("uses manager precedence for a legitimate manager-mechanic identity", () => {
    const multiRole = user(["Mechanic", "General Manager"]);
    expect(getWorkspaceKey(multiRole)).toBe("MANAGEMENT");
    expect(isTechnicianOnlyUser(multiRole)).toBe(false);
    expect(getDefaultLandingRoute(multiRole)).toBe("/board");
  });

  it("rejects broad console return targets for mechanic-only login", () => {
    const mechanic = user(["Mechanic"]);
    expect(resolvePostLoginRoute(mechanic, "/vehicles/control-tower")).toBe("/my-tasks");
    expect(resolvePostLoginRoute(mechanic, "/vehicles/shop-recon")).toBe("/my-tasks");
    expect(resolvePostLoginRoute(mechanic, "/vehicles/repair-jobs/job-1/workbench")).toBe(
      "/vehicles/repair-jobs/job-1/workbench"
    );
    expect(resolvePostLoginRoute(mechanic, "//outside.example")).toBe("/my-tasks");
  });

  it("routes specialist records before generic task detail", () => {
    expect(resolveWorkRecordRoute({ taskId: "task-1", repairJobId: "job-1" })).toBe(
      "/vehicles/repair-jobs/job-1/workbench"
    );
    expect(resolveWorkRecordRoute({ taskId: "task-1", diagnosticCaseId: "case-1" })).toBe(
      "/diagnostics/cases/case-1/troubleshooting"
    );
    expect(resolveWorkRecordRoute({
      taskId: "task-1",
      inventoryWorkPacket: { vehicleId: "vehicle-1", inventoryUnitId: "unit-1" }
    })).toBe("/vehicles/vehicle-1/workbench?inventoryUnitId=unit-1");
    expect(resolveWorkRecordRoute({ taskId: "task-1" })).toBe("/tasks/task-1");
  });
});
