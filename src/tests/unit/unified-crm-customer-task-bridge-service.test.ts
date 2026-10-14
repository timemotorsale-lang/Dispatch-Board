import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerTaskBridgeRepository } from "@/server/repositories/unified-crm-customer-task-bridge-repository";
import { createUnifiedCrmCustomerTaskBridge } from "@/server/services/unified-crm-customer-task-bridge-service";

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
  task: {
    dueAt: new Date("2026-08-15T15:00:00.000Z"),
    id: "task-1",
    title: "Follow up with Alex Morgan"
  }
}) {
  const received: unknown[] = [];
  const repo: UnifiedCrmCustomerTaskBridgeRepository = {
    async commitTaskBridge(input) {
      received.push(input);
      return result;
    }
  };
  return { received, repo };
}

describe("Unified CRM customer task bridge service", () => {
  it("creates a governed CRM task bridge result with organization scope", async () => {
    const source = repository();
    const now = new Date("2026-08-15T10:00:00.000Z");

    const result = await createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-1",
      title: "Follow up with Alex Morgan"
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
        title: "Follow up with Alex Morgan"
      }
    });
    expect(result).toEqual({
      contractVersion: "ucrm.customer-task-bridge/v1",
      customerId: "customer-1",
      duplicate: false,
      task: {
        dueAt: "2026-08-15T15:00:00.000Z",
        href: "/tasks/task-1",
        id: "task-1",
        title: "Follow up with Alex Morgan"
      }
    });
  });

  it("fails closed when task bridge mode is OFF", async () => {
    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-off",
      title: "Follow up with Alex Morgan"
    }, {
      bridgeMode: "OFF",
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_TASK_BRIDGE_OFF" });
  });

  it("fails closed for invalid customer identity and organization scope boundaries", async () => {
    await expect(createUnifiedCrmCustomerTaskBridge(manager, "   ", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-invalid-customer",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });

    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-no-org",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return []; } }
    })).rejects.toMatchObject({ code: "ORGANIZATION_SCOPE_UNAVAILABLE" });

    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-ambiguous-org",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a", "org-b"]; } }
    })).rejects.toMatchObject({ code: "ORGANIZATION_SCOPE_AMBIGUOUS" });
  });

  it("maps invalid payloads and idempotency reuse safely", async () => {
    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "too short",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-2",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_TASK_BRIDGE_COMMAND" });

    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-3",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitTaskBridge() {
          throw Object.assign(new Error("Already used."), { code: "IDEMPOTENCY_KEY_REUSED" });
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });

    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-scope-replay",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitTaskBridge() {
          throw new Error("Customer task bridge idempotency scope is unavailable.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "TASK_SOURCE_UNAVAILABLE" });

    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-invalid-replay",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitTaskBridge() {
          throw new Error("Stored customer task bridge replay is invalid.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "TASK_SOURCE_UNAVAILABLE" });
  });

  it("maps missing customer, unauthenticated access, and unexpected source failures safely", async () => {
    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-not-found",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitTaskBridge() {
          throw new Error("Customer not available.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "CUSTOMER_NOT_AVAILABLE" });

    await expect(createUnifiedCrmCustomerTaskBridge(null, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-auth",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });

    await expect(createUnifiedCrmCustomerTaskBridge(manager, "customer-1", {
      brief: "Document the customer follow-up and the next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      idempotencyKey: "crm-task-unexpected",
      title: "Follow up with Alex Morgan"
    }, {
      now: () => new Date("2026-08-15T10:00:00.000Z"),
      readMode: "REVIEW",
      repository: {
        async commitTaskBridge() {
          throw new Error("private source failure");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "TASK_SOURCE_UNAVAILABLE" });
  });
});
