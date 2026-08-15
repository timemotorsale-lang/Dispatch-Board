import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-access";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

describe("Unified CRM opportunity access", () => {
  it("derives one authorized organization for read access", async () => {
    const result = await getUnifiedCrmOpportunityAccessContext(manager, "read", {
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });
    expect(result).toMatchObject({
      actorUserId: "manager-1",
      organizationId: "org-a",
      workspace: "MANAGEMENT",
      recordScope: { kind: "ORGANIZATION" }
    });
  });

  it.each([
    [[], "ORGANIZATION_SCOPE_UNAVAILABLE"],
    [["org-a", "org-b"], "ORGANIZATION_SCOPE_AMBIGUOUS"]
  ])("fails closed for organization scope %j", async (organizations, code) => {
    await expect(getUnifiedCrmOpportunityAccessContext(manager, "read", {
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return organizations; } }
    })).rejects.toMatchObject({ code });
  });

  it("keeps create access held even when a valid organization scope exists", async () => {
    await expect(getUnifiedCrmOpportunityAccessContext(manager, "create", {
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_MUTATION_HELD" });
  });
});
