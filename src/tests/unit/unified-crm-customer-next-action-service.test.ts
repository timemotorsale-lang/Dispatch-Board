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
      expectedCurrentNextActionAt: null,
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
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z",
      idempotencyKey: "next-action-4",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a", "org-b"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_SOURCE_UNAVAILABLE" });
  });

  it("requires explicit current-state input before issuing a next-action command", async () => {
    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-missing-current",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_NEXT_ACTION_COMMAND" });

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      expectedCurrentNextActionAt: null,
      idempotencyKey: "next-action-complete-missing-active",
      operation: "COMPLETE"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository({
        customerId: "customer-1",
        duplicate: false,
        nextActionAt: null,
        operation: "COMPLETE",
        version: 2
      }).repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_NEXT_ACTION_COMMAND" });
  });

  it("normalizes customer identity and rejects missing command essentials before any repository write", async () => {
    const source = repository();

    await expect(updateUnifiedCrmCustomerNextAction(manager, "  customer-1  ", {
      dueAt: "2026-08-15T15:00:00.000Z",
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z",
      idempotencyKey: "trimmed-customer-id",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).resolves.toMatchObject({ customerId: "customer-1" });

    expect(source.received[0]).toMatchObject({
      command: {
        customerId: "customer-1"
      }
    });

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      operation: "SET"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_NEXT_ACTION_COMMAND" });

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      expectedCurrentNextActionAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "complete-without-op",
      operation: "COMPLETE"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitNextAction() {
          throw new Error("No next action available.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "NO_ACTIVE_NEXT_ACTION" });
  });

  it("fails closed when the next-action command mode is OFF", async () => {
    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      expectedCurrentNextActionAt: null,
      idempotencyKey: "next-action-off",
      operation: "SET"
    }, {
      commandMode: "OFF",
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_360_OFF" });
  });

  it("maps owner, stale, no-active, and idempotency conflicts to typed CRM errors", async () => {
    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z",
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
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z",
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
      operation: "SET",
      expectedCurrentNextActionAt: null
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

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      expectedCurrentNextActionAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-8",
      operation: "COMPLETE"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitNextAction() {
          throw new Error("No next action available.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "NO_ACTIVE_NEXT_ACTION" });
  });

  it("maps missing customer, unauthenticated access, and unexpected source failures safely", async () => {
    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-not-found",
      operation: "SET",
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitNextAction() {
          throw new Error("Customer not available.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });

    await expect(updateUnifiedCrmCustomerNextAction(null, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-auth",
      operation: "SET",
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });

    await expect(updateUnifiedCrmCustomerNextAction(manager, "customer-1", {
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "next-action-unexpected",
      operation: "SET",
      expectedCurrentNextActionAt: "2026-08-14T12:00:00.000Z"
    }, {
      now: () => new Date("2026-08-14T15:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitNextAction() {
          throw new Error("private source failure");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_SOURCE_UNAVAILABLE" });
  });
});
