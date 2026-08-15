import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityDiscovery } from "@/server/services/unified-crm-opportunity-discovery-service";

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
    capabilities: { read: true, create: false, transition: false, linkTask: false, linkAppointment: false, linkDispatch: false },
    fallbackHref: scope === "organization" ? "/manager-workspace" : "/tasks?department=SALES",
    mode: "REVIEW" as const,
    organizationId: "org-1",
    recordScope: scope === "organization"
      ? { kind: "ORGANIZATION" as const }
      : { kind: "OWNER" as const, ownerUserId: "seller-1" },
    workspace: scope === "organization" ? "MANAGEMENT" as const : "SALES" as const
  };
}

describe("getUnifiedCrmOpportunityDiscovery", () => {
  it.each(["organization", "owned"] as const)("returns held-only internal discovery for %s scope", async (scope) => {
    const model = await getUnifiedCrmOpportunityDiscovery(null, {
      accessContext: accessContext(scope),
      repository: {
        async findPrimaryOpportunityPreview() {
          return null;
        },
        async listOpportunityPreviews() {
          return [];
        }
      },
      now: () => new Date("2026-08-15T03:00:00.000Z")
    });

    expect(model.contractVersion).toBe("ucrm.opportunity-discovery/v1");
    expect(model.state).toBe("HELD_REVIEW");
    expect(model.visibility).toBe(scope);
    expect(model.collectionObservation).toMatchObject({
      state: "EMPTY",
      visibleRecordCount: 0,
      freshnessLabel: "No visible persisted opportunity update is available yet."
    });
    expect(model.panels).toHaveLength(3);
    expect(model.panels.every((panel) => panel.link.state === "HELD_REVIEW")).toBe(true);
    expect(model.panels.every((panel) => panel.link.href.startsWith("/") && !panel.link.href.startsWith("//"))).toBe(true);
    expect(model.source).toEqual({
      href: "/crm?view=pipeline",
      label: "Unified CRM opportunity workspace discovery",
      observedAt: "2026-08-15T03:00:00.000Z"
    });
    expect(Object.keys(model)).not.toEqual(expect.arrayContaining([
      "count",
      "forecastAmount",
      "probability",
      "stageId",
      "mutation",
      "commandId"
    ]));
  });

  it("fails closed before organization lookup when opportunity review is off", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityDiscovery(manager, {
      mode: "REVIEW",
      nodeEnv: "production",
      repository: {
        async findPrimaryOpportunityPreview() {
          return null;
        },
        async listOpportunityPreviews() {
          return [];
        }
      },
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });

  it("does not disclose persisted-target availability for an out-of-owner-scope record", async () => {
    const model = await getUnifiedCrmOpportunityDiscovery(null, {
      accessContext: accessContext("owned"),
      repository: {
        async findPrimaryOpportunityPreview() {
          return null;
        },
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "opp_123456",
            title: "Private opportunity",
            summary: "Private backend summary",
            organizationId: "org-1",
            ownerUser: { id: "seller-2", name: "Other seller" },
            customer: null,
            updatedAt: new Date("2026-08-15T02:00:00.000Z")
          }];
        }
      }
    });

    expect(model.panels.every((panel) => panel.link.state === "HELD_REVIEW")).toBe(true);
    expect(model.collectionObservation).toMatchObject({
      state: "EMPTY",
      visibleRecordCount: 0
    });
    expect(JSON.stringify(model)).not.toContain("Private opportunity");
    expect(model.panels.some((panel) => panel.link.state === "LIVE_READ_ONLY")).toBe(false);
  });

  it("returns persisted collection observation when same-scope records are visible", async () => {
    const model = await getUnifiedCrmOpportunityDiscovery(null, {
      accessContext: accessContext("organization"),
      repository: {
        async findPrimaryOpportunityPreview() {
          return null;
        },
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "opp_123456",
            title: "Visible opportunity",
            summary: "Visible backend summary",
            organizationId: "org-1",
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            customer: null,
            updatedAt: new Date("2026-08-15T02:00:00.000Z")
          }];
        }
      }
    });

    expect(model.collectionObservation).toMatchObject({
      detail: "Only same-scope persisted opportunities are available from this workspace entry for organization review. Lifecycle movement remains off.",
      freshnessLabel: "Newest visible persisted update observed at 2026-08-15T02:00:00.000Z.",
      newestVisibleRecordUpdatedAt: "2026-08-15T02:00:00.000Z",
      state: "READY",
      visibleRecordCount: 1
    });
    expect(model.panels.some((panel) => panel.link.state === "LIVE_READ_ONLY")).toBe(true);
  });

  it("wraps repository failures in a safe discovery unavailable error", async () => {
    await expect(getUnifiedCrmOpportunityDiscovery(null, {
      accessContext: accessContext("organization"),
      repository: {
        async findPrimaryOpportunityPreview() {
          return null;
        },
        async listOpportunityPreviews() {
          throw new Error("private discovery backend detail");
        }
      }
    })).rejects.toMatchObject({
      code: "OPPORTUNITY_OFF",
      message: "Opportunity workspace discovery is temporarily unavailable."
    });
  });
});
