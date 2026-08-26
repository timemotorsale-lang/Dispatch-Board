import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityDispatchBridgeRepository } from "@/server/repositories/unified-crm-opportunity-dispatch-bridge-repository";
import { createUnifiedCrmOpportunityDispatchBridge } from "@/server/services/unified-crm-opportunity-dispatch-bridge-service";

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
  target: {
    href: "/vehicles/repair-workbench?repairOrderId=ro-1",
    repairJobId: null,
    repairJobNumber: null,
    repairOrderId: "ro-1",
    repairOrderNumber: "RO-1001",
    targetKind: "REPAIR_ORDER" as const,
    title: "Repair order RO-1001",
    version: 2
  }
}) {
  const received: unknown[] = [];
  const repo: UnifiedCrmOpportunityDispatchBridgeRepository = {
    async commitDispatchBridge(input) {
      received.push(input);
      return result;
    }
  };
  return { received, repo };
}

const valid = {
  expectedTargetVersion: 2,
  expectedVersion: 4,
  idempotencyKey: "crm-opportunity-dispatch-1",
  repairOrderId: "ro-1",
  targetKind: "REPAIR_ORDER" as const
};

describe("Unified CRM opportunity dispatch bridge service", () => {
  it("links governed dispatch work with opportunity and target versions", async () => {
    const source = repository();

    const result = await createUnifiedCrmOpportunityDispatchBridge(manager, "opp_123456", valid, {
      mode: "REVIEW",
      repository: source.repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(source.received[0]).toMatchObject({
      recordScope: { kind: "ORGANIZATION" },
      command: {
        expectedTargetVersion: 2,
        expectedVersion: 4,
        opportunityId: "opp_123456",
        organizationId: "org-a",
        targetId: "ro-1",
        targetKind: "REPAIR_ORDER"
      }
    });
    expect(result).toMatchObject({
      contractVersion: "ucrm.opportunity-dispatch-bridge/v1",
      duplicate: false,
      opportunityId: "opp_123456",
      target: {
        href: "/vehicles/repair-workbench?repairOrderId=ro-1",
        repairOrderNumber: "RO-1001",
        targetKind: "REPAIR_ORDER",
        version: 2
      }
    });
  });

  it("fails closed for held mode, invalid payload, stale opportunity, and stale dispatch target", async () => {
    await expect(createUnifiedCrmOpportunityDispatchBridge(manager, "opp_123456", valid, {
      mode: "OFF",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "DISPATCH_BRIDGE_OFF" });

    await expect(createUnifiedCrmOpportunityDispatchBridge(manager, "opp_123456", {
      expectedTargetVersion: 1,
      expectedVersion: 4,
      idempotencyKey: "crm-opportunity-dispatch-1",
      repairJobId: "",
      targetKind: "REPAIR_JOB"
    }, {
      mode: "REVIEW",
      repository: repository().repo,
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_DISPATCH_BRIDGE_COMMAND" });

    await expect(createUnifiedCrmOpportunityDispatchBridge(manager, "opp_123456", valid, {
      mode: "REVIEW",
      repository: {
        async commitDispatchBridge() {
          throw new Error("Opportunity version conflict.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_VERSION_CONFLICT" });

    await expect(createUnifiedCrmOpportunityDispatchBridge(manager, "opp_123456", valid, {
      mode: "REVIEW",
      repository: {
        async commitDispatchBridge() {
          throw new Error("Dispatch target version conflict.");
        }
      },
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "DISPATCH_TARGET_VERSION_CONFLICT" });
  });
});
