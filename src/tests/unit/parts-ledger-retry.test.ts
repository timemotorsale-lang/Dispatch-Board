import { describe, expect, it, vi } from "vitest";
vi.mock("@/server/db/client", () => ({ prisma: {} }));
import { createPart, createPartStockLocation, createRepairPartDemand } from "@/server/parts-ledger/service";
import type { PartsLedgerRepository } from "@/server/parts-ledger/repository";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
const actor = { id: "manager", name: "Manager", email: "test@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
function fixture() {
  const repository = {
    commandReceipt: vi.fn().mockResolvedValue(null),
    repairOrderSite: vi.fn().mockResolvedValue({ id: "ro", locationId: "store", closedAt: null }),
    getPartsVersion: vi.fn().mockResolvedValue(0),
    createPart: vi.fn().mockResolvedValue({ result: { id: "part" } }),
    createLocation: vi.fn().mockResolvedValue({ result: { id: "bin" } }),
    createDemand: vi.fn().mockResolvedValue({ result: { id: "need" } }),
  };
  const input = { repository: repository as unknown as PartsLedgerRepository, organizationId: "org", enforceRollout: false, foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository };
  return { repository, input };
}
describe("parts catalog and bin retry identity", () => {
  it("keeps creation identity and hash stable before and after a committed response", async () => {
    const { repository, input } = fixture();
    const fields = { partNumber: "STK-123", description: "Brake pad", standardCostCents: 100, idempotencyKey: "part-key", reason: "Record a needed part." };
    await createPart(actor, fields, input);
    await createPart(actor, fields, input);
    const first = repository.createPart.mock.calls[0][0];
    expect(repository.createPart.mock.calls[1][0]).toMatchObject({ subjectId: first.subjectId, requestHash: first.requestHash });
    repository.commandReceipt.mockResolvedValue({ subjectId: first.subjectId, expectedVersion: 0, locationId: null });
    await createPart(actor, fields, input);
    expect(repository.createPart.mock.calls[2][0].requestHash).toBe(first.requestHash);
  });
  it("keeps generated bin identity stable and preserves legacy committed IDs", async () => {
    const { repository, input } = fixture();
    const fields = { code: "BIN-123", name: "Shelf A", type: "BIN", locationId: "store", idempotencyKey: "bin-key", reason: "Record actual parts storage." };
    await createPartStockLocation(actor, fields, input);
    await createPartStockLocation(actor, fields, input);
    expect(repository.createLocation.mock.calls[1][0].requestHash).toBe(repository.createLocation.mock.calls[0][0].requestHash);
    repository.commandReceipt.mockResolvedValue({ subjectId: "legacy-bin", expectedVersion: 0, locationId: "store" });
    await createPartStockLocation(actor, fields, input);
    expect(repository.createLocation.mock.calls[2][0].subjectId).toBe("legacy-bin");
  });
  it("replays demand with its original version/site even after later changes", async () => {
    const { repository, input } = fixture();
    repository.commandReceipt.mockResolvedValue({ subjectId: "ro", expectedVersion: 2, locationId: null });
    repository.getPartsVersion.mockResolvedValue(8);
    await createRepairPartDemand(actor, "ro", { partId: "part", quantityRequired: 1, requiredAt: "2026-11-01", idempotencyKey: "need-key", reason: "Record a needed part." }, input);
    expect(repository.createDemand.mock.calls[0][0]).toMatchObject({ subjectId: "ro", expectedVersion: 2, locationId: null });
    expect(repository.getPartsVersion).not.toHaveBeenCalled();
  });
  it("checks current authorization before replaying a saved location", async () => {
    const { repository, input } = fixture();
    await expect(createPartStockLocation({ ...actor, roles: ["Sales"] }, { code: "BIN-123", name: "Shelf A", type: "BIN", locationId: "store", idempotencyKey: "bin-key", reason: "Record actual parts storage." }, input)).rejects.toThrow(/capability/i);
    expect(repository.createLocation).not.toHaveBeenCalled();
  });
});
