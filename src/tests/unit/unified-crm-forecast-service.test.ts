import { describe, expect, it, vi } from "vitest";

import {
  getUnifiedCrmForecast,
  submitUnifiedCrmForecastJudgment
} from "@/server/services/unified-crm-forecast-service";

const now = new Date("2026-08-26T12:00:00.000Z");
const manager = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller = {
  ...manager,
  id: "seller-1",
  name: "Seller One",
  roles: ["Salesperson"]
};
const opportunity = {
  estimatedValueCents: 100_000,
  id: "opp-1",
  opportunityNumber: "OPP-1",
  organizationId: "org-1",
  ownerName: "Seller One",
  ownerUserId: "seller-1",
  stage: "QUOTE_PRESENTED",
  title: "Accord deal",
  updatedAt: new Date("2026-08-26T11:00:00.000Z"),
  version: 3
};

function repository(overrides = {}) {
  return {
    appendSnapshot: vi.fn(async () => ({
      duplicate: false,
      snapshot: {
        amountCents: 92_000,
        category: "COMMIT",
        createdAt: now.toISOString(),
        createdByName: "Manager One",
        createdByUserId: "manager-1",
        id: "forecast-1",
        inputSummary: "Human judgment recorded against baseline.",
        opportunityId: "opp-1",
        probabilityBasisPts: 9200,
        reason: "Customer approved trade terms.",
        source: "MANAGER_JUDGMENT"
      }
    })),
    findOpportunity: vi.fn(async () => opportunity),
    listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
    listSnapshots: vi.fn(async () => []),
    ...overrides
  };
}

describe("Unified CRM forecast service", () => {
  it("keeps deterministic baseline separate from human judgment history", async () => {
    const model = await getUnifiedCrmForecast(seller, "opp-1", {
      now: () => now,
      repository: repository({
        listSnapshots: vi.fn(async () => [{
          amountCents: 90_000,
          category: "COMMIT",
          createdAt: "2026-08-26T11:30:00.000Z",
          createdByName: "Seller One",
          createdByUserId: "seller-1",
          id: "seller-forecast-1",
          inputSummary: "Customer said yes if delivery holds.",
          opportunityId: "opp-1",
          probabilityBasisPts: 9000,
          reason: "Customer verbally committed.",
          source: "SELLER_JUDGMENT"
        }])
      })
    });

    expect(model).toMatchObject({
      baseline: {
        amountCents: 65_000,
        category: "BEST_CASE",
        probabilityBasisPts: 6500,
        source: "BASELINE"
      },
      latestSellerJudgment: { source: "SELLER_JUDGMENT", amountCents: 90_000 },
      visibility: "owned"
    });
    expect(model.history.map((item) => item.source)).toEqual(["BASELINE", "SELLER_JUDGMENT"]);
  });

  it("requires a reason and appends human judgment through the repository", async () => {
    const deps = repository();
    const result = await submitUnifiedCrmForecastJudgment(manager, "opp-1", {
      amountCents: 92_000,
      category: "COMMIT",
      expectedVersion: 3,
      idempotencyKey: "forecast-key-1",
      probabilityBasisPts: 9200,
      reason: "Customer approved trade terms.",
      source: "MANAGER_JUDGMENT"
    }, { now: () => now, repository: deps });

    expect(deps.appendSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "manager-1",
      command: expect.objectContaining({ source: "MANAGER_JUDGMENT", reason: "Customer approved trade terms." }),
      opportunity: expect.objectContaining({ version: 3 })
    }));
    expect(result).toMatchObject({ duplicate: false, snapshot: { source: "MANAGER_JUDGMENT" } });

    await expect(submitUnifiedCrmForecastJudgment(manager, "opp-1", {
      amountCents: 92_000,
      category: "COMMIT",
      expectedVersion: 3,
      idempotencyKey: "forecast-key-2",
      probabilityBasisPts: 9200,
      reason: "short",
      source: "MANAGER_JUDGMENT"
    }, { now: () => now, repository: deps })).rejects.toMatchObject({ code: "INVALID_FORECAST_SUBMISSION" });
  });

  it("blocks manager judgment from salesperson workspace", async () => {
    await expect(submitUnifiedCrmForecastJudgment(seller, "opp-1", {
      amountCents: 92_000,
      category: "COMMIT",
      expectedVersion: 3,
      idempotencyKey: "forecast-key-3",
      probabilityBasisPts: 9200,
      reason: "Manager judgment should not be seller-owned.",
      source: "MANAGER_JUDGMENT"
    }, { now: () => now, repository: repository() })).rejects.toMatchObject({
      code: "FORECAST_NOT_AUTHORIZED"
    });
  });
});
