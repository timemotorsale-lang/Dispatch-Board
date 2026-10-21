import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { moneyAccess } from "@/server/money-resources/service";
import { assignStaffCompanyAccess, staffCompanyAccess } from "@/server/money-resources/staff-access";

const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const worker = { ...manager, id: "worker", roles: ["Mechanic"] };
const value = { userId: worker.id, locationId: "location", reason: "Restore approved employee company membership." };
const grant = { location: { organizationId: "company", name: "Company location" } };

function setup(targetGrants: typeof grant[] = []) {
  const transaction = {
    userLocationAccess: {
      findMany: vi.fn().mockImplementation(async ({ where }) => where.userId === manager.id ? [grant] : targetGrants),
      findUnique: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    user: { findMany: vi.fn().mockResolvedValue([{ id: worker.id, name: "Brock Harris" }]) },
    location: { findMany: vi.fn().mockResolvedValue([{ id: "location", name: "Company location" }]) },
    enterpriseAuditEvent: { create: vi.fn() }
  };
  const database = { ...transaction, $transaction: vi.fn(async callback => callback(transaction)) } as unknown as PrismaClient;
  return { database, transaction };
}

describe("staff company access repair", () => {
  it("distinguishes absent membership from multiple-company membership", async () => {
    const missing = setup();
    await expect(moneyAccess(worker, missing.database)).rejects.toThrow("not assigned to a company location");
    const multiple = setup([grant, { location: { ...grant.location, organizationId: "other" } }]);
    await expect(moneyAccess(worker, multiple.database)).rejects.toThrow("multiple companies");
  });

  it("shows missing staff membership without writing", async () => {
    const { database, transaction } = setup();
    expect(await staffCompanyAccess(manager, worker.id, database)).toMatchObject({ status: "MISSING", userId: worker.id });
    expect(transaction.userLocationAccess.createMany).not.toHaveBeenCalled();
  });

  it("creates audited membership with no appointment or manager permissions", async () => {
    const { database, transaction } = setup();
    await assignStaffCompanyAccess(manager, value, database);
    expect(transaction.userLocationAccess.createMany).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: worker.id, locationId: "location", canViewSchedule: false, canParticipate: false, canOwnAppointments: false, canManageAppointments: false, canViewLimitedData: false }), skipDuplicates: true });
    expect(transaction.enterpriseAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: manager.id, subjectId: worker.id, organizationId: "company", eventType: "STAFF_COMPANY_ACCESS_GRANTED", reason: value.reason }) });
  });

  it("does not alter existing membership", async () => {
    const { database, transaction } = setup([grant]);
    await assignStaffCompanyAccess(manager, value, database);
    expect(transaction.userLocationAccess.createMany).not.toHaveBeenCalled();
    expect(transaction.enterpriseAuditEvent.create).not.toHaveBeenCalled();
  });

  it("rejects staff administrators and cross-company changes", async () => {
    const { database, transaction } = setup([{ location: { organizationId: "other", name: "Other" } }]);
    await expect(assignStaffCompanyAccess(worker, value, database)).rejects.toThrow("Only the General Manager");
    await expect(assignStaffCompanyAccess(manager, value, database)).rejects.toThrow("another company assignment");
    await expect(assignStaffCompanyAccess(manager, { ...value, locationId: "elsewhere" }, database)).rejects.toThrow("authorized company");
    expect(transaction.userLocationAccess.createMany).not.toHaveBeenCalled();
  });

  it("does not overwrite expired grants or concurrent changes", async () => {
    const expired = setup();
    expired.transaction.userLocationAccess.findUnique.mockResolvedValue({} as never);
    await expect(assignStaffCompanyAccess(manager, value, expired.database)).rejects.toThrow("expired or future");
    const concurrent = setup();
    concurrent.transaction.userLocationAccess.createMany.mockResolvedValue({ count: 0 });
    await expect(assignStaffCompanyAccess(manager, value, concurrent.database)).rejects.toThrow("changed elsewhere");
    expect(concurrent.transaction.enterpriseAuditEvent.create).not.toHaveBeenCalled();
  });

  it("requires an active actor, active target and reason", async () => {
    const { database, transaction } = setup();
    await expect(staffCompanyAccess(null, worker.id, database)).rejects.toThrow("Sign in");
    await expect(assignStaffCompanyAccess(manager, { ...value, reason: "" }, database)).rejects.toThrow("reason");
    transaction.user.findMany.mockResolvedValue([]);
    await expect(assignStaffCompanyAccess(manager, value, database)).rejects.toThrow("active staff");
  });
});
