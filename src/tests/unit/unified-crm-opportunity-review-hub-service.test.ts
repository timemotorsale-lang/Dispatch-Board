import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmOpportunityPreviewRepository } from "@/server/repositories/unified-crm-opportunity-preview-repository";
import { getUnifiedCrmOpportunityReviewHub } from "@/server/services/unified-crm-opportunity-review-hub-service";

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
    organizationId: "org-a",
    recordScope: scope === "organization"
      ? { kind: "ORGANIZATION" as const }
      : { kind: "OWNER" as const, ownerUserId: "seller-1" },
    workspace: scope === "organization" ? "MANAGEMENT" as const : "SALES" as const
  };
}

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

describe("Unified CRM opportunity review hub service", () => {
  it("returns a deterministic held-only hub with internal review links", async () => {
    const model = await getUnifiedCrmOpportunityReviewHub(null, {
      accessContext: accessContext("organization"),
      repository: repository(),
      now: () => new Date("2026-08-14T21:00:00.000Z")
    });
    const links = model.sections.flatMap((section) => section.links);

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-review-hub/v1",
      generatedAt: "2026-08-14T21:00:00.000Z",
      state: "HELD_REVIEW",
      visibility: "organization",
      source: {
        href: "/crm?view=pipeline",
        observedAt: "2026-08-14T21:00:00.000Z"
      }
    });
    expect(model.sections.map((section) => section.id)).toEqual(["overview", "governance"]);
    expect(new Set(model.sections[0]?.links.map((link) => link.id))).toEqual(
      new Set(["pipeline", "queue", "create", "detail", "transition"])
    );
    expect(links.every((link) => link.state === "HELD_REVIEW")).toBe(true);
    expect(links.every((link) => link.href.startsWith("/crm") && !link.href.startsWith("//"))).toBe(true);

    const serialized = JSON.stringify(model);
    expect(serialized).not.toMatch(/"(?:liveCount|forecast|probability|amountCents|riskScore|transitionCommand)":/);
  });

  it("preserves owner-only review visibility for Sales access", async () => {
    await expect(getUnifiedCrmOpportunityReviewHub(null, {
      accessContext: accessContext("owned"),
      repository: repository(),
      now: () => new Date("2026-08-14T21:00:00.000Z")
    })).resolves.toMatchObject({
      state: "HELD_REVIEW",
      visibility: "owned",
      headline: { detail: expect.stringContaining("owned review") }
    });
  });

  it("surfaces a real persisted detail target when a same-scope record exists", async () => {
    const model = await getUnifiedCrmOpportunityReviewHub(null, {
      accessContext: accessContext("organization"),
      repository: repository({
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "opp_123456",
            title: "Alex Morgan renewal review",
            summary: "Read-only record",
            organizationId: "org-a",
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            customer: { id: "customer-1", displayName: "Alex Morgan", customerNumber: "CUS-18" },
            updatedAt: new Date("2026-08-14T20:55:00.000Z")
          }, {
            opportunityNumber: "opp_123457",
            title: "Jamie Rivera retention review",
            summary: "Another safe record",
            organizationId: "org-a",
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            customer: { id: "customer-2", displayName: "Jamie Rivera", customerNumber: "CUS-19" },
            updatedAt: new Date("2026-08-14T20:40:00.000Z")
          }];
        }
      }),
      now: () => new Date("2026-08-14T21:00:00.000Z")
    });

    const detailLink = model.sections.flatMap((section) => section.links).find((link) => link.id === "detail");
    const liveRecordsSection = model.sections.find((section) => section.id === "live-records");
    expect(detailLink).toMatchObject({
      label: "Open persisted detail",
      href: "/crm/opportunities/opp_123456?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      state: "LIVE_READ_ONLY"
    });
    expect(liveRecordsSection?.links).toHaveLength(2);
    expect(liveRecordsSection?.links[1]).toMatchObject({
      id: "live-opp_123457",
      href: "/crm/opportunities/opp_123457?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      state: "LIVE_READ_ONLY"
    });
    expect(model.headline.detail).toContain("real read-only detail record");
  });

  it("fails closed to held links when repository preview output does not match owner scope", async () => {
    const model = await getUnifiedCrmOpportunityReviewHub(null, {
      accessContext: accessContext("owned"),
      repository: repository({
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "opp_123456",
            title: "Wrong record",
            summary: "Should not appear",
            organizationId: "org-a",
            ownerUser: { id: "seller-b", name: "Seller B" },
            customer: null,
            updatedAt: new Date("2026-08-14T20:55:00.000Z")
          }];
        }
      }),
      now: () => new Date("2026-08-14T21:00:00.000Z")
    });

    const detailLink = model.sections.flatMap((section) => section.links).find((link) => link.id === "detail");
    expect(detailLink).toMatchObject({
      href: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      state: "HELD_REVIEW"
    });
  });

  it("falls back to held detail when a persisted identifier cannot open the detail route", async () => {
    const model = await getUnifiedCrmOpportunityReviewHub(null, {
      accessContext: accessContext("organization"),
      repository: repository({
        async listOpportunityPreviews() {
          return [{
            opportunityNumber: "x".repeat(121),
            title: "Invalid target",
            summary: "Must remain hidden",
            organizationId: "org-a",
            ownerUser: { id: "manager-1", name: "CRM Manager" },
            customer: null,
            updatedAt: new Date("2026-08-14T20:55:00.000Z")
          }];
        }
      })
    });

    const detailLink = model.sections.flatMap((section) => section.links).find((link) => link.id === "detail");
    expect(detailLink).toMatchObject({
      href: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
      state: "HELD_REVIEW"
    });
    expect(JSON.stringify(model)).not.toContain("Invalid target");
  });

  it("fails closed before organization lookup when the shell is off", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityReviewHub(manager, {
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
