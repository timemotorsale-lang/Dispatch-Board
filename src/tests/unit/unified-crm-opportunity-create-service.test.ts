import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityCreateReview } from "@/server/services/unified-crm-opportunity-create-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

describe("Unified CRM opportunity create review service", () => {
  it("returns a held create review without enabling live create", async () => {
    const model = await getUnifiedCrmOpportunityCreateReview(manager, {
      now: () => new Date("2026-08-14T19:15:00.000Z"),
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-create/v1",
      state: "HELD_REVIEW",
      createAction: { state: "HELD" }
    });
    expect(model.requiredInputs).toHaveLength(4);
  });
});
