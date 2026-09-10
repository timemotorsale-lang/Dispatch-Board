import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  assertEnterpriseAdminControlAccess,
  evaluateEnterpriseAdminControlAccess,
  listEnterpriseAdminControls,
} from "@/server/enterprise-admin/controls";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const staff: AuthenticatedUser = { ...manager, id: "staff-1", roles: ["Salesperson"] };

describe("enterprise admin controls", () => {
  it("lists admin-only control areas with audit expectations", () => {
    const controls = listEnterpriseAdminControls();

    expect(controls.map((control) => control.area)).toEqual([
      "roles",
      "permissions",
      "workflow_templates",
      "required_fields",
      "activity_categories",
      "report_settings",
      "duplicate_merge_rules",
      "notification_settings",
      "audit_review",
      "data_correction_process",
    ]);
    expect(controls.every((control) => control.staffVisibility === "ADMIN_ONLY" && control.auditEventType.startsWith("ADMIN_"))).toBe(true);
  });

  it("enforces manager access before admin controls can be changed", () => {
    expect(evaluateEnterpriseAdminControlAccess(manager, "roles")).toMatchObject({ allowed: true });
    expect(evaluateEnterpriseAdminControlAccess(staff, "roles")).toMatchObject({
      allowed: false,
      reason: "Enterprise admin controls are separated from staff execution and require manager access.",
    });
    expect(() => assertEnterpriseAdminControlAccess(staff, "permissions")).toThrow("manager access");
  });
});
