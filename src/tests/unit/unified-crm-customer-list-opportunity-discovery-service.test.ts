import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  getUnifiedCrmCustomerListOpportunityDiscovery,
  getUnifiedCrmCustomerListOpportunityDiscoveries
} from "@/server/services/unified-crm-customer-list-opportunity-discovery-service";

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

describe("getUnifiedCrmCustomerListOpportunityDiscovery", () => {
  it.each(["organization", "owned"] as const)("returns minimal held actions with a safe filtered-list return for %s scope", async (scope) => {
    const model = await getUnifiedCrmCustomerListOpportunityDiscovery(null, {
      customer: { id: "customer-1", displayName: "Alex Morgan" },
      listHref: "/crm?view=customers&q=Alex&status=all&owner=mine&cursor=safe",
      now: () => new Date("2026-08-15T05:00:00.000Z"),
      opportunityAccessContext: opportunityAccess(scope)
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.customer-list-opportunity-discovery/v1",
      customer: { id: "customer-1", displayName: "Alex Morgan", listHref: "/crm?view=customers&q=Alex&status=all&owner=mine&cursor=safe" },
      state: "HELD_REVIEW"
    });
    expect(model.opportunityDiscovery.visibility).toBe(scope);
    expect(model.actions.map((action) => action.id)).toEqual(["pipeline", "hub", "guided"]);
    expect(model.actions.every((action) => action.state === "HELD_REVIEW" && action.href.startsWith("/") && !action.href.startsWith("//"))).toBe(true);
    expect(model.actions.every((action) => new URL(action.href, "http://crm.local").searchParams.getAll("crmReturnTo").length === 1)).toBe(true);
    expect(JSON.stringify(model)).not.toMatch(/maskedPhone|maskedEmail|customerNumber|forecastAmount|probability|stageId|commandId/);
  });

  it.each(["https://evil.example", "//evil.example", "/crm?view=pipeline", "/crm?view=customers&redirect=//evil.example"])("rejects unsafe list return %s", async (listHref) => {
    const model = await getUnifiedCrmCustomerListOpportunityDiscovery(null, {
      customer: { id: "customer-1", displayName: "Alex Morgan" },
      listHref,
      now: () => new Date("2026-08-15T05:00:00.000Z"),
      opportunityAccessContext: opportunityAccess("organization")
    });

    expect(model.customer.listHref).toBe("/crm?view=customers");
    expect(model.actions.every((action) => new URL(action.href, "http://crm.local").searchParams.get("crmReturnTo") === "/crm?view=customers")).toBe(true);
  });

  it("drops invalid and overlong list filter values", async () => {
    const model = await getUnifiedCrmCustomerListOpportunityDiscovery(null, {
      customer: { id: "customer-1", displayName: "Alex Morgan" },
      listHref: `/crm?view=customers&q=${"x".repeat(101)}&status=evil&owner=hacker&cursor=${"y".repeat(1025)}`,
      opportunityAccessContext: opportunityAccess("organization")
    });

    expect(model.customer.listHref).toBe("/crm?view=customers");
  });

  it("does not bypass opportunity feature-off", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmCustomerListOpportunityDiscovery(manager, {
      customer: { id: "customer-1", displayName: "Alex Morgan" },
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });

  it("returns a keyed held-only discovery collection for every visible customer", async () => {
    const model = await getUnifiedCrmCustomerListOpportunityDiscoveries(null, {
      customers: [
        { id: "customer-1", displayName: "Alex Morgan" },
        { id: "customer-2", displayName: "Jordan Lee" }
      ],
      listHref: "/crm?view=customers&q=Alex&status=active&owner=mine",
      now: () => new Date("2026-08-15T05:00:00.000Z"),
      opportunityAccessContext: opportunityAccess("organization")
    });

    expect(model.contractVersion).toBe("ucrm.customer-list-opportunity-discovery/v1");
    expect(model.state).toBe("HELD_REVIEW");
    expect(model.listHref).toBe("/crm?view=customers&q=Alex&status=active&owner=mine");
    expect(Object.keys(model.byCustomerId)).toEqual(["customer-1", "customer-2"]);
    expect(model.byCustomerId["customer-1"]?.customer.displayName).toBe("Alex Morgan");
    expect(model.byCustomerId["customer-2"]?.customer.displayName).toBe("Jordan Lee");
    expect(model.byCustomerId["customer-1"]?.actions.map((action) => action.id)).toEqual(["pipeline", "hub", "guided"]);
    expect(model.byCustomerId["customer-2"]?.actions.every((action) => action.href.includes("crmReturnTo=%2Fcrm%3Fview%3Dcustomers"))).toBe(true);
    expect(model.byCustomerId["customer-1"]?.opportunityDiscovery).toBe(model.byCustomerId["customer-2"]?.opportunityDiscovery);
    expect(JSON.stringify(model)).not.toMatch(/maskedPhone|maskedEmail|customerNumber|forecastAmount|probability|stageId|commandId/);
  });
});
