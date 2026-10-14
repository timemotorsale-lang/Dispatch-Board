import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  salesManagerReviewRequestServiceLimitsWritesToManagerReview,
  salesManagerReviewRequestServiceReturnsCreatedOrDuplicateStatus,
  submitSalesManagerReviewRequest
} from "@/server/sales/manager-review-request-service";

const managerUser: AuthenticatedUser = {
  duties: {
    all: ["Review manager requests"],
    direct: ["Review manager requests"],
    roleDefaults: ["Review manager requests"]
  },
  email: "manager@local.test",
  id: "manager-1",
  isActive: true,
  name: "Manager User",
  roles: ["Sales Manager"]
};

const validRequest = {
  assignedManagerUserId: "manager-1",
  customerId: "customer-1",
  dealId: "deal-1",
  idempotencyKey: "review-request-1",
  reason: "Please review deal structure before staff follows up.",
  sourceSnapshot: {
    crmRecordId: "crm-1",
    dealRecordId: "deal-1",
    inventoryRecordId: "vehicle-1"
  },
  urgency: "normal",
  vehicleId: "vehicle-1"
};

describe("Sales manager review request service", () => {
  it("requires an authenticated user", async () => {
    await expect(submitSalesManagerReviewRequest(null, validRequest)).rejects.toThrow("Authentication required.");
  });

  it("returns a created result from the audited repository", async () => {
    const repository = {
      persist: vi.fn().mockResolvedValue({
        auditEventId: "audit-1",
        commandId: "command-1",
        correlationId: "corr-1",
        duplicate: false,
        idempotencyKey: "review-request-1",
        task: {
          assignedUser: {
            email: "manager@local.test",
            id: "manager-1",
            name: "Manager User"
          },
          id: "task-1",
          priority: "MEDIUM",
          status: "NOT_STARTED",
          title: "Manager review requested for deal deal-1"
        }
      })
    };
    const result = await submitSalesManagerReviewRequest(managerUser, validRequest, {
      boardDate: "2026-07-28",
      now: () => new Date("2026-07-28T12:00:00.000Z"),
      organizationId: "org-1",
      repository
    });

    expect(result).toMatchObject({
      auditEventId: "audit-1",
      commandId: "command-1",
      status: "created",
      workflowLive: true
    });
    expect(result.guardrails).toContain("Only audited Manager Review task creation");
    expect(repository.persist).toHaveBeenCalledOnce();
  });

  it("returns duplicate status for idempotent retries", async () => {
    const repository = {
      persist: vi.fn().mockResolvedValue({
        auditEventId: "audit-1",
        commandId: "command-1",
        correlationId: "corr-1",
        duplicate: true,
        idempotencyKey: "review-request-1",
        task: {
          assignedUser: {
            email: "manager@local.test",
            id: "manager-1",
            name: "Manager User"
          },
          id: "task-1",
          priority: "MEDIUM",
          status: "NOT_STARTED",
          title: "Manager review requested for deal deal-1"
        }
      })
    };

    await expect(
      submitSalesManagerReviewRequest(managerUser, validRequest, {
        boardDate: "2026-07-28",
        organizationId: "org-1",
        repository
      })
    ).resolves.toMatchObject({
      duplicate: true,
      status: "duplicate"
    });
  });

  it("limits writes to audited manager-review task creation", async () => {
    const repository = {
      persist: vi.fn().mockResolvedValue({
        auditEventId: "audit-1",
        commandId: "command-1",
        correlationId: "corr-1",
        duplicate: false,
        idempotencyKey: "review-request-1",
        task: {
          assignedUser: {
            email: "manager@local.test",
            id: "manager-1",
            name: "Manager User"
          },
          id: "task-1",
          priority: "MEDIUM",
          status: "NOT_STARTED",
          title: "Manager review requested for deal deal-1"
        }
      })
    };

    expect(salesManagerReviewRequestServiceLimitsWritesToManagerReview()).toBe(true);
    await expect(
      salesManagerReviewRequestServiceReturnsCreatedOrDuplicateStatus(managerUser, validRequest, {
        boardDate: "2026-07-28",
        organizationId: "org-1",
        repository
      })
    ).resolves.toBe(true);
  });
});
