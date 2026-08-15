import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityGuidedJourney } from "@/server/services/unified-crm-opportunity-guided-journey-service";

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

describe("Unified CRM guided opportunity journey service", () => {
  it("returns one deterministic held-only journey through internal review surfaces", async () => {
    const model = await getUnifiedCrmOpportunityGuidedJourney(null, {
      accessContext: accessContext("organization"),
      now: () => new Date("2026-08-15T01:00:00.000Z")
    });
    const steps = model.phases.flatMap((phase) => phase.steps);

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-guided-journey/v1",
      generatedAt: "2026-08-15T01:00:00.000Z",
      state: "HELD_REVIEW",
      visibility: "organization",
      source: {
        href: "/crm?view=pipeline",
        observedAt: "2026-08-15T01:00:00.000Z"
      }
    });
    expect(model.phases.map((phase) => phase.id)).toEqual(["intake", "follow-through", "governance"]);
    expect(steps.map((step) => step.id)).toEqual(["entry", "queue", "detail", "transition", "return"]);
    expect(steps.every((step) => step.state === "HELD_REVIEW")).toBe(true);
    expect(steps.every((step) => step.href.startsWith("/crm") && !step.href.startsWith("//"))).toBe(true);
    expect(JSON.stringify(model)).not.toMatch(/"(?:liveCount|forecast|probability|amountCents|riskScore|transitionCommand)":/);
  });

  it("preserves owner-only review visibility for Sales access", async () => {
    await expect(getUnifiedCrmOpportunityGuidedJourney(null, {
      accessContext: accessContext("owned"),
      now: () => new Date("2026-08-15T01:00:00.000Z")
    })).resolves.toMatchObject({
      state: "HELD_REVIEW",
      visibility: "owned",
      headline: { detail: expect.stringContaining("owned review") }
    });
  });

  it("fails closed before organization lookup when the shell is off", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityGuidedJourney(manager, {
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
