import { describe, expect, it } from "vitest";

import {
  requiredSalesConsoleDogfoodRoles,
  salesConsoleM11ActiveDogfoodRolesAreLimited,
  salesConsoleM11PlannedRolesDoNotCreateAdminAccess,
  salesConsoleM11RoleModelIncludesRequiredStaffRoles,
  salesConsoleM11RoleModelRemainsReadOnly,
  salesConsoleM11StaffRoleModel
} from "@/features/sales/sales-console-m11-staff-role-model";

describe("Sales Console M11 staff role model", () => {
  it("includes every required dogfood staff role", () => {
    expect(salesConsoleM11RoleModelIncludesRequiredStaffRoles()).toBe(true);
    expect(salesConsoleM11StaffRoleModel.map((role) => role.role)).toEqual([...requiredSalesConsoleDogfoodRoles]);
  });

  it("keeps every staff role read-only", () => {
    expect(salesConsoleM11RoleModelRemainsReadOnly()).toBe(true);
    expect(salesConsoleM11StaffRoleModel.every((role) => role.readOnlyBoundary.length > 40)).toBe(true);
  });

  it("limits active dogfood roles to core sales/admin roles", () => {
    expect(salesConsoleM11ActiveDogfoodRolesAreLimited()).toBe(true);
  });

  it("does not grant admin review to planned limited roles", () => {
    expect(salesConsoleM11PlannedRolesDoNotCreateAdminAccess()).toBe(true);
  });
});
