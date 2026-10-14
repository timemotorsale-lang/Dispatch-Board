import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/repositories/task-create-repository", () => ({
  createTaskCreateRepository: vi.fn(() => ({ mocked: true }))
}));
vi.mock("@/server/services/task-create-service", () => ({
  createManualTask: vi.fn()
}));

import { createManualTask } from "@/server/services/task-create-service";
import { createUnifiedCrmOpportunityTaskBridgeRepository } from "@/server/repositories/unified-crm-opportunity-task-bridge-repository";

const actor = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const command = {
  actorUserId: "manager-1",
  brief: "Document the opportunity follow-up and next operational step.",
  commandType: "CRM_OPPORTUNITY_TASK_BRIDGE_CREATE",
  correlationId: "corr-1",
  domain: "UNIFIED_CRM",
  dueAt: new Date("2026-08-15T15:00:00.000Z"),
  expectedVersion: 1,
  idempotencyKey: "crm-opportunity-task-1",
  opportunityId: "opp_123456",
  organizationId: "org-a",
  reason: "Create governed CRM opportunity follow-up task.",
  requestHash: "request-hash-1",
  title: "Follow up with Accord shopper"
};

function database(tx: Record<string, unknown>) {
  return {
    $transaction: vi.fn(async (work: (value: typeof tx) => unknown) => work(tx))
  } as never;
}

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([{
      customerDisplayName: "Alex Morgan",
      customerNumber: "CUS-1001",
      id: "db-opp-1",
      opportunityNumber: "opp_123456",
      organizationId: "org-a",
      ownerUserId: "manager-1",
      title: "2019 Honda Accord opportunity",
      version: 1
    }]),
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: "agg-1", version: 1 }), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn().mockResolvedValue({ id: "ledger-1" }), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    enterpriseOutboxMessage: { create: vi.fn() },
    ...overrides
  };
}

describe("Unified CRM opportunity task bridge repository", () => {
  it("authorizes the exact opportunity subject before replay lookup", async () => {
    const tx = transaction({
      $queryRaw: vi.fn().mockResolvedValue([])
    });
    const repository = createUnifiedCrmOpportunityTaskBridgeRepository(database(tx));

    await expect(repository.commitTaskBridge({
      actor,
      command,
      recordScope: { kind: "OWNER", ownerUserId: "manager-1" }
    })).rejects.toThrow("Opportunity not available.");

    expect(tx.enterpriseCommandLedger.findUnique).not.toHaveBeenCalled();
  });

  it("reuses an authorized matching receipt even after the opportunity version advanced", async () => {
    const tx = transaction({
      $queryRaw: vi.fn().mockResolvedValue([{
        customerDisplayName: "Alex Morgan",
        customerNumber: "CUS-1001",
        id: "db-opp-1",
        opportunityNumber: "opp_123456",
        organizationId: "org-a",
        ownerUserId: "manager-1",
        title: "2019 Honda Accord opportunity",
        version: 2
      }]),
      enterpriseCommandLedger: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          subjectType: "OPPORTUNITY",
          subjectId: "opp_123456",
          requestHash: "request-hash-1",
          resultSnapshot: {
            opportunityId: "opp_123456",
            task: {
              dueAt: "2026-08-15T15:00:00.000Z",
              id: "task-1",
              title: "Follow up with Accord shopper"
            }
          }
        })
      }
    });
    const repository = createUnifiedCrmOpportunityTaskBridgeRepository(database(tx));

    const result = await repository.commitTaskBridge({
      actor,
      command,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result).toMatchObject({
      duplicate: true,
      opportunityId: "opp_123456",
      task: {
        dueAt: new Date("2026-08-15T15:00:00.000Z"),
        id: "task-1",
        title: "Follow up with Accord shopper"
      }
    });
    expect(createManualTask).not.toHaveBeenCalled();
  });
});
