import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerNextActionRepository } from "@/server/repositories/unified-crm-customer-next-action-repository";
import { updateUnifiedCrmCustomerNextAction } from "@/server/services/unified-crm-customer-next-action-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function repository(result = {
  customerId: "customer-1",
  duplicate: false,
  nextActionAt: new Date("2026-08-15T15:00:00.000Z"),
  operation: "SET" as const,
  version: 1
}) {
  const received: unknown[] = [];
  const repo: UnifiedCrmCustomerNextActionRepository = {
    async commitNextAction(input) {
      received.push(input);
      return result;
    }
  };
  return { received, repo };
}

describe("Unified CRM customer next action command", () => {
  it("records a next action with organization scope and returns the normalized result", async () => {
    const source = repository();
    const now = new Date("2026-08-14T15:00:00.000Z");

    const result = await updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z",
      idempotencyKey: "next-action-1",
      note: "Customer requested a Friday check-in.",
      operation: "set"
    }, {
      now: () => now,
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(source.received[0]).toMatchObject({
      recordScope: { kind: "ORGANIZATION" },
      command: {
        customerId: "customer-1",
        organizationId: "org-a",
        operation: "SET",
        note: "Customer requested a Friday check-in."
      }
    });
    expect(result).toMatchObject({
      contractVersion: "ucrm.customer-next-action/v1",
      customerId: "customer-1",
      duplicate: false,
      nextActionAt: "2026-08-15T15:00:00.000Z",
      operation: "SET"
    });
  });

  it("completes a next action without requiring a due time", async () => {
    const source = repository({
      customerId: "customer-1",
      duplicate: false,
      nextActionAt: null,
      operation: "COMPLETE",
      version: 2
    });

    const result = await updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      expectedCurrentNextActionAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-2",
      operation: "complete"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(source.received[0]).toMatchObject({
      command: {
        dueAt: null,
        operation: "COMPLETE"
      }
    });
    expect(result).toMatchObject({
      nextActionAt: null,
      operation: "COMPLETE",
      version: 2
    });
  });

  it("rejects stale due times and ambiguous organization scope", async () => {
    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-14T12:00:00.000Z",
      idempotencyKey: "next-action-3",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_NEXT_ACTION_COMMAND" });

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-4",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a", "org-b"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_SOURCE_UNAVAILABLE" });
  });

  it("maps owner, stale, and idempotency conflicts to typed CRM errors", async () => {
    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-5",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitNextAction() {
          throw new Error("Customer owner required.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_OWNER_REQUIRED" });

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-6",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitNextAction() {
          throw new Error("Stale next action.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "STALE_NEXT_ACTION" });

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-7",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitNextAction() {
          throw Object.assign(new Error("Already used."), { code: "IDEMPOTENCY_KEY_REUSED" });
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });
});
