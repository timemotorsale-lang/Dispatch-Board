import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityQueueReview } from "@/server/services/unified-crm-opportunity-queue-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function accessContext(scope: "organization" | "owned") {
  return {
    actorUserId: scope === "organization" ? "manager-1" : "seller-1",
    capabilities: {
      read: true,
      create: false,
      transition: false,
      linkTask: false,
      linkAppointment: false,
      linkDispatch: false
    },
    fallbackHref: scope === "organization" ? "/manager-workspace" : "/tasks?department=SALES",
    mode: "REVIEW" as const,
    organizationId: "org-1",
    recordScope: scope === "organization"
      ? { kind: "ORGANIZATION" as const }
      : { kind: "OWNER" as const, ownerUserId: "seller-1" },
    workspace: scope === "organization" ? "MANAGEMENT" as const : "SALES" as const
  };
}

function repository(overrides: Record<string, unknown> = {}) {
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

describe("getUnifiedCrmOpportunityQueueReview", () => {
  it("returns an honest held queue review for organization scope", async () => {
    const model = await getUnifiedCrmOpportunityQueueReview(null, {
      accessContext: accessContext("organization"),
      repository: repository(),
      now: () => new Date("2026-08-14T20:00:00.000Z")
    });

    expect(model.contractVersion).toBe("ucrm.opportunity-queue/v1");
    expect(model.visibility).toBe("organization");
    expect(model.state).toBe("HELD_REVIEW");
    expect(model.segments.map((segment) => segment.id)).toEqual(["owned", "unassigned", "overdue", "stalled", "waiting", "at-risk"]);
    expect(model.items[0]?.detailHref).toContain("/crm/opportunities/review01");
    expect(model.governance[0]).toContain("does not reorder, assign, or transition");
    expect(model.generatedAt).toBe("2026-08-14T20:00:00.000Z");
    expect(model.source.observedAt).toBe(model.generatedAt);
    expect(model.liveReadObservation).toMatchObject({
      detail: "No same-scope persisted read-only opportunity is visible in this queue right now for team and manager review. Continue with held queue review until one is available.",
      freshnessLabel: "No visible persisted opportunity update is available yet.",
      newestVisibleRecordUpdatedAt: null,
      state: "EMPTY",
      visibleRecordCount: 0
    });
    expect(new Set(model.items.map((item) => item.id)).size).toBe(model.items.length);
    expect(model.items.every((item) => item.state === "HELD_REVIEW")).toBe(true);
    expect(model.items.every((item) => /^\/crm\/opportunities\//.test(item.detailHref))).toBe(true);
    expect(JSON.stringify(model)).not.toMatch(/probability|forecastAmount|stageId|riskScore|assignedAt/);
  });

  it("switches copy for owned-only scope", async () => {
    const model = await getUnifiedCrmOpportunityQueueReview(null, {
      accessContext: accessContext("owned"),
      repository: repository(),
      now: () => new Date("2026-08-14T20:00:00.000Z")
    });

    expect(model.visibility).toBe("owned");
    expect(model.segments[0]?.countLabel).toContain("item(s)");
    expect(model.items[0]?.ownerLabel).toContain("Owned by you");
  });

  it("expands beyond the primary persisted record when several visible opportunities exist", async () => {
    const model = await getUnifiedCrmOpportunityQueueReview(null, {
      accessContext: accessContext("organization"),
      repository: repository({
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "opp_123456",
            title: "Alex Morgan renewal review",
            summary: "First persisted queue item.",
            organizationId: "org-1",
            stage: "NEW_INQUIRY",
            nextActionLabel: "Call customer",
            nextActionDueAt: new Date("2026-08-14T19:10:00.000Z"),
            version: 2,
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            customer: null,
            updatedAt: new Date("2026-08-14T19:10:00.000Z")
          }, {
            opportunityNumber: "opp_123457",
            title: "Jamie Rivera retention review",
            summary: "Second persisted queue item.",
            organizationId: "org-1",
            stage: "CUSTOMER_DECIDING",
            nextActionLabel: null,
            nextActionDueAt: null,
            version: 3,
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            customer: null,
            updatedAt: new Date("2026-08-14T19:00:00.000Z")
          }];
        }
      })
    });

    expect(model.items[0]).toMatchObject({ id: "opp_123456", state: "LIVE_READ_ONLY" });
    expect(model.items[1]).toMatchObject({ id: "opp_123457", riskLabel: "Stalled", segmentIds: ["owned", "stalled", "waiting", "at-risk"], state: "LIVE_READ_ONLY" });
    expect(model.liveReadObservation).toMatchObject({
      detail: "Only same-scope persisted opportunities are shown in this queue for team and manager review. Lifecycle movement opens through the governed transition command.",
      freshnessLabel: "Newest visible persisted update observed at 2026-08-14T19:10:00.000Z.",
      newestVisibleRecordUpdatedAt: "2026-08-14T19:10:00.000Z",
      state: "READY",
      visibleRecordCount: 2
    });
    expect(model.segments.find((segment) => segment.id === "overdue")).toMatchObject({ countLabel: "1 item(s)", state: "REVIEW" });
    expect(model.segments.find((segment) => segment.id === "stalled")).toMatchObject({ countLabel: "1 item(s)", state: "REVIEW" });
    expect(model.items.length).toBeGreaterThan(3);
  });

  it.each([
    ["another organization", { organizationId: "org-b", ownerUser: { id: "seller-1", name: "Seller" }, opportunityNumber: "opp_123456" }],
    ["another owner", { organizationId: "org-1", ownerUser: { id: "seller-2", name: "Other seller" }, opportunityNumber: "opp_123456" }],
    ["an invalid identifier", { organizationId: "org-1", ownerUser: { id: "seller-1", name: "Seller" }, opportunityNumber: "//invalid" }]
  ])("does not expose a persisted queue target from %s", async (_scenario, record) => {
    const model = await getUnifiedCrmOpportunityQueueReview(null, {
      accessContext: accessContext("owned"),
      repository: repository({
        async listOpportunityPreviews() {
          return [{
            ...record,
            title: "Private opportunity",
            summary: "Private backend summary",
            stage: "NEW_INQUIRY",
            nextActionLabel: "Call customer",
            nextActionDueAt: new Date("2026-08-14T19:10:00.000Z"),
            version: 1,
            customer: null,
            updatedAt: new Date("2026-08-14T19:00:00.000Z")
          }];
        }
      })
    });

    expect(model.items.every((item) => item.state === "HELD_REVIEW")).toBe(true);
    expect(model.liveReadObservation).toMatchObject({
      state: "EMPTY",
      visibleRecordCount: 0,
      newestVisibleRecordUpdatedAt: null
    });
    expect(JSON.stringify(model)).not.toContain("Private opportunity");
    expect(JSON.stringify(model)).not.toContain("Private backend summary");
    expect(JSON.stringify(model)).not.toContain("//invalid");
  });

  it("does not bypass the shell-off default when queue review mode is requested", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityQueueReview(manager, {
      mode: "REVIEW",
      nodeEnv: "production",
      repository: repository(),
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });

  it("wraps repository preview failures in a safe queue-review unavailable error", async () => {
    await expect(getUnifiedCrmOpportunityQueueReview(null, {
      accessContext: accessContext("organization"),
      repository: repository({
        async listOpportunityPreviews() {
          throw new Error("private opportunity queue row");
        }
      })
    })).rejects.toMatchObject({
      code: "OPPORTUNITY_OFF",
      message: "Opportunity queue review is temporarily unavailable."
    });
  });
});
