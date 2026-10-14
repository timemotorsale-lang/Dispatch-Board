import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmCustomerNoteRepository } from "@/server/repositories/unified-crm-customer-note-repository";

const command = {
  actorUserId: "manager-a",
  body: "Customer prefers a late-afternoon call.",
  commandType: "LOG_CUSTOMER_NOTE",
  correlationId: "correlation-1",
  customerId: "customer-a",
  domain: "UNIFIED_CRM",
  idempotencyKey: "note-1",
  organizationId: "org-a",
  reason: "Record customer note",
  requestHash: "request-hash-1",
  visibility: "INTERNAL"
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
        organizationId: "org-a"
      })
    },
    customerNote: { create: vi.fn() },
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn() },
    enterpriseOutboxMessage: { create: vi.fn() },
    ...overrides
  };
}

describe("Unified CRM customer note repository", () => {
  it("authorizes the exact organization and owner before consulting idempotency state", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue(null);
    const repository = createUnifiedCrmCustomerNoteRepository(database(tx));

    await expect(repository.createNote({
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
    expect(tx.customerNote.create).not.toHaveBeenCalled();
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
        noteId: "note-existing",
        visibility: "RESTRICTED"
      }
    });
    const repository = createUnifiedCrmCustomerNoteRepository(database(tx));

    const result = await repository.createNote({
      command,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result).toMatchObject({
      customerId: "customer-a",
      duplicate: true,
      noteId: "note-existing",
      version: 7,
      visibility: "RESTRICTED"
    });
    expect(tx.customerNote.create).not.toHaveBeenCalled();
    expect(tx.enterpriseCommandLedger.create).not.toHaveBeenCalled();
    expect(tx.enterpriseDomainEvent.create).not.toHaveBeenCalled();
    expect(tx.enterpriseAuditEvent.create).not.toHaveBeenCalled();
    expect(tx.enterpriseOutboxMessage.create).not.toHaveBeenCalled();
  });

  it("does not replay a matching key that is bound to another customer", async () => {
    const tx = transaction();
    tx.enterpriseCommandLedger.findUnique.mockResolvedValue({
      subjectType: "CUSTOMER",
      subjectId: "customer-b",
      requestHash: "request-hash-1",
      resultingVersion: 9,
      resultSnapshot: {
        customerId: "customer-b",
        noteId: "private-note",
        visibility: "INTERNAL"
      }
    });
    const repository = createUnifiedCrmCustomerNoteRepository(database(tx));

    await expect(repository.createNote({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Customer note idempotency scope is unavailable.");
    expect(tx.customerNote.create).not.toHaveBeenCalled();
  });
});
