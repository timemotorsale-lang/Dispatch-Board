import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityDetailRepository } from "@/server/repositories/unified-crm-opportunity-detail-repository";
import { getUnifiedCrmOpportunityDetail } from "@/server/services/unified-crm-opportunity-detail-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = {
  ...manager,
  id: "seller-a",
  email: "seller@example.test",
  roles: ["Salesperson"]
};

const now = new Date("2026-08-14T18:00:00.000Z");

function repository(overrides: Partial<UnifiedCrmOpportunityDetailRepository> = {}): UnifiedCrmOpportunityDetailRepository {
  return {
    async findOpportunityDetail() {
      return null;
    },
    ...overrides
  };
}

function persistedRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "db-opp-1",
    organizationId: "org-a",
    opportunityNumber: "opp_123456",
    title: "Permitted opportunity",
    summary: "Read-only summary",
    customer: null,
    ownerUser: { id: "seller-a", name: "Seller A" },
    sourceLead: null,
    createdAt: new Date("2026-08-14T16:00:00.000Z"),
    updatedAt: new Date("2026-08-14T17:30:00.000Z"),
    ...overrides
  };
}

describe("Unified CRM opportunity detail service", () => {
  it("returns a held, read-only detail model without operational record data", async () => {
    const model = await getUnifiedCrmOpportunityDetail(manager, "review01", {
      now: () => now,
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-detail/v1",
      state: "HELD",
      generatedAt: now.toISOString(),
      requestedOpportunityId: "review01",
      visibility: "organization",
      source: {
        authority: "UNIFIED_CRM",
        href: "/crm?view=pipeline",
        readMode: "HELD_REVIEW"
      },
      freshness: {
        status: "CURRENT",
        observedAt: now.toISOString(),
        sourceRecordUpdatedAt: null
      },
      identity: {
        lifecycleStatus: "HELD",
        title: "Opportunity detail review"
      }
    });

    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain("amount");
    expect(serialized).not.toContain("forecast");
    expect(serialized).not.toContain("customerId");
  });

  it("rejects invalid identifiers before returning review detail", async () => {
    await expect(getUnifiedCrmOpportunityDetail(manager, " bad ", {
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_OPPORTUNITY_ID" });
  });

  it("returns only an owned held projection for a Sales viewer", async () => {
    const model = await getUnifiedCrmOpportunityDetail(seller, "review01", {
      now: () => now,
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      state: "HELD",
      visibility: "owned",
      identity: { ownerScopeLabel: "Owned review scope" }
    });
    expect(JSON.stringify(model)).not.toMatch(/stageId|probability|valueCents|repairJobId|appointmentId/);
  });

  it("returns a real persisted opportunity record in read-only mode", async () => {
    const model = await getUnifiedCrmOpportunityDetail(manager, "opp_123456", {
      accessContext: {
        actorUserId: manager.id,
        capabilities: {
          read: true,
          create: false,
          transition: false,
          linkTask: false,
          linkAppointment: false,
          linkDispatch: false
        },
        fallbackHref: "/crm?view=work",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        workspace: "MANAGEMENT"
      },
      now: () => now,
      repository: repository({
        async findOpportunityDetail(input) {
          expect(input).toMatchObject({
            opportunityId: "opp_123456",
            organizationId: "org-a",
            recordScope: { kind: "ORGANIZATION" }
          });
          return {
            id: "db-opp-1",
            organizationId: "org-a",
            opportunityNumber: "opp_123456",
            title: "Alex Morgan renewal review",
            summary: "Confirm the sourced lead context and keep the opportunity read-only.",
            customer: {
              id: "customer-1",
              displayName: "Alex Morgan",
              customerNumber: "CUS-18"
            },
            ownerUser: {
              id: "manager-a",
              name: "CRM Manager"
            },
            sourceLead: {
              id: "lead-1",
              leadNumber: "LEAD-42",
              stage: "QUALIFIED"
            },
            createdAt: new Date("2026-08-14T16:00:00.000Z"),
            updatedAt: new Date("2026-08-14T17:30:00.000Z")
          };
        }
      })
    });

    expect(model).toMatchObject({
      state: "READY",
      requestedOpportunityId: "opp_123456",
      visibility: "organization",
      source: {
        label: "Unified CRM opportunity record",
        readMode: "LIVE_READ_ONLY"
      },
      freshness: {
        sourceRecordUpdatedAt: "2026-08-14T17:30:00.000Z"
      },
      identity: {
        lifecycleStatus: "READ_ONLY",
        ownerScopeLabel: "Organization read-only scope",
        title: "Alex Morgan renewal review"
      },
      summary: {
        customer: "Alex Morgan · CUS-18",
        owner: "CRM Manager"
      },
      sourceBridge: {
        label: "Lead bridge",
        state: "CONNECTED"
      }
    });
    expect(JSON.stringify(model)).not.toMatch(/valueCents|probability|stageId|closeDate/);
  });

  it("fails closed with a typed not-found error when a persisted opportunity is missing or out of scope", async () => {
    await expect(getUnifiedCrmOpportunityDetail(manager, "opp_123456", {
      accessContext: {
        actorUserId: manager.id,
        capabilities: {
          read: true,
          create: false,
          transition: false,
          linkTask: false,
          linkAppointment: false,
          linkDispatch: false
        },
        fallbackHref: "/crm?view=work",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "OWNER", ownerUserId: "seller-a" },
        workspace: "SALES"
      },
      repository: repository()
    })).rejects.toMatchObject({ code: "OPPORTUNITY_DETAIL_NOT_FOUND" });
  });

  it.each([
    ["another organization", { organizationId: "org-b" }],
    ["another owner", { ownerUser: { id: "seller-b", name: "Seller B" } }]
  ])("defensively rejects a repository row from %s", async (_scenario, recordOverrides) => {
    await expect(getUnifiedCrmOpportunityDetail(seller, "opp_123456", {
      accessContext: {
        actorUserId: "seller-a",
        capabilities: {
          read: true,
          create: false,
          transition: false,
          linkTask: false,
          linkAppointment: false,
          linkDispatch: false
        },
        fallbackHref: "/crm?view=work",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "OWNER", ownerUserId: "seller-a" },
        workspace: "SALES"
      },
      repository: repository({
        async findOpportunityDetail() {
          return persistedRecord(recordOverrides);
        }
      })
    })).rejects.toMatchObject({ code: "OPPORTUNITY_DETAIL_NOT_FOUND" });
  });

  it("wraps unexpected persisted-read failures without exposing backend detail", async () => {
    await expect(getUnifiedCrmOpportunityDetail(manager, "opp_123456", {
      accessContext: {
        actorUserId: manager.id,
        capabilities: {
          read: true,
          create: false,
          transition: false,
          linkTask: false,
          linkAppointment: false,
          linkDispatch: false
        },
        fallbackHref: "/crm?view=work",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        workspace: "MANAGEMENT"
      },
      repository: repository({
        async findOpportunityDetail() {
          throw new Error("secret cross-tenant backend detail");
        }
      })
    })).rejects.toMatchObject({
      code: "OPPORTUNITY_DETAIL_SOURCE_UNAVAILABLE",
      message: "Opportunity detail is temporarily unavailable."
    });
  });

  it("does not return review detail when the shell defaults off in production", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityDetail(manager, "review01", {
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
