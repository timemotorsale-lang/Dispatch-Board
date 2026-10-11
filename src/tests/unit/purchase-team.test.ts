import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ grants: vi.fn(), job: vi.fn(), jobs: vi.fn(), count: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { location: { findFirst: async () => ({ id: "lot" }) }, purchaseImportJob: { findFirst: mocks.job, findMany: mocks.jobs, count: mocks.count } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
import { purchaseJobAccess, purchaseJobQueue, purchaseTeamAccess } from "@/server/inventory-transfer/purchase-team";
const staff: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Staff"], duties: { all: ["Edit acquisition intake", "Execute inventory recon"], direct: ["Edit acquisition intake", "Execute inventory recon"], roleDefaults: [] } };
beforeEach(() => { vi.resetAllMocks(); mocks.grants.mockResolvedValue([]); mocks.jobs.mockResolvedValue([]); mocks.count.mockResolvedValue(0); });
describe("purchase team authorization uses existing functions", () => {
  it("does not give intake editors team-management authority", async () => { expect((await purchaseTeamAccess(staff, "lot")).manager).toBe(false); expect((await purchaseTeamAccess({ ...staff, duties: { ...staff.duties, all: [...staff.duties.all, "Manage inventory acquisition"] } }, "lot")).manager).toBe(true); });
  it("blocks foreign jobs but permits assigned review", async () => {
    mocks.job.mockResolvedValue({ id: "job", locationId: "lot", createdByUserId: "other", assignedToUserId: "other" });
    await expect(purchaseJobAccess(staff, "job")).rejects.toThrow("not assigned");
    mocks.job.mockResolvedValue({ id: "job", locationId: "lot", createdByUserId: "other", assignedToUserId: "staff" });
    expect(await purchaseJobAccess(staff, "job")).toMatchObject({ id: "job" });
  });
  it("rechecks revoked functions, inactivity and explicit location denies", async () => {
    await expect(purchaseTeamAccess({ ...staff, duties: { all: [], direct: [], roleDefaults: [] } }, "lot")).rejects.toThrow("capability required");
    await expect(purchaseTeamAccess({ ...staff, isActive: false }, "lot")).rejects.toThrow();
    mocks.grants.mockResolvedValue([{ capability: "VEHICLE_EVIDENCE_MANAGE", effect: "DENY", locationId: "lot", validFrom: new Date(0), validTo: null }]);
    await expect(purchaseTeamAccess(staff, "lot")).rejects.toThrow("EXPLICIT_DENY");
  });
  it("filters the complete server queue, not a single displayed page", async () => {
    await purchaseJobQueue(staff, "lot", "invoice", "ATTENTION");
    expect(mocks.jobs.mock.calls[0][0]).toMatchObject({ take: 26, where: { locationId: "lot", OR: [{ createdByUserId: "staff" }, { assignedToUserId: "staff" }], status: { notIn: ["IMPORTED", "UNDONE", "BATCH", "RETRIED"] }, AND: [{ OR: [{ fileName: { contains: "invoice", mode: "insensitive" } }, { vin: { contains: "invoice", mode: "insensitive" } }] }] } });
    await expect(purchaseJobQueue(staff, "lot", "", "INVALID")).rejects.toThrow("filter");
  });
});
