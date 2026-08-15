import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
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

describe("Unified CRM opportunity review hub service", () => {
  it("returns a deterministic held-only hub with internal review links", async () => {
    const model = await getUnifiedCrmOpportunityReviewHub(null, {
      accessContext: accessContext("organization"),
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
      now: () => new Date("2026-08-14T21:00:00.000Z")
    })).resolves.toMatchObject({
      state: "HELD_REVIEW",
      visibility: "owned",
      headline: { detail: expect.stringContaining("owned review") }
    });
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
