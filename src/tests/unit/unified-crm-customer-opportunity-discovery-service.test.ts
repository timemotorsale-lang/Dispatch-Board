import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmCustomerOpportunityDiscovery } from "@/server/services/unified-crm-customer-opportunity-discovery-service";
import { customer360Fixture } from "@/tests/unit/unified-crm-customer-360-fixture";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function opportunityAccess(scope: "organization" | "owned") {
  return {
    actorUserId: scope === "organization" ? "manager-1" : "seller-1",
    capabilities: { read: true, create: false, transition: false, linkTask: false, linkAppointment: false, linkDispatch: false },
    fallbackHref: scope === "organization" ? "/manager-workspace" : "/tasks?department=SALES",
    mode: "REVIEW" as const,
    organizationId: "org-a",
    recordScope: scope === "organization"
      ? { kind: "ORGANIZATION" as const }
      : { kind: "OWNER" as const, ownerUserId: "seller-1" },
    workspace: scope === "organization" ? "MANAGEMENT" as const : "SALES" as const
  };
}

describe("getUnifiedCrmCustomerOpportunityDiscovery", () => {
  it.each(["organization", "owned"] as const)("returns a minimal held customer entry for %s scope", async (scope) => {
    const customer360 = customer360Fixture();
    const model = await getUnifiedCrmCustomerOpportunityDiscovery(null, "customer-1", {
      customer360,
      opportunityAccessContext: opportunityAccess(scope),
      now: () => new Date("2026-08-15T04:00:00.000Z")
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.customer-opportunity-discovery/v1",
      state: "HELD_REVIEW",
      customer: { id: customer360.identity.id, displayName: customer360.identity.displayName, listHref: "/crm?view=customers" }
    });
    expect(model.opportunityDiscovery.state).toBe("HELD_REVIEW");
    expect(model.opportunityDiscovery.visibility).toBe(scope);
    expect(model.contextPrompts).toHaveLength(3);
    expect(model.contextPrompts.map((prompt) => prompt.id)).toEqual([
      "timeline-follow-up",
      "connected-work",
      "source-lenses"
    ]);
    expect(model.contextPrompts.every((prompt) => prompt.state === "HELD_REVIEW")).toBe(true);
    expect(model.contextPrompts.every((prompt) => prompt.href.startsWith("/") && !prompt.href.startsWith("//"))).toBe(true);
    expect(model.contextPrompts.every((prompt) => prompt.href.includes("crmReturnTo=%2Fcrm%2Fcustomers%2Fcustomer-1"))).toBe(true);
    expect(model.opportunityDiscovery.panels.every((panel) =>
      panel.link.state === "HELD_REVIEW" && panel.link.href.startsWith("/") && !panel.link.href.startsWith("//")
    )).toBe(true);
    expect(JSON.stringify(model)).not.toContain("••••1234");
    expect(JSON.stringify(model)).not.toContain("a•••@e•••.com");
    expect(JSON.stringify(model)).not.toContain("Customer prefers texts after lunch.");
  });

  it("does not bypass opportunity feature-off when a permitted customer model is supplied", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmCustomerOpportunityDiscovery(manager, "customer-1", {
      customer360: customer360Fixture(),
      nodeEnv: "production",
      readMode: "REVIEW",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
