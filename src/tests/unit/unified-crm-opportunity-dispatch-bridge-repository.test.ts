import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmOpportunityDispatchBridgeRepository } from "@/server/repositories/unified-crm-opportunity-dispatch-bridge-repository";

const command = {
  actorUserId: "manager-1",
  commandType: "CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINK",
  correlationId: "corr-1",
  domain: "UNIFIED_CRM",
  expectedTargetVersion: 2,
  expectedVersion: 1,
  idempotencyKey: "crm-opportunity-dispatch-1",
  opportunityId: "opp_123456",
  organizationId: "org-a",
  reason: "Link governed CRM opportunity to Dispatch work.",
  requestHash: "request-hash-1",
  targetId: "ro-1",
  targetKind: "REPAIR_ORDER" as const
};

function database(tx: Record<string, unknown>) {
  return {
    $transaction: vi.fn(async (work: (value: typeof tx) => unknown) => work(tx))
  } as never;
}

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn()
      .mockResolvedValueOnce([{
        id: "db-opp-1",
        opportunityNumber: "opp_123456",
        organizationId: "org-a",
        ownerUserId: "manager-1",
        title: "2019 Honda Accord opportunity",
        version: 1
      }])
      .mockResolvedValueOnce([{
        repairOrderId: "ro-1",
        repairOrderNumber: "RO-1001",
        title: "Repair order RO-1001",
        version: 2
      }]),
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: "agg-1", version: 1 }), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn().mockResolvedValue({ id: "ledger-1" }), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    enterpriseOutboxMessage: { create: vi.fn() },
    ...overrides
  };
}

describe("Unified CRM opportunity dispatch bridge repository", () => {
  it("authorizes the exact opportunity subject before replay lookup", async () => {
    const tx = transaction({
      $queryRaw: vi.fn().mockResolvedValue([])
    });
    const repository = createUnifiedCrmOpportunityDispatchBridgeRepository(database(tx));

    await expect(repository.commitDispatchBridge({
      command,
      recordScope: { kind: "OWNER", ownerUserId: "manager-1" }
    })).rejects.toThrow("Opportunity not available.");

    expect(tx.enterpriseCommandLedger.findUnique).not.toHaveBeenCalled();
  });

  it("reuses an authorized matching receipt even after versions advanced", async () => {
    const tx = transaction({
      $queryRaw: vi.fn().mockResolvedValue([{
        id: "db-opp-1",
        opportunityNumber: "opp_123456",
        organizationId: "org-a",
        ownerUserId: "manager-1",
        title: "2019 Honda Accord opportunity",
        version: 3
      }]),
      enterpriseCommandLedger: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          subjectType: "OPPORTUNITY",
          subjectId: "opp_123456",
          requestHash: "request-hash-1",
          resultSnapshot: {
            opportunityId: "opp_123456",
            target: {
              repairJobId: null,
              repairJobNumber: null,
              repairOrderId: "ro-1",
              repairOrderNumber: "RO-1001",
              targetKind: "REPAIR_ORDER",
              title: "Repair order RO-1001",
              version: 2
            }
          }
        })
      }
    });
    const repository = createUnifiedCrmOpportunityDispatchBridgeRepository(database(tx));

    const result = await repository.commitDispatchBridge({
      command,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result).toMatchObject({
      duplicate: true,
      opportunityId: "opp_123456",
      target: {
        href: "/vehicles/repair-workbench?repairOrderId=ro-1",
        repairOrderNumber: "RO-1001",
        targetKind: "REPAIR_ORDER",
        version: 2
      }
    });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("writes a governed repair-order dispatch link after target version validation", async () => {
    const tx = transaction();
    const repository = createUnifiedCrmOpportunityDispatchBridgeRepository(database(tx));

    const result = await repository.commitDispatchBridge({
      command,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result).toMatchObject({
      duplicate: false,
      opportunityId: "opp_123456",
      target: {
        href: "/vehicles/repair-workbench?repairOrderId=ro-1",
        repairOrderId: "ro-1",
        repairOrderNumber: "RO-1001",
        targetKind: "REPAIR_ORDER",
        version: 2
      }
    });
    expect(tx.enterpriseCommandLedger.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        commandType: "CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINK",
        expectedVersion: 1,
        resultingVersion: 2,
        status: "SUCCEEDED"
      })
    }));
    expect(tx.enterpriseDomainEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: "CRM_OPPORTUNITY_DISPATCH_BRIDGE_LINKED"
      })
    }));
    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it("rejects stale dispatch targets without writing the CRM link", async () => {
    const tx = transaction({
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{
          id: "db-opp-1",
          opportunityNumber: "opp_123456",
          organizationId: "org-a",
          ownerUserId: "manager-1",
          title: "2019 Honda Accord opportunity",
          version: 1
        }])
        .mockResolvedValueOnce([{
          repairOrderId: "ro-1",
          repairOrderNumber: "RO-1001",
          title: "Repair order RO-1001",
          version: 3
        }])
    });
    const repository = createUnifiedCrmOpportunityDispatchBridgeRepository(database(tx));

    await expect(repository.commitDispatchBridge({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Dispatch target version conflict.");

    expect(tx.enterpriseCommandLedger.create).not.toHaveBeenCalled();
  });
});
