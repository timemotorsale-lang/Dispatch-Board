import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityPreviewRepository } from "@/server/repositories/unified-crm-opportunity-preview-repository";
import { getUnifiedCrmOpportunityPipelinePreview } from "@/server/services/unified-crm-opportunity-read-service";

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
  roles: ["Salesperson"]
};

function repository(overrides: Partial<UnifiedCrmOpportunityPreviewRepository> = {}): UnifiedCrmOpportunityPreviewRepository {
  return {
    async findPrimaryOpportunityPreview() {
      return null;
    },
    async listOpportunityPreviews() {
      return [];
    },
    ...overrides
  };
}

describe("Unified CRM opportunity read service", () => {
  it("returns a held pipeline preview for organization visibility", async () => {
    const model = await getUnifiedCrmOpportunityPipelinePreview(manager, {
      now: () => new Date("2026-08-14T18:45:00.000Z"),
      mode: "REVIEW",
      repository: repository(),
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-read/v1",
      state: "PREVIEW",
      visibility: "organization"
    });
    expect(model.columns).toHaveLength(3);
    expect(model.columns[0].items[0].detailHref).toContain("/crm/opportunities/review01");
  });

  it("reflects owned visibility for sales access", async () => {
    const model = await getUnifiedCrmOpportunityPipelinePreview(seller, {
      now: () => new Date("2026-08-14T18:45:00.000Z"),
      mode: "REVIEW",
      repository: repository(),
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model.visibility).toBe("owned");
    expect(model.listPreview.heading).toContain("Your opportunity list");
  });

  it("surfaces a governed read-only collection in the list preview when available", async () => {
    const model = await getUnifiedCrmOpportunityPipelinePreview(manager, {
      accessContext: {
        actorUserId: "manager-a",
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
      now: () => new Date("2026-08-14T18:45:00.000Z"),
      repository: repository({
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "opp_123456",
            title: "Alex Morgan renewal review",
            summary: "Open the persisted read-only opportunity detail.",
            organizationId: "org-a",
            stage: "NEW_INQUIRY",
            nextActionLabel: "Call customer",
            nextActionDueAt: new Date("2026-08-14T20:00:00.000Z"),
            version: 2,
            ownerUser: { id: "manager-a", name: "CRM Manager" },
            customer: { id: "customer-1", displayName: "Alex Morgan", customerNumber: "CUS-18" },
            updatedAt: new Date("2026-08-14T18:30:00.000Z")
          }, {
            opportunityNumber: "opp_123457",
            title: "Warranty retention follow-up",
            summary: "Second persisted opportunity.",
            organizationId: "org-a",
            stage: "QUALIFIED",
            nextActionLabel: "Confirm appointment",
            nextActionDueAt: new Date("2026-08-16T18:00:00.000Z"),
            version: 4,
            ownerUser: { id: "manager-a", name: "CRM Manager" },
            customer: { id: "customer-2", displayName: "Jamie Rivera", customerNumber: "CUS-19" },
            updatedAt: new Date("2026-08-14T18:20:00.000Z")
          }];
        }
      })
    });

    expect(model.listPreview.heading).toContain("Visible read-only opportunities");
    expect(model.listPreview.observation).toMatchObject({
      detail: "Only same-scope persisted opportunities are listed here for organization review. Lifecycle movement opens through the governed transition command.",
      freshnessLabel: "Newest visible persisted update observed at 2026-08-14T18:30:00.000Z.",
      newestVisibleRecordUpdatedAt: "2026-08-14T18:30:00.000Z",
      state: "READY",
      visibleRecordCount: 2
    });
    expect(model.listPreview.items[0]).toMatchObject({
      id: "live-opp_123456",
      title: "Alex Morgan renewal review",
      customerLabel: "Alex Morgan · CUS-18",
      ownerLabel: "CRM Manager",
      href: "/crm/opportunities/opp_123456?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      detailHref: "/crm/opportunities/opp_123456?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      moveHref: "/crm/opportunities/opp_123456/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      nextActionLabel: "Call customer",
      stage: "NEW_INQUIRY",
      state: "LIVE_READ_ONLY"
    });
    expect(model.columns.map((column) => column.label)).toEqual(["New Inquiry", "Qualified"]);
    expect(model.columns[0].items[0]).toMatchObject({
      dueLabel: "Due soon",
      nextActionLabel: "Call customer",
      version: 2
    });
    expect(model.listPreview.items[1]).toMatchObject({
      id: "live-opp_123457",
      title: "Warranty retention follow-up",
      href: "/crm/opportunities/opp_123457?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      state: "LIVE_READ_ONLY"
    });
  });

  it("fails closed when repository preview output does not match org or owner scope", async () => {
    const model = await getUnifiedCrmOpportunityPipelinePreview(seller, {
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
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "opp_123456",
            title: "Wrong record",
            summary: "Should not appear.",
            organizationId: "org-b",
            stage: "NEW_INQUIRY",
            nextActionLabel: "Call customer",
            nextActionDueAt: new Date("2026-08-14T20:00:00.000Z"),
            version: 1,
            ownerUser: { id: "seller-b", name: "Seller B" },
            customer: null,
            updatedAt: new Date("2026-08-14T18:30:00.000Z")
          }];
        }
      })
    });

    expect(model.listPreview.items.some((item) => item.state === "LIVE_READ_ONLY")).toBe(false);
    expect(model.listPreview.observation).toMatchObject({
      state: "EMPTY",
      visibleRecordCount: 0,
      newestVisibleRecordUpdatedAt: null
    });
  });

  it("does not advertise an invalid persisted opportunity identifier as a live target", async () => {
    const model = await getUnifiedCrmOpportunityPipelinePreview(manager, {
      accessContext: {
        actorUserId: "manager-a",
        capabilities: { read: true, create: false, transition: false, linkTask: false, linkAppointment: false, linkDispatch: false },
        fallbackHref: "/crm?view=work",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        workspace: "MANAGEMENT"
      },
      repository: repository({
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "//evil.example",
            title: "Invalid target",
            summary: "Must not be exposed as live.",
            organizationId: "org-a",
            stage: "NEW_INQUIRY",
            nextActionLabel: "Call customer",
            nextActionDueAt: new Date("2026-08-14T20:00:00.000Z"),
            version: 1,
            ownerUser: { id: "manager-a", name: "CRM Manager" },
            customer: null,
            updatedAt: new Date("2026-08-14T18:30:00.000Z")
          }];
        }
      })
    });

    expect(model.listPreview.items.some((item) => item.state === "LIVE_READ_ONLY")).toBe(false);
    expect(JSON.stringify(model)).not.toContain("evil.example");
    expect(model.listPreview.observation).toMatchObject({
      state: "EMPTY",
      visibleRecordCount: 0,
      freshnessLabel: "No visible persisted opportunity update is available yet."
    });
  });

  it("wraps repository preview failures in a safe pipeline-preview unavailable error", async () => {
    await expect(getUnifiedCrmOpportunityPipelinePreview(manager, {
      accessContext: {
        actorUserId: "manager-a",
        capabilities: { read: true, create: false, transition: false, linkTask: false, linkAppointment: false, linkDispatch: false },
        fallbackHref: "/crm?view=work",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        workspace: "MANAGEMENT"
      },
      now: () => new Date("2026-08-14T18:45:00.000Z"),
      repository: repository({
        async listOpportunityPreviews() {
          throw new Error("private opportunity preview row");
        }
      })
    })).rejects.toMatchObject({
      code: "OPPORTUNITY_OFF",
      message: "Opportunity pipeline preview is temporarily unavailable."
    });
  });

  it("fails closed before organization lookup when the shell defaults off in production", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityPipelinePreview(manager, {
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });

    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
