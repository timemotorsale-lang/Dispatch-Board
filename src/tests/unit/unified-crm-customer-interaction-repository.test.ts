import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmCustomerInteractionRepository } from "@/server/repositories/unified-crm-customer-interaction-repository";

const command = {
  actorUserId: "seller-a",
  channel: "PHONE",
  commandType: "LOG_CUSTOMER_INTERACTION",
  completeCurrentFollowUp: false,
  consentState: "CONFIRMED",
  correlationId: "correlation-1",
  customerId: "customer-a",
  direction: "OUTBOUND",
  domain: "UNIFIED_CRM",
  idempotencyKey: "interaction-1",
  nextActionAt: null,
  nextStep: null,
  occurredAt: new Date("2026-08-14T15:00:00.000Z"),
  organizationId: "org-a",
  outcome: "Reached customer",
  relatedDealId: null,
  relatedRepairOrderId: null,
  relatedStaffMemberId: null,
  relatedVehicleId: null,
  reason: "Record customer interaction",
  reportWorthy: false,
  requestHash: "request-hash-1",
  summary: "Confirmed the delivery time."
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
        lastInteractionAt: null,
        nextActionAt: null,
        contactPoints: [{ type: "PHONE", consentStatus: "CONFIRMED" }]
      }),
      update: vi.fn()
    },
    customerInteraction: { create: vi.fn().mockResolvedValue({ id: "interaction-created" }) },
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn().mockResolvedValue({ id: "command-1" }), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    enterpriseOutboxMessage: { create: vi.fn() },
    ...overrides
  };
}

describe("Unified CRM customer interaction repository", () => {
  it("saves the communication outcome, clears a completed follow-up, and emits governed audit context", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      organizationId: "org-a",
      ownerUserId: "seller-a",
      lastInteractionAt: new Date("2026-08-14T14:00:00.000Z"),
      nextActionAt: new Date("2026-08-15T15:00:00.000Z"),
      contactPoints: [{ type: "PHONE", consentStatus: "CONFIRMED" }]
    });
    const repository = createUnifiedCrmCustomerInteractionRepository(database(tx));

    const result = await repository.createInteraction({
      command: {
        ...command,
        completeCurrentFollowUp: true,
        relatedRepairOrderId: "RO-1001",
        reportWorthy: true
      },
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(tx.customerInteraction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        channel: "PHONE",
        customerId: "customer-a",
        summary: "Confirmed the delivery time."
      })
    }));
    expect(tx.customer.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        lastInteractionAt: new Date("2026-08-14T15:00:00.000Z"),
        nextActionAt: null
      })
    }));
    expect(tx.enterpriseDomainEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        payload: expect.objectContaining({
          followUpCompleted: true,
          relatedRepairOrderId: "RO-1001",
          reportWorthy: true
        })
      })
    }));
    expect(tx.enterpriseAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          relatedRepairOrderId: "RO-1001",
          reportWorthy: true
        })
      })
    }));
    expect(result).toMatchObject({
      customerId: "customer-a",
      duplicate: false,
      followUpCompleted: true,
      interactionId: "interaction-created",
      nextActionAt: null
    });
  });

  it("authorizes the exact organization and owner before consulting idempotency state", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue(null);
    const repository = createUnifiedCrmCustomerInteractionRepository(database(tx));

    await expect(repository.createInteraction({
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
    expect(tx.customerInteraction.create).not.toHaveBeenCalled();
  });

  it("uses canonical contact consent and does not trust the claimed command consent", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      organizationId: "org-a",
      ownerUserId: "seller-a",
      lastInteractionAt: null,
      nextActionAt: null,
      contactPoints: [{ type: "PHONE", consentStatus: "UNKNOWN" }]
    });
    const repository = createUnifiedCrmCustomerInteractionRepository(database(tx));

    await expect(repository.createInteraction({
      command: { ...command, consentState: "CONFIRMED" },
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Outbound canonical consent is required.");

    expect(tx.enterpriseCommandLedger.findUnique).not.toHaveBeenCalled();
    expect(tx.customerInteraction.create).not.toHaveBeenCalled();
  });

  it("does not treat a negative consent status containing OPTED_IN as affirmative consent", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      organizationId: "org-a",
      ownerUserId: "seller-a",
      lastInteractionAt: null,
      nextActionAt: null,
      contactPoints: [{ type: "PHONE", consentStatus: "NOT_OPTED_IN" }]
    });
    const repository = createUnifiedCrmCustomerInteractionRepository(database(tx));

    await expect(repository.createInteraction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Outbound canonical consent is required.");

    expect(tx.enterpriseCommandLedger.findUnique).not.toHaveBeenCalled();
    expect(tx.customerInteraction.create).not.toHaveBeenCalled();
  });

  it("does not treat negative opted-in phrases as affirmative consent", async () => {
    const tx = transaction();
    tx.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      organizationId: "org-a",
      ownerUserId: "seller-a",
      lastInteractionAt: null,
      nextActionAt: null,
      contactPoints: [{ type: "PHONE", consentStatus: "NOT_OPTED_IN" }]
    });
    const repository = createUnifiedCrmCustomerInteractionRepository(database(tx));

    await expect(repository.createInteraction({
      command: { ...command, consentState: "CONFIRMED" },
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Outbound canonical consent is required.");

    expect(tx.enterpriseCommandLedger.findUnique).not.toHaveBeenCalled();
    expect(tx.customerInteraction.create).not.toHaveBeenCalled();
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
        interactionId: "interaction-existing",
        occurredAt: "2026-08-14T15:00:00.000Z",
        nextActionAt: null
      }
    });
    const repository = createUnifiedCrmCustomerInteractionRepository(database(tx));

    const result = await repository.createInteraction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result).toMatchObject({
      customerId: "customer-a",
      duplicate: true,
      interactionId: "interaction-existing",
      version: 7
    });
    expect(tx.customerInteraction.create).not.toHaveBeenCalled();
    expect(tx.customer.update).not.toHaveBeenCalled();
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
        interactionId: "private-interaction",
        occurredAt: "2026-08-14T15:00:00.000Z",
        nextActionAt: null
      }
    });
    const repository = createUnifiedCrmCustomerInteractionRepository(database(tx));

    await expect(repository.createInteraction({
      command,
      recordScope: { kind: "ORGANIZATION" }
    })).rejects.toThrow("Interaction idempotency scope is unavailable.");
    expect(tx.customerInteraction.create).not.toHaveBeenCalled();
  });
});
