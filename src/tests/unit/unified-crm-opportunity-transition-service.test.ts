import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityTransitionReview } from "@/server/services/unified-crm-opportunity-transition-service";

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
  email: "seller@example.test",
  roles: ["Salesperson"]
};

describe("Unified CRM opportunity transition review service", () => {
  it("returns a held transition review without enabling live stage movement", async () => {
    const model = await getUnifiedCrmOpportunityTransitionReview(manager, "review01", {
      now: () => new Date("2026-08-14T19:30:00.000Z"),
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-transition/v1",
      state: "HELD_REVIEW",
      requestedOpportunityId: "review01",
      transitionAction: { state: "HELD" }
    });
    expect(model.transitionChecks).toHaveLength(4);
    expect(JSON.stringify(model)).not.toMatch(/nextStageId|transitionCommand|expectedVersion|evidencePayload/);
  });

  it("preserves owner-only visibility for a Sales viewer", async () => {
    await expect(getUnifiedCrmOpportunityTransitionReview(seller, "review01", {
      now: () => new Date("2026-08-14T19:30:00.000Z"),
      mode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).resolves.toMatchObject({
      state: "HELD_REVIEW",
      visibility: "owned"
    });
  });

  it("does not bypass the shell-off default when opportunity review mode is requested", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityTransitionReview(manager, "review01", {
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
