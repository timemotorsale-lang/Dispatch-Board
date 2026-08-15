import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/repositories/task-create-repository", () => ({
  createTaskCreateRepository: vi.fn(() => ({ mocked: true }))
}));
vi.mock("@/server/services/task-create-service", () => ({
  createManualTask: vi.fn()
}));

import { createManualTask } from "@/server/services/task-create-service";
import { createUnifiedCrmCustomerTaskBridgeRepository } from "@/server/repositories/unified-crm-customer-task-bridge-repository";

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
  brief: "Document the customer follow-up and the next operational step.",
  commandType: "CRM_CUSTOMER_TASK_BRIDGE_CREATE",
  correlationId: "corr-1",
  customerId: "customer-1",
  domain: "UNIFIED_CRM",
  dueAt: new Date("2026-08-15T15:00:00.000Z"),
  idempotencyKey: "crm-task-1",
  organizationId: "org-a",
  reason: "Create governed CRM follow-up task.",
  requestHash: "request-hash-1",
  title: "Follow up with Alex Morgan"
};

function database(tx: Record<string, unknown>) {
  return {
    $transaction: vi.fn(async (work: (value: typeof tx) => unknown) => work(tx))
  } as never;
}

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    customer: {
      findFirst: vi.fn().mockResolvedValue({
        customerNumber: "CUS-1001",
        displayName: "Alex Morgan",
        id: "customer-1",
        organizationId: "org-a"
      })
    },
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    enterpriseOutboxMessage: { create: vi.fn() },
    ...overrides
  };
}

describe("Unified CRM customer task bridge repository", () => {
  it("authorizes the exact customer subject before replay lookup", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue(null);
    const repository = createUnifiedCrmCustomerTaskBridgeRepository(database(tx));

    await expect(repository.commitTaskBridge({
      actor,
      command,
      recordScope: { kind: "OWNER", ownerUserId: "manager-1" }
    })).rejects.toThrow("Customer not available.");

    expect(tx.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "customer-1",
        organizationId: "org-a",
        ownerUserId: "manager-1",
        archivedAt: null,
        mergedIntoCustomerId: null
      })
    }));
    expect(tx.enterpriseCommandLedger.findUnique).not.toHaveBeenCalled();
  });

  it("reuses an authorized matching receipt without creating another task", async () => {
    const tx = transaction({
      enterpriseCommandLedger: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          subjectType: "CUSTOMER",
          subjectId: "customer-1",
          requestHash: "request-hash-1",
          resultSnapshot: {
            customerId: "customer-1",
            task: {
              dueAt: "2026-08-15T15:00:00.000Z",
              id: "task-1",
              title: "Follow up with Alex Morgan"
            }
          }
        })
      }
    });
    const repository = createUnifiedCrmCustomerTaskBridgeRepository(database(tx));

    const result = await repository.commitTaskBridge({
      actor,
      command,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result).toMatchObject({
      customerId: "customer-1",
      duplicate: true,
      task: {
        dueAt: new Date("2026-08-15T15:00:00.000Z"),
        id: "task-1",
        title: "Follow up with Alex Morgan"
      }
    });
    expect(createManualTask).not.toHaveBeenCalled();
  });

  it("fails closed with a generic conflict when a replay key is bound to another customer subject", async () => {
    const tx = transaction({
      enterpriseCommandLedger: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          subjectType: "CUSTOMER",
          subjectId: "customer-2",
          requestHash: "request-hash-1",
          resultSnapshot: {
            customerId: "customer-2",
            task: {
              dueAt: "2026-08-15T15:00:00.000Z",
              id: "task-2",
              title: "Wrong customer task"
            }
          }
        })
      }
    });
    const repository = createUnifiedCrmCustomerTaskBridgeRepository(database(tx));

    await expect(repository.commitTaskBridge({
      actor,
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Idempotency key was already used with a different CRM task handoff.");
    expect(createManualTask).not.toHaveBeenCalled();
  });

  it("rejects malformed stored replay snapshots as a generic conflict even when the key and hash match", async () => {
    const tx = transaction({
      enterpriseCommandLedger: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          subjectType: "CUSTOMER",
          subjectId: "customer-1",
          requestHash: "request-hash-1",
          resultSnapshot: {
            customerId: "customer-1",
            task: {
              dueAt: 123,
              id: "task-1",
              title: "Follow up with Alex Morgan"
            }
          }
        })
      }
    });
    const repository = createUnifiedCrmCustomerTaskBridgeRepository(database(tx));

    await expect(repository.commitTaskBridge({
      actor,
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Idempotency key was already used with a different CRM task handoff.");
    expect(createManualTask).not.toHaveBeenCalled();
  });
});
