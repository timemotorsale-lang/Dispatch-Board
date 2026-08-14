import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityPipelinePreview } from "@/server/services/unified-crm-opportunity-read-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = {
  ...manager,
  id: "seller-a",
  roles: ["Salesperson"]
};

describe("Unified CRM opportunity read service", () => {
  it("returns a held pipeline preview for organization visibility", async () => {
    const model = await getUnifiedCrmOpportunityPipelinePreview(manager, {
      now: () => new Date("2026-08-14T18:45:00.000Z"),
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-read/v1",
      state: "PREVIEW",
      visibility: "organization"
    });
    expect(model.columns).toHaveLength(3);
    expect(model.columns[0].items[0].detailHref).toContain("/crm/opportunities/review01");
  });

  it("reflects owned visibility for sales access", async () => {
    const model = await getUnifiedCrmOpportunityPipelinePreview(seller, {
      now: () => new Date("2026-08-14T18:45:00.000Z"),
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model.visibility).toBe("owned");
    expect(model.listPreview.heading).toContain("owned opportunity list");
  });
});
