import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmCustomerNextActionRepository } from "@/server/repositories/unified-crm-customer-next-action-repository";

const command = {
  actorUserId: "seller-a",
  commandType: "SET_CUSTOMER_NEXT_ACTION",
  correlationId: "correlation-1",
  customerId: "customer-a",
  domain: "UNIFIED_CRM",
  dueAt: new Date("2026-08-18T15:00:00.000Z"),
  expectedCurrentNextActionAt: new Date("2026-08-15T15:00:00.000Z"),
  idempotencyKey: "next-action-1",
  note: "Customer asked for a Tuesday check-in.",
  operation: "SET" as const,
  organizationId: "org-a",
  reason: "Set CRM customer next action.",
  requestHash: "request-hash-1"
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
        id: "customer-a",
        organizationId: "org-a",
        ownerUserId: "seller-a",
        nextActionAt: new Date("2026-08-15T15:00:00.000Z")
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn() },
    enterpriseOutboxMessage: { create: vi.fn() },
    ...overrides
  };
}

describe("Unified CRM customer next action repository", () => {
  it("authorizes the exact organization and owner before consulting idempotency state", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue(null);
    const repository = createUnifiedCrmCustomerNextActionRepository(database(tx));

    await expect(repository.commitNextAction({
      command,
      recordScope: { kind: "OWNER", ownerUserId: "seller-a" }
    })).rejects.toThrow("Customer not available.");

    expect(tx.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "customer-a",
        organizationId: "org-a",
        ownerUserId: "seller-a",
        archivedAt: null,
        mergedIntoCustomerId: null
      })
    }));
    expect(tx.enterpriseCommandLedger.findUnique).not.toHaveBeenCalled();
    expect(tx.customer.updateMany).not.toHaveBeenCalled();
  });

  it("reuses an authorized matching receipt without issuing a consequential write", async () => {
    const tx = transaction();
    tx.enterpriseCommandLedger.findUnique.mockResolvedValue({
      subjectType: "CUSTOMER",
      subjectId: "customer-a",
      requestHash: "request-hash-1",
      resultingVersion: 7,
      resultSnapshot: {
        customerId: "customer-a",
        nextActionAt: "2026-08-18T15:00:00.000Z",
        operation: "SET"
      }
    });
    const repository = createUnifiedCrmCustomerNextActionRepository(database(tx));

    const result = await repository.commitNextAction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result).toMatchObject({
      customerId: "customer-a",
      duplicate: true,
      nextActionAt: new Date("2026-08-18T15:00:00.000Z"),
      operation: "SET",
      version: 7
    });
    expect(tx.customer.updateMany).not.toHaveBeenCalled();
    expect(tx.enterpriseCommandLedger.create).not.toHaveBeenCalled();
    expect(tx.enterpriseDomainEvent.create).not.toHaveBeenCalled();
    expect(tx.enterpriseAuditEvent.create).not.toHaveBeenCalled();
    expect(tx.enterpriseOutboxMessage.create).not.toHaveBeenCalled();
  });

  it("treats a matching key on another customer as a generic idempotency conflict", async () => {
    const tx = transaction();
    tx.enterpriseCommandLedger.findUnique.mockResolvedValue({
      subjectType: "CUSTOMER",
      subjectId: "customer-b",
      requestHash: "request-hash-1",
      resultingVersion: 9,
      resultSnapshot: {
        customerId: "customer-b",
        nextActionAt: "2026-08-18T15:00:00.000Z",
        operation: "SET"
      }
    });
    const repository = createUnifiedCrmCustomerNextActionRepository(database(tx));

    await expect(repository.commitNextAction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    expect(tx.customer.updateMany).not.toHaveBeenCalled();
  });

  it("only commits when the row still matches the expected next-action state", async () => {
    const tx = transaction();
    tx.customer.updateMany.mockResolvedValue({ count: 0 });
    const repository = createUnifiedCrmCustomerNextActionRepository(database(tx));

    await expect(repository.commitNextAction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Stale next action.");
  });

  it("rejects stored replay snapshots that are missing or bound to another subject", async () => {
    const invalidSnapshot = transaction();
    invalidSnapshot.enterpriseCommandLedger.findUnique.mockResolvedValue({
      subjectType: "CUSTOMER",
      subjectId: "customer-a",
      requestHash: "request-hash-1",
      resultingVersion: 5,
      resultSnapshot: {
        customerId: "customer-a",
        nextActionAt: 123,
        operation: "SET"
      }
    });
    const invalidSnapshotRepository = createUnifiedCrmCustomerNextActionRepository(database(invalidSnapshot));

    await expect(invalidSnapshotRepository.commitNextAction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    expect(invalidSnapshot.customer.updateMany).not.toHaveBeenCalled();

    const wrongCustomerSnapshot = transaction();
    wrongCustomerSnapshot.enterpriseCommandLedger.findUnique.mockResolvedValue({
      subjectType: "CUSTOMER",
      subjectId: "customer-a",
      requestHash: "request-hash-1",
      resultingVersion: 6,
      resultSnapshot: {
        customerId: "customer-b",
        nextActionAt: "2026-08-18T15:00:00.000Z",
        operation: "SET"
      }
    });
    const wrongCustomerRepository = createUnifiedCrmCustomerNextActionRepository(database(wrongCustomerSnapshot));

    await expect(wrongCustomerRepository.commitNextAction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    expect(wrongCustomerSnapshot.customer.updateMany).not.toHaveBeenCalled();
  });
});
