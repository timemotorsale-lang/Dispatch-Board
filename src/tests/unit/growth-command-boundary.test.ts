import { describe, expect, it } from "vitest";

import { validateGrowthCommandBoundary } from "@/server/growth/command-boundary";

describe("growth command boundary", () => {
  it("allows governed Growth-only commands for authorized roles", () => {
    const validation = validateGrowthCommandBoundary({
      actorId: "user-1",
      actorRole: "Marketing Manager",
      idempotencyKey: "cmd-1",
      payload: { title: "Quote recovery" },
      reason: "Create a reviewable campaign plan.",
      requestedAt: "2026-09-07T12:00:00.000Z",
      scope: "campaign_plan"
    });

    expect(validation.allowed).toBe(true);
    expect(validation.boundary).toBe("GrowthOnly");
    expect(validation.failures).toEqual([]);
  });

  it("blocks external mutation scopes by default", () => {
    const validation = validateGrowthCommandBoundary({
      actorId: "user-1",
      actorRole: "Marketing Manager",
      idempotencyKey: "cmd-2",
      payload: { campaignId: "G-1" },
      reason: "Prepare CRM writeback review only.",
      requestedAt: "2026-09-07T12:00:00.000Z",
      scope: "crm_writeback_preview"
    });

    expect(validation.allowed).toBe(false);
    expect(validation.boundary).toBe("Crm");
    expect(validation.nextAction).toContain("Crm mutation is locked");
  });

  it("rejects roles that should not run manager commands", () => {
    const validation = validateGrowthCommandBoundary({
      actorId: "staff-1",
      actorRole: "Staff",
      idempotencyKey: "cmd-3",
      payload: { campaignId: "G-1" },
      reason: "Try to request launch lock.",
      requestedAt: "2026-09-07T12:00:00.000Z",
      scope: "launch_lock"
    });

    expect(validation.allowed).toBe(false);
    expect(validation.failures[0]).toBe("Staff cannot run launch_lock.");
  });
});
