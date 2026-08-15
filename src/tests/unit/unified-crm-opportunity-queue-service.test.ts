import { describe, expect, it, vi } from "vitest";

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

describe("getUnifiedCrmOpportunityQueueReview", () => {
  it("returns an honest held queue review for organization scope", async () => {
    const model = await getUnifiedCrmOpportunityQueueReview(null, {
      accessContext: accessContext("organization"),
      now: () => new Date("2026-08-14T20:00:00.000Z")
    });

    expect(model.contractVersion).toBe("ucrm.opportunity-queue/v1");
    expect(model.visibility).toBe("organization");
    expect(model.state).toBe("HELD_REVIEW");
    expect(model.segments.map((segment) => segment.id)).toEqual(["owned", "overdue", "waiting", "at-risk"]);
    expect(model.items[0]?.detailHref).toContain("/crm/opportunities/review01");
    expect(model.governance[0]).toContain("does not reorder, assign, or transition");
    expect(model.generatedAt).toBe("2026-08-14T20:00:00.000Z");
    expect(model.source.observedAt).toBe(model.generatedAt);
    expect(new Set(model.items.map((item) => item.id)).size).toBe(model.items.length);
    expect(model.items.every((item) => item.state === "HELD_REVIEW")).toBe(true);
    expect(model.items.every((item) => /^\/crm\/opportunities\//.test(item.detailHref))).toBe(true);
    expect(JSON.stringify(model)).not.toMatch(/probability|forecastAmount|stageId|riskScore|assignedAt/);
  });

  it("switches copy for owned-only scope", async () => {
    const model = await getUnifiedCrmOpportunityQueueReview(null, {
      accessContext: accessContext("owned"),
      now: () => new Date("2026-08-14T20:00:00.000Z")
    });

    expect(model.visibility).toBe("owned");
    expect(model.segments[0]?.countLabel).toContain("Owned by you");
    expect(model.items[0]?.ownerLabel).toContain("Owned by you");
  });

  it("does not bypass the shell-off default when queue review mode is requested", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityQueueReview(manager, {
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
