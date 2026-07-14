import { describe, expect, it, vi } from "vitest";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { processEnterpriseOutboxBatch } from "@/server/enterprise-command/outbox-worker";

function repo(): EnterpriseCommandRepository {
  return { commit: vi.fn(), listCapabilityGrants: vi.fn(), listFeatureFlags: vi.fn(), updateFeatureFlag: vi.fn(), readHealth: vi.fn(), claimReadyOutbox: vi.fn().mockResolvedValue([{ id: "one", attemptCount: 0, maxAttempts: 5, payload: { ok: true }, topic: "vehicle" }, { id: "two", attemptCount: 1, maxAttempts: 5, payload: { fail: true }, topic: "vehicle" }]), markOutboxPublished: vi.fn(), markOutboxFailed: vi.fn() } as EnterpriseCommandRepository;
}
describe("enterprise outbox worker", () => {
  it("publishes successes and reschedules failures", async () => {
    const repository = repo();
    const result = await processEnterpriseOutboxBatch({ now: new Date("2026-07-14T00:00:00Z"), repository, publisher: { async publish({ payload }) { if ((payload as { fail?: boolean }).fail) throw new Error("provider down"); } } });
    expect(result).toEqual({ attempted: 2, failed: 1, published: 1 });
    expect(repository.markOutboxPublished).toHaveBeenCalledWith("one", expect.any(Date));
    expect(repository.markOutboxFailed).toHaveBeenCalledWith("two", "provider down", expect.any(Date));
  });
});
