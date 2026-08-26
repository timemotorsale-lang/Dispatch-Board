import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { createUnifiedCrmOpportunity } from "@/server/services/unified-crm-opportunity-create-command-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

describe("Unified CRM opportunity create command service", () => {
  it("normalizes a governed NEW_INQUIRY create command", async () => {
    const repository = {
      createOpportunity: vi.fn(async ({ command }) => ({
        customerId: command.customerId,
        duplicate: false,
        estimatedValueCents: command.estimatedValueCents,
        expectedCloseAt: command.expectedCloseAt,
        id: "opportunity-row-1",
        nextActionDueAt: command.nextActionDueAt,
        nextActionLabel: command.nextActionLabel,
        opportunityNumber: command.opportunityNumber,
        ownerUserId: command.ownerUserId,
        sourceLeadId: command.sourceLeadId,
        stage: command.stage,
        summary: command.summary,
        title: command.title,
        version: 1
      }))
    };

    const result = await createUnifiedCrmOpportunity(manager, {
      customerId: "customer-1",
      estimatedValueCents: 1850000,
      idempotencyKey: "create-opportunity-1",
      nextActionDueAt: "2026-08-26T18:00:00.000Z",
      nextActionLabel: "Call customer with Accord options",
      ownerUserId: "manager-a",
      summary: "Customer is interested in a 2019 Honda Accord.",
      title: "2019 Honda Accord customer follow-up"
    }, {
      accessContext: {
        actorUserId: "manager-a",
        capabilities: { read: true, create: true, transition: false, linkTask: false, linkAppointment: false, linkDispatch: false },
        fallbackHref: "/manager-workspace",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        workspace: "MANAGEMENT"
      },
      now: () => new Date("2026-08-26T17:00:00.000Z"),
      repository
    });

    expect(result.opportunity).toMatchObject({
      customerId: "customer-1",
      href: expect.stringContaining("/crm/opportunities/OPP-20260826170000"),
      nextActionLabel: "Call customer with Accord options",
      ownerUserId: "manager-a",
      stage: "NEW_INQUIRY",
      title: "2019 Honda Accord customer follow-up"
    });
    expect(repository.createOpportunity).toHaveBeenCalledWith(expect.objectContaining({
      command: expect.objectContaining({
        commandType: "CRM_OPPORTUNITY_CREATE",
        opportunityNumber: "OPP-20260826170000",
        stage: "NEW_INQUIRY"
      })
    }));
  });

  it("requires customer or source-lead context, owner, next action, and due time", async () => {
    await expect(createUnifiedCrmOpportunity(manager, {
      idempotencyKey: "bad-create",
      nextActionDueAt: "2026-08-26T18:00:00.000Z",
      nextActionLabel: "Call customer",
      ownerUserId: "manager-a",
      title: "Missing customer"
    }, {
      accessContext: {
        actorUserId: "manager-a",
        capabilities: { read: true, create: true, transition: false, linkTask: false, linkAppointment: false, linkDispatch: false },
        fallbackHref: "/manager-workspace",
        mode: "REVIEW",
        organizationId: "org-a",
        recordScope: { kind: "ORGANIZATION" },
        workspace: "MANAGEMENT"
      },
      now: () => new Date("2026-08-26T17:00:00.000Z"),
      repository: { createOpportunity: vi.fn() }
    })).rejects.toMatchObject({ code: "INVALID_OPPORTUNITY_COMMAND" });
  });

  it("keeps opportunity create closed when the policy is off", async () => {
    await expect(createUnifiedCrmOpportunity(manager, {
      customerId: "customer-1",
      idempotencyKey: "off-create",
      nextActionDueAt: "2026-08-26T18:00:00.000Z",
      nextActionLabel: "Call customer",
      ownerUserId: "manager-a",
      title: "Off create"
    }, {
      mode: "OFF",
      now: () => new Date("2026-08-26T17:00:00.000Z"),
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
  });
});
