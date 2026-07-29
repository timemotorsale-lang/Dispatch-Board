import { describe, expect, it, vi } from "vitest";

import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createSalesManagerReviewRequestRepository } from "@/server/sales/manager-review-request-repository";

const request = {
  assignedManagerUserId: "manager-1",
  customerId: "customer-1",
  dealId: "deal-1",
  idempotencyKey: "idem-1",
  reason: "Manager needs to review the deal structure.",
  sourceSnapshot: {
    crmRecordId: "crm-1"
  },
  urgency: "high" as const,
  vehicleId: "vehicle-1"
};

const input = {
  actorUserId: "sales-1",
  boardDate: "2026-07-28",
  commandType: "CREATE_MANAGER_REVIEW_REQUEST" as const,
  correlationId: "corr-1",
  idempotencyKey: "idem-1",
  organizationId: "org-1",
  request,
  requestHash: "hash-1"
};

function buildRepositoryMocks() {
  const tx = {
    activityEvent: {
      create: vi.fn().mockResolvedValue({ id: "activity-1" })
    },
    boardDay: {
      upsert: vi.fn().mockResolvedValue({ id: "board-day-1" })
    },
    enterpriseAuditEvent: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" })
    },
    enterpriseCommandLedger: {
      create: vi.fn().mockResolvedValue({ id: "command-1" }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "command-1" })
    },
    enterpriseDomainEvent: {
      create: vi.fn().mockResolvedValue({ id: "event-1" })
    },
    task: {
      create: vi.fn().mockResolvedValue({
        assignedUser: {
          email: "manager@local.test",
          id: "manager-1",
          name: "Manager User"
        },
        id: "task-1",
        priority: "HIGH",
        status: "NOT_STARTED",
        title: "Manager review requested for deal deal-1"
      }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        assignedUser: {
          email: "manager@local.test",
          id: "manager-1",
          name: "Manager User"
        },
        id: "task-1",
        priority: "HIGH",
        status: "NOT_STARTED",
        title: "Manager review requested for deal deal-1"
      })
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "manager-1",
        isActive: true,
        name: "Manager User"
      })
    }
  };
  const database = {
    $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
  };

  return { database, tx };
}

describe("Sales manager review request repository", () => {
  it("creates one manager-review task with command and audit records", async () => {
    const { database, tx } = buildRepositoryMocks();
    const repository = createSalesManagerReviewRequestRepository(database as never);

    const result = await repository.persist(input);

    expect(result).toMatchObject({
      auditEventId: "audit-1",
      commandId: "command-1",
      duplicate: false,
      idempotencyKey: "idem-1"
    });
    expect(database.$transaction).toHaveBeenCalledOnce();
    expect(tx.enterpriseCommandLedger.findUnique).toHaveBeenCalledBefore(tx.task.create);
    expect(tx.task.create).toHaveBeenCalledOnce();
    expect(tx.enterpriseAuditEvent.create).toHaveBeenCalledOnce();
    expect(tx.activityEvent.create).toHaveBeenCalledOnce();
  });

  it("returns the existing task for duplicate idempotent requests", async () => {
    const { tx } = buildRepositoryMocks();
    tx.enterpriseCommandLedger.findUnique.mockResolvedValue({
      correlationId: "corr-1",
      id: "command-1",
      idempotencyKey: "idem-1",
      requestHash: "hash-1",
      resultSnapshot: {
        auditEventId: "audit-1",
        taskId: "task-1"
      }
    });
    const repository = createSalesManagerReviewRequestRepository({
      $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
    } as never);

    const result = await repository.persist(input);

    expect(result.duplicate).toBe(true);
    expect(result.task.id).toBe("task-1");
    expect(tx.task.create).not.toHaveBeenCalled();
  });

  it("blocks reused idempotency keys with different payloads", async () => {
    const { tx } = buildRepositoryMocks();
    tx.enterpriseCommandLedger.findUnique.mockResolvedValue({
      id: "command-1",
      requestHash: "different-hash",
      resultSnapshot: {
        taskId: "task-1"
      }
    });
    const repository = createSalesManagerReviewRequestRepository({
      $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
    } as never);

    await expect(repository.persist(input)).rejects.toBeInstanceOf(EnterpriseCommandConflictError);
  });
});
