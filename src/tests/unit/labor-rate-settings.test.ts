import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), findMany: vi.fn(), execute: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { vehiclePolicyVersion: { findFirst: mocks.findFirst, findMany: mocks.findMany } } }));
vi.mock("@/server/customer-lifecycle/service", () => ({ executeCustomerLifecycleCommand: mocks.execute }));
import { changeLaborRateSettings, getActiveLaborRate, getLaborRateSettings, normalizeLaborRateConfiguration } from "@/server/services/labor-rate-settings";
const manager = { id: "manager", roles: ["General Manager"], duties: { all: [] } } as unknown as AuthenticatedUser;
const advisor = { id: "advisor", roles: ["Service Advisor"], duties: { all: [] } } as unknown as AuthenticatedUser;
describe("Administrator labor-rate settings", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.findFirst.mockResolvedValue(null); mocks.findMany.mockResolvedValue([]); mocks.execute.mockResolvedValue({ result: { id: "rate-1" } }); });
  it("defaults to $125 and only reads effective active policy records", async () => {
    expect(await getActiveLaborRate(advisor)).toMatchObject({ laborRate: 125 });
    expect(mocks.findFirst.mock.calls[0][0].where).toMatchObject({ policyCode: "SHOP_LABOR_RATE", domain: "ESTIMATE_PRICING", status: "ACTIVE" });
    mocks.findFirst.mockResolvedValue({ id: "policy-2", version: 2, configuration: { version: 1, laborRateCents: 13500 } });
    expect(await getActiveLaborRate(advisor)).toEqual({ laborRate: 135, policyId: "policy-2", policyVersion: 2 });
  });
  it("blocks unauthenticated reads and non-manager setting writes before database access", async () => {
    await expect(getActiveLaborRate(null)).rejects.toThrow("Authentication required");
    await expect(getLaborRateSettings(advisor)).rejects.toThrow("Manager access required");
    await expect(changeLaborRateSettings(advisor, {})).rejects.toThrow("Manager access required");
    expect(mocks.findFirst).not.toHaveBeenCalled(); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("creates only the pinned policy through existing capability, rollout and audit boundaries", async () => {
    await changeLaborRateSettings(manager, { action: "CREATE_POLICY_DRAFT", laborRateCents: 13000, policyCode: "UNRELATED", idempotencyKey: "retry", reason: "Annual rate review" });
    expect(mocks.execute).toHaveBeenCalledWith(manager, expect.objectContaining({ policyCode: "SHOP_LABOR_RATE", domain: "ESTIMATE_PRICING", configuration: { version: 1, laborRateCents: 13000 }, idempotencyKey: "retry" }));
  });
  it("keeps activation payloads stable across retries and does not rewrite estimates", async () => {
    mocks.findFirst.mockResolvedValue({ id: "policy-1", configuration: { version: 1, laborRateCents: 13000 }, createdAt: new Date("2026-10-15T10:00:00Z"), approvedAt: new Date("2026-10-15T11:00:00Z") });
    const body = { action: "ACTIVATE_POLICY", subjectId: "policy-1", reason: "Activate reviewed rate", idempotencyKey: "stable-retry" };
    await changeLaborRateSettings(manager, body); await changeLaborRateSettings(manager, body);
    expect(mocks.execute.mock.calls[0]).toEqual(mocks.execute.mock.calls[1]);
    expect(mocks.execute.mock.calls[0][1]).toMatchObject({ effectiveFrom: "2026-10-15T11:00:00.000Z", pilotScope: {} });
  });
  it("rejects fractional cents, unsupported commands and references outside the policy scope", async () => {
    for (const laborRateCents of [NaN, -1, 100001, 12500.5]) expect(() => normalizeLaborRateConfiguration({ version: 1, laborRateCents })).toThrow();
    await expect(changeLaborRateSettings(manager, { action: "DELETE_ALL" })).rejects.toThrow();
    await expect(changeLaborRateSettings(manager, { action: "APPROVE_POLICY", subjectId: "unrelated" })).rejects.toThrow("not found");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
