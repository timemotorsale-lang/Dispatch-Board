import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmOpportunityDetailAccess } from "@/server/unified-crm/opportunity-detail-access";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = {
  ...manager,
  id: "seller-1",
  email: "seller@example.test",
  roles: ["Salesperson"]
};

describe("Unified CRM opportunity detail access", () => {
  it("returns read access when shell and opportunity review are enabled", async () => {
    const result = await requireUnifiedCrmOpportunityDetailAccess(manager, {
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });
    expect(result).toMatchObject({
      organizationId: "org-a",
      workspace: "MANAGEMENT",
      recordScope: { kind: "ORGANIZATION" }
    });
  });

  it("fails closed when the shell is off", async () => {
    await expect(requireUnifiedCrmOpportunityDetailAccess(manager, {
      nodeEnv: "production",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
  });

  it("preserves owner scope for a Sales viewer", async () => {
    await expect(requireUnifiedCrmOpportunityDetailAccess(seller, {
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).resolves.toMatchObject({
      actorUserId: "seller-1",
      organizationId: "org-a",
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" },
      workspace: "SALES"
    });
  });

  it("preserves authentication denial and never resolves organization scope", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(requireUnifiedCrmOpportunityDetailAccess(null, {
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
