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
  it("returns a live transition model with only approved next stages", async () => {
    const model = await getUnifiedCrmOpportunityTransitionReview(manager, "review01", {
      accessContext: {
        actorUserId: "manager-a",
        capabilities: { read: true, create: true, transition: true, linkTask: false, linkAppointment: false, linkDispatch: false },
        fallbackHref: "/manager-workspace",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        workspace: "MANAGEMENT"
      },
      now: () => new Date("2026-08-14T19:30:00.000Z"),
      repository: {
        async findOpportunityDetail() {
          return {
            createdAt: new Date("2026-08-14T18:30:00.000Z"),
            customer: null,
            id: "opportunity-row-1",
            nextActionDueAt: new Date("2026-08-15T18:30:00.000Z"),
            nextActionLabel: "Call customer",
            opportunityNumber: "review01",
            organizationId: "org-a",
            ownerUser: { id: "manager-a", name: "CRM Manager" },
            sourceLead: null,
            stage: "NEW_INQUIRY",
            summary: null,
            title: "Accord opportunity",
            updatedAt: new Date("2026-08-14T18:30:00.000Z"),
            version: 2
          };
        }
      }
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-transition/v1",
      state: "LIVE_TRANSITION",
      requestedOpportunityId: "review01",
      currentState: { allowedNextStages: ["QUALIFIED", "LOST"], stage: "NEW_INQUIRY", version: 2 },
      transitionAction: { state: "READY" }
    });
    expect(model.transitionChecks).toHaveLength(4);
  });

  it("preserves owner-only visibility for a Sales viewer", async () => {
    await expect(getUnifiedCrmOpportunityTransitionReview(seller, "review01", {
      accessContext: {
        actorUserId: "seller-a",
        capabilities: { read: true, create: true, transition: true, linkTask: false, linkAppointment: false, linkDispatch: false },
        fallbackHref: "/my-tasks",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "OWNER", ownerUserId: "seller-a" },
        workspace: "SALES"
      },
      now: () => new Date("2026-08-14T19:30:00.000Z"),
      repository: {
        async findOpportunityDetail() {
          return {
            createdAt: new Date("2026-08-14T18:30:00.000Z"),
            customer: null,
            id: "opportunity-row-1",
            nextActionDueAt: null,
            nextActionLabel: null,
            opportunityNumber: "review01",
            organizationId: "org-a",
            ownerUser: { id: "seller-a", name: "Sales User" },
            sourceLead: null,
            stage: "WON",
            summary: null,
            title: "Owned opportunity",
            updatedAt: new Date("2026-08-14T18:30:00.000Z"),
            version: 4
          };
        }
      }
    })).resolves.toMatchObject({
      currentState: { allowedNextStages: [] },
      state: "LIVE_TRANSITION",
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
