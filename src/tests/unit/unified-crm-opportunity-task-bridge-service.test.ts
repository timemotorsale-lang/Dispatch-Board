import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityTaskBridgeRepository } from "@/server/repositories/unified-crm-opportunity-task-bridge-repository";
import { createUnifiedCrmOpportunityTaskBridge } from "@/server/services/unified-crm-opportunity-task-bridge-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function repository(result = {
  duplicate: false,
  opportunityId: "opp_123456",
  task: {
    dueAt: new Date("2026-08-15T15:00:00.000Z"),
    id: "task-1",
    title: "Follow up with Accord shopper"
  }
}) {
  const received: unknown[] = [];
  const repo: UnifiedCrmOpportunityTaskBridgeRepository = {
    async commitTaskBridge(input) {
      received.push(input);
      return result;
    }
  };
  return { received, repo };
}

describe("Unified CRM opportunity task bridge service", () => {
  it("creates a governed task bridge with opportunity version and organization scope", async () => {
    const source = repository();
    const now = new Date("2026-08-15T10:00:00.000Z");

    const result = await createUnifiedCrmOpportunityTaskBridge(manager, "opp_123456", {
      brief: "Document the opportunity follow-up and next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      expectedVersion: 3,
      idempotencyKey: "crm-opportunity-task-1",
      title: "Follow up with Accord shopper"
    }, {
      mode: "REVIEW",
      now: () => now,
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(source.received[0]).toMatchObject({
      recordScope: { kind: "ORGANIZATION" },
      command: {
        expectedVersion: 3,
        opportunityId: "opp_123456",
        organizationId: "org-a",
        title: "Follow up with Accord shopper"
      }
    });
    expect(result).toEqual({
      contractVersion: "ucrm.opportunity-task-bridge/v1",
      duplicate: false,
      opportunityId: "opp_123456",
      task: {
        dueAt: "2026-08-15T15:00:00.000Z",
        href: "/tasks/task-1",
        id: "task-1",
        title: "Follow up with Accord shopper"
      }
    });
  });

  it("fails closed for held mode, stale versions, invalid input, and replay conflicts", async () => {
    const now = new Date("2026-08-15T10:00:00.000Z");
    const valid = {
      brief: "Document the opportunity follow-up and next operational step.",
      dueAt: "2026-08-15T15:00:00.000Z",
      expectedVersion: 3,
      idempotencyKey: "crm-opportunity-task-2",
      title: "Follow up with Accord shopper"
    };

    await expect(createUnifiedCrmOpportunityTaskBridge(manager, "opp_123456", valid, {
      mode: "OFF",
      now: () => now,
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_TASK_BRIDGE_OFF" });

    await expect(createUnifiedCrmOpportunityTaskBridge(manager, "opp_123456", { ...valid, expectedVersion: -1 }, {
      mode: "REVIEW",
      now: () => now,
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_TASK_BRIDGE_COMMAND" });

    await expect(createUnifiedCrmOpportunityTaskBridge(manager, "opp_123456", valid, {
      mode: "REVIEW",
      now: () => now,
      repository: {
        async commitTaskBridge() {
          throw new Error("Opportunity version conflict.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_VERSION_CONFLICT" });

    await expect(createUnifiedCrmOpportunityTaskBridge(manager, "opp_123456", valid, {
      mode: "REVIEW",
      now: () => now,
      repository: {
        async commitTaskBridge() {
          throw Object.assign(new Error("Already used."), { code: "IDEMPOTENCY_KEY_REUSED" });
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });
});
