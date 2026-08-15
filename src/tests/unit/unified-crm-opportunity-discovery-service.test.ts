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
      now: () => new Date("2026-08-15T03:00:00.000Z")
    });

    expect(model.contractVersion).toBe("ucrm.opportunity-discovery/v1");
    expect(model.state).toBe("HELD_REVIEW");
    expect(model.visibility).toBe(scope);
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
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
