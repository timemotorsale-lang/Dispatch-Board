import { describe, expect, it } from "vitest";

import {
  getDefaultLandingRoute,
  getPermittedWorkspaces,
  getWorkspaceKey,
  isOperationsCoordinatorDefaultUser,
  isRoutePermittedForUser,
  isTechnicianOnlyUser,
  resolvePostLoginRoute,
  resolveWorkspaceForPath,
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
    expect(getDefaultLandingRoute(user(["General Manager"]))).toBe("/manager-workspace");
    expect(getDefaultLandingRoute(user(["Vehicle Operations Lead"]))).toBe("/vehicles?workspace=vehicle-operations-lead");
    expect(getDefaultLandingRoute(user(["Service Department Manager"]))).toBe("/vehicles/recon-repair-advisor");
    expect(getDefaultLandingRoute(user(["Inventory Manager"]))).toBe("/vehicles");
    expect(getDefaultLandingRoute(user(["Service Advisor"]))).toBe("/vehicles/advisor");
    expect(getDefaultLandingRoute(user(["Mechanic"]))).toBe("/my-tasks");
    expect(getDefaultLandingRoute(user(["Parts"]))).toBe("/vehicles/parts-operations");
    expect(getDefaultLandingRoute(user(["Quality Control"]))).toBe("/vehicles/quality-control");
    expect(getDefaultLandingRoute(user(["Salesperson"]))).toBe("/tasks?department=SALES");
    expect(getDefaultLandingRoute(user(["Marketing/Advertisement Manager"]))).toBe("/tasks?department=MARKETING");
    expect(getDefaultLandingRoute(user(["Operations Coordinator"]))).toBe("/operations-coordinator");
    expect(getDefaultLandingRoute(user(["Office Manager"]))).toBe("/my-tasks");
    expect(getDefaultLandingRoute(user(["Collections"]))).toBe("/my-tasks?workspace=collections");
    expect(getDefaultLandingRoute(user(["Unknown Staff"]))).toBe("/my-tasks");
  });

  it("uses manager precedence for a legitimate manager-mechanic identity", () => {
    const multiRole = user(["Mechanic", "General Manager"]);
    expect(getWorkspaceKey(multiRole)).toBe("MANAGEMENT");
    expect(isTechnicianOnlyUser(multiRole)).toBe(false);
    expect(getDefaultLandingRoute(multiRole)).toBe("/manager-workspace");
    expect(getDefaultLandingRoute(multiRole, "TECHNICIAN")).toBe("/my-tasks");
  });

  it("permits an assigned workspace preference for a multi-role user", () => {
    const multiRole = user(["Office Manager", "Marketing/Advertisement Manager"]);
    expect(getPermittedWorkspaces(multiRole).map((workspace) => workspace.key)).toEqual([
      "OPERATIONS_COORDINATOR",
      "MARKETING",
      "OFFICE"
    ]);
    expect(getWorkspaceKey(multiRole)).toBe("OPERATIONS_COORDINATOR");
    expect(getDefaultLandingRoute(multiRole)).toBe("/operations-coordinator");
    expect(isOperationsCoordinatorDefaultUser(multiRole)).toBe(true);
    expect(getWorkspaceKey(multiRole, "OFFICE")).toBe("OFFICE");
    expect(getDefaultLandingRoute(multiRole, "OFFICE")).toBe("/my-tasks");
    expect(getWorkspaceKey(multiRole, "SERVICE")).toBe("OPERATIONS_COORDINATOR");
  });

  it("uses vehicle operations lead precedence for the current multi-hat operator", () => {
    const brock = user(["Inventory Manager", "Service Department Manager"]);

    expect(getPermittedWorkspaces(brock).map((workspace) => workspace.key)).toEqual([
      "VEHICLE_OPERATIONS_LEAD",
      "SERVICE",
      "INVENTORY",
      "ADVISOR"
    ]);
    expect(getWorkspaceKey(brock)).toBe("VEHICLE_OPERATIONS_LEAD");
    expect(getDefaultLandingRoute(brock)).toBe("/vehicles?workspace=vehicle-operations-lead");
    expect(resolveWorkspaceForPath(brock, "/vehicles/shop-recon")).toBe("VEHICLE_OPERATIONS_LEAD");
    expect(resolveWorkspaceForPath(brock, "/vehicles/parts-operations")).toBe("VEHICLE_OPERATIONS_LEAD");
    expect(getWorkspaceKey(brock, "INVENTORY")).toBe("INVENTORY");
    expect(getDefaultLandingRoute(brock, "INVENTORY")).toBe("/vehicles");
    expect(resolveWorkspaceForPath(brock, "/vehicles/advisor", "INVENTORY")).toBe("ADVISOR");
  });

  it("gives the vehicle operations lead governed advisor and technician workspaces", () => {
    const lead = user(["Vehicle Operations Lead"]);

    expect(getPermittedWorkspaces(lead).map((workspace) => workspace.key)).toEqual([
      "VEHICLE_OPERATIONS_LEAD",
      "ADVISOR",
      "TECHNICIAN"
    ]);
    expect(isRoutePermittedForUser(lead, "/appointments")).toBe(true);
    expect(isRoutePermittedForUser(lead, "/my-tasks")).toBe(true);
    expect(getDefaultLandingRoute(lead)).toBe("/vehicles?workspace=vehicle-operations-lead");
  });

  it("rejects return targets outside every role's permitted experience", () => {
    const mechanic = user(["Mechanic"]);
    expect(resolvePostLoginRoute(mechanic, "/vehicles/control-tower")).toBe("/my-tasks");
    expect(resolvePostLoginRoute(mechanic, "/vehicles/shop-recon")).toBe("/my-tasks");
    expect(resolvePostLoginRoute(mechanic, "/vehicles/repair-jobs/job-1/workbench")).toBe(
      "/vehicles/repair-jobs/job-1/workbench"
    );
    expect(resolvePostLoginRoute(mechanic, "//outside.example")).toBe("/my-tasks");

    const salesperson = user(["Salesperson"]);
    expect(resolvePostLoginRoute(salesperson, "/administration")).toBe("/tasks?department=SALES");
    expect(resolvePostLoginRoute(salesperson, "/appointments")).toBe("/appointments");
    expect(resolvePostLoginRoute(salesperson, "/crm")).toBe("/crm");

    const manager = user(["General Manager"]);
    expect(isRoutePermittedForUser(manager, "/crm")).toBe(true);
    expect(getDefaultLandingRoute(manager)).toBe("/manager-workspace");

    const parts = user(["Parts"]);
    expect(isRoutePermittedForUser(parts, "/vehicles/parts-counter")).toBe(true);
    expect(isRoutePermittedForUser(parts, "/customers")).toBe(false);
    expect(isRoutePermittedForUser(parts, "/crm")).toBe(false);
    expect(resolvePostLoginRoute(parts, "/crm")).toBe("/vehicles/parts-operations");

    const coordinator = user(["Operations Coordinator"]);
    expect(isRoutePermittedForUser(coordinator, "/operations-coordinator")).toBe(true);
    expect(isRoutePermittedForUser(coordinator, "/customers")).toBe(true);
    expect(isRoutePermittedForUser(coordinator, "/administration")).toBe(false);
    expect(isRoutePermittedForUser(coordinator, "/crm")).toBe(false);

    const inventoryOnly = user(["Inventory Manager"]);
    expect(isRoutePermittedForUser(inventoryOnly, "/vehicles/shop-recon")).toBe(true);
    expect(isRoutePermittedForUser(inventoryOnly, "/staff")).toBe(false);
  });

  it("derives workspaces from governed duties and resolves contextual paths", () => {
    const partsByDuty = user(["Staff"], ["Parts operations"]);
    expect(getWorkspaceKey(partsByDuty)).toBe("PARTS");
    expect(resolveWorkspaceForPath(partsByDuty, "/vehicles/parts-counter")).toBe("PARTS");

    const advisorSales = user(["Service Advisor", "Salesperson"]);
    expect(resolveWorkspaceForPath(advisorSales, "/appointments")).toBe("ADVISOR");
    expect(resolveWorkspaceForPath(advisorSales, "/tasks", "SALES")).toBe("SALES");
  });

  it("treats CCC Home as management-only and Dispatch Board as a non-technician workspace exit", () => {
    const parts = user(["Parts"]);
    const mechanic = user(["Mechanic"]);

    expect(getDefaultLandingRoute(parts)).toBe("/vehicles/parts-operations");
    expect(resolveWorkspaceForPath(parts, "/command-center")).toBe("MANAGEMENT");
    expect(resolveWorkspaceForPath(parts, "/board")).toBe("PARTS");
    expect(isRoutePermittedForUser(parts, "/board")).toBe(true);
    expect(isRoutePermittedForUser(mechanic, "/board")).toBe(false);
    expect(resolveWorkspaceForPath(parts, "/vehicles/parts-operations")).toBe("PARTS");
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
