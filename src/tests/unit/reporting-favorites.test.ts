import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { favoriteReportingView } from "@/server/reporting/library-service";
const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), source: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { reportingSavedView: { findFirstOrThrow: mocks.find }, $transaction: mocks.transaction } }));
vi.mock("@/server/reporting/live-service", () => ({ readLiveReport: mocks.source }));
vi.mock("@/server/reporting/command", () => ({ recordReportingCommand: mocks.audit }));
const actor: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Salesperson"], duties: { direct: [], roleDefaults: [], all: [] } };
const input = { id: "view", favorite: true, expectedVersion: 0 };
describe("personal reporting favorites", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.find.mockResolvedValue({ id: "view", definitionId: "operations", filters: { query: "callback", locationId: "" } }); mocks.source.mockResolvedValue({}); mocks.update.mockResolvedValue({ count: 1 }); mocks.audit.mockResolvedValue(undefined); mocks.transaction.mockImplementation((operation: (tx: unknown) => unknown) => operation({ reportingSavedView: { updateMany: mocks.update } })); });
  it("uses owner-only lookup and preserves report filters", async () => {
    expect(await favoriteReportingView(actor, input)).toMatchObject({ version: 1, duplicate: false });
    expect(mocks.find).toHaveBeenCalledWith({ where: { id: "view", userId: "staff" } });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { filters: { query: "callback", locationId: "", favorite: true, favoriteVersion: 1 } } }));
  });
  it("returns the prior successful change after response loss", async () => {
    mocks.find.mockResolvedValue({ id: "view", definitionId: "operations", filters: { favorite: true, favoriteVersion: 1 } });
    expect(await favoriteReportingView(actor, input)).toMatchObject({ version: 1, duplicate: true });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects stale and concurrent changes", async () => {
    await expect(favoriteReportingView(actor, { ...input, expectedVersion: 2 })).rejects.toThrow("changed");
    mocks.update.mockResolvedValue({ count: 0 });
    await expect(favoriteReportingView(actor, input)).rejects.toThrow("changed");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("denies revoked access without changing preferences", async () => {
    mocks.source.mockRejectedValue(new Error("Source access revoked"));
    await expect(favoriteReportingView(actor, input)).rejects.toThrow("revoked");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("propagates audit failure instead of reporting success", async () => {
    mocks.audit.mockRejectedValue(new Error("Audit unavailable"));
    await expect(favoriteReportingView(actor, input)).rejects.toThrow("Audit unavailable");
  });
});
