import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { requireOwnDealUser } from "@/server/deal-continuity/own-deal-access";
import { canApproveAppointment, canCreateAppointment, canMutateAppointment } from "@/server/policies/access";

const staff: AuthenticatedUser = {
  id: "staff", name: "Staff", email: "staff@example.test", isActive: true,
  roles: ["Mechanic"], duties: { direct: [], roleDefaults: [], all: [] }
};
const locationAccess = {
  canViewSchedule: false, canParticipate: false, canOwnAppointments: false,
  canManageAppointments: false, canViewLimitedData: false
};

describe("staff workflow access", () => {
  it("allows active staff to manage their own appointments only at an assigned location", () => {
    const input = { actor: staff, ownerUserId: staff.id, locationAccess };
    expect(canCreateAppointment(input)).toBe(true);
    expect(canMutateAppointment(input)).toBe(true);
    expect(canMutateAppointment({ ...input, ownerUserId: "other" })).toBe(false);
    expect(canCreateAppointment({ ...input, locationAccess: null })).toBe(false);
    expect(canApproveAppointment(input)).toBe(false);
    expect(canMutateAppointment({ ...input, actor: { ...staff, calendarRestricted: true } })).toBe(false);
  });

  it("allows own Deals without opening the rest of CRM or bypassing a manager restriction", () => {
    expect(resolveCrmNextAccess(staff, { flag: "REVIEW" }).allowed).toBe(false);
    expect(resolveCrmNextAccess(staff, { flag: "REVIEW", ownDeals: true }).allowed).toBe(true);
    expect(requireOwnDealUser(staff)).toBe(staff);
    expect(() => requireOwnDealUser({ ...staff, dealsRestricted: true })).toThrow("restricted");
    expect(() => requireOwnDealUser({ ...staff, isActive: false })).toThrow("Sign in");
  });
});
