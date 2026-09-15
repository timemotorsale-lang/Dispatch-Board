import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  canAddVendorNote,
  canCreateVendor,
  canCreateVendorTask,
  canUpdateVendor,
  canViewVendorRegistry
} from "@/server/vendors/vendor-policy";

const staff: AuthenticatedUser = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "staff@example.com",
  id: "user-staff",
  isActive: true,
  name: "Staff Member",
  roles: ["Service Advisor"]
};

const manager: AuthenticatedUser = {
  ...staff,
  id: "user-manager",
  name: "Manager",
  roles: ["General Manager"]
};

describe("vendor registry policy", () => {
  it("lets authenticated staff view, comment, and create their own follow-up tasks", () => {
    expect(canViewVendorRegistry(staff)).toBe(true);
    expect(canAddVendorNote(staff)).toBe(true);
    expect(canCreateVendorTask(staff)).toBe(true);
  });

  it("keeps vendor master-data creation and edits manager controlled", () => {
    expect(canCreateVendor(staff)).toBe(false);
    expect(canUpdateVendor(staff)).toBe(false);
    expect(canCreateVendor(manager)).toBe(true);
    expect(canUpdateVendor(manager)).toBe(true);
  });

  it("blocks anonymous vendor registry access", () => {
    expect(canViewVendorRegistry(null)).toBe(false);
    expect(canCreateVendorTask(null)).toBe(false);
  });
});
