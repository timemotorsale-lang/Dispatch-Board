import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ actor: vi.fn(), access: vi.fn(), transaction: vi.fn(), count: vi.fn(), prior: vi.fn(), audit: vi.fn(), sources: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { location: { findMany: async () => [{ id: "lot" }] }, $transaction: mock.transaction, vehicleEvidenceObject: { findMany: mock.sources } } }));
vi.mock("@/server/auth/store", () => ({ createPrismaAuthStore: () => ({ findUserByEmail: mock.actor }) }));
vi.mock("@/server/inventory-transfer/purchase-team", () => ({ purchaseTeamAccess: mock.access }));
import { evaluatePurchaseOperations, purchaseAlertDue } from "@/server/inventory-transfer/purchase-operations";
beforeEach(() => {
  vi.resetAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
  vi.stubEnv("IMPORT_OPERATIONS_ACTOR_EMAIL", "owner@example.test"); vi.stubEnv("IMPORT_ALERT_WEBHOOK_URL", "https://alerts.example.test"); vi.stubEnv("IMPORT_RETENTION_CLEANUP_ENABLED", "false");
  mock.actor.mockResolvedValue({ id: "owner", isActive: true }); mock.access.mockResolvedValue({ manager: true });
  mock.count.mockResolvedValue(1); mock.prior.mockResolvedValue(null);
  mock.transaction.mockImplementation(fn => fn({ $executeRaw: vi.fn(), purchaseImportJob: { count: mock.count }, enterpriseAuditEvent: { findFirst: mock.prior, create: mock.audit } }));
});
describe("purchase operational alerts", () => {
  it("requires an active authorized existing team account", async () => {
    mock.actor.mockResolvedValue({ isActive: false }); await expect(evaluatePurchaseOperations()).rejects.toThrow("active");
    mock.actor.mockResolvedValue({ id: "owner", isActive: true }); mock.access.mockResolvedValue({ manager: false }); await expect(evaluatePurchaseOperations()).rejects.toThrow("management");
    expect(mock.transaction).not.toHaveBeenCalled();
  });
  it("delivers aggregate alerts and records success, leaving cleanup off", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", send);
    expect(await evaluatePurchaseOperations()).toMatchObject({ alerts: 1, retired: 0, cleanupEnabled: false });
    expect(JSON.parse(send.mock.calls[0][1].body)).toMatchObject({ failed: 1, stalled: 1, locationId: "lot" });
    expect(mock.audit).toHaveBeenCalled(); expect(mock.sources).not.toHaveBeenCalled();
  });
  it("does not acknowledge a failed delivery", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false })); await expect(evaluatePurchaseOperations()).rejects.toThrow("delivery"); expect(mock.audit).not.toHaveBeenCalled();
  });
  it("silences unchanged incidents for one day", async () => {
    mock.prior.mockResolvedValue({ metadata: { failed: 1, stalled: 1, deliveredAt: new Date().toISOString() } });
    vi.stubGlobal("fetch", vi.fn()); expect(await evaluatePurchaseOperations()).toMatchObject({ alerts: 0 }); expect(fetch).not.toHaveBeenCalled();
    expect(purchaseAlertDue({ failed: 1, stalled: 1, deliveredAt: "2020-01-01" }, 1, 1, new Date())).toBe(true);
  });
});
