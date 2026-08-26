import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { transitionUnifiedCrmOpportunity } from "@/server/services/unified-crm-opportunity-transition-command-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const accessContext = {
  actorUserId: "manager-a",
  capabilities: { read: true, create: true, transition: true, linkTask: false, linkAppointment: false, linkDispatch: false },
  fallbackHref: "/manager-workspace",
  mode: "REVIEW" as const,
  organizationId: "org-a",
  recordScope: { kind: "ORGANIZATION" as const },
  workspace: "MANAGEMENT" as const
};

describe("Unified CRM opportunity transition command service", () => {
  it("normalizes an active governed transition command", async () => {
    const repository = {
      transitionOpportunity: vi.fn(async ({ command }) => ({
        duplicate: false,
        fromStage: "NEW_INQUIRY" as const,
        id: "opportunity-row-1",
        nextActionDueAt: command.nextActionDueAt,
        nextActionLabel: command.nextActionLabel,
        opportunityNumber: command.opportunityId,
        stage: command.toStage,
        version: 3
      }))
    };

    const result = await transitionUnifiedCrmOpportunity(manager, "OPP-20260826170000", {
      expectedVersion: 2,
      idempotencyKey: "transition-1",
      nextActionDueAt: "2026-08-26T20:00:00.000Z",
      nextActionLabel: "Confirm appointment window",
      reason: "Customer has been qualified by sales.",
      toStage: "QUALIFIED"
    }, {
      accessContext,
      now: () => new Date("2026-08-26T17:00:00.000Z"),
      repository
    });

    expect(result).toMatchObject({
      contractVersion: "ucrm.opportunity-transition-command/v1",
      duplicate: false,
      opportunity: {
        fromStage: "NEW_INQUIRY",
        nextActionLabel: "Confirm appointment window",
        opportunityNumber: "OPP-20260826170000",
        stage: "QUALIFIED",
        version: 3
      }
    });
    expect(repository.transitionOpportunity).toHaveBeenCalledWith(expect.objectContaining({
      command: expect.objectContaining({
        commandType: "CRM_OPPORTUNITY_STAGE_TRANSITION",
        expectedVersion: 2,
        toStage: "QUALIFIED"
      })
    }));
  });

  it("requires close evidence for won opportunities and no active next action", async () => {
    await expect(transitionUnifiedCrmOpportunity(manager, "OPP-20260826170000", {
      expectedVersion: 2,
      idempotencyKey: "bad-won",
      nextActionDueAt: "2026-08-26T20:00:00.000Z",
      nextActionLabel: "Should not remain active",
      reason: "Customer accepted the offer.",
      toStage: "WON"
    }, {
      accessContext,
      now: () => new Date("2026-08-26T17:00:00.000Z"),
      repository: { transitionOpportunity: vi.fn() }
    })).rejects.toMatchObject({ code: "INVALID_OPPORTUNITY_TRANSITION" });
  });

  it("requires a lost reason for lost opportunities", async () => {
    await expect(transitionUnifiedCrmOpportunity(manager, "OPP-20260826170000", {
      expectedVersion: 2,
      idempotencyKey: "bad-lost",
      reason: "Customer chose another vehicle.",
      toStage: "LOST"
    }, {
      accessContext,
      now: () => new Date("2026-08-26T17:00:00.000Z"),
      repository: { transitionOpportunity: vi.fn() }
    })).rejects.toMatchObject({ code: "INVALID_OPPORTUNITY_TRANSITION" });
  });

  it("maps repository version conflicts to typed transition errors", async () => {
    const conflict = Object.assign(new Error("stale"), { code: "VERSION_CONFLICT" });
    await expect(transitionUnifiedCrmOpportunity(manager, "OPP-20260826170000", {
      expectedVersion: 2,
      idempotencyKey: "stale-transition",
      nextActionDueAt: "2026-08-26T20:00:00.000Z",
      nextActionLabel: "Call customer",
      reason: "Attempt from a stale screen.",
      toStage: "QUALIFIED"
    }, {
      accessContext,
      now: () => new Date("2026-08-26T17:00:00.000Z"),
      repository: { transitionOpportunity: vi.fn(async () => { throw conflict; }) }
    })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
});
