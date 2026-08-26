import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { rehearseUnifiedCrmPilotDataLoad } from "@/server/services/unified-crm-pilot-data-load-rehearsal-service";
import type { UnifiedCrmPilotDataLoadRehearsalRepository } from "@/server/repositories/unified-crm-pilot-data-load-rehearsal-repository";

const admin: AuthenticatedUser = {
  id: "admin-1",
  name: "Admin One",
  email: "admin@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = { ...admin, id: "seller-1", roles: ["Salesperson"] };
const now = new Date("2026-08-26T19:00:00.000Z");

function keySet(overrides: Partial<Record<"customerNumbers" | "emails" | "opportunityTitles" | "phones" | "sourceReferences" | "stockNumbers" | "vins", string[]>> = {}) {
  return {
    customerNumbers: new Set(overrides.customerNumbers ?? []),
    emails: new Set(overrides.emails ?? []),
    opportunityTitles: new Set(overrides.opportunityTitles ?? []),
    phones: new Set(overrides.phones ?? []),
    sourceReferences: new Set(overrides.sourceReferences ?? []),
    stockNumbers: new Set(overrides.stockNumbers ?? []),
    vins: new Set(overrides.vins ?? [])
  };
}

function repository(overrides: Partial<UnifiedCrmPilotDataLoadRehearsalRepository> = {}) {
  return {
    findExistingKeys: vi.fn(async () => keySet()),
    listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
    ...overrides
  } satisfies UnifiedCrmPilotDataLoadRehearsalRepository;
}

describe("Unified CRM pilot data load rehearsal", () => {
  it("returns a dry-run ready report with checksum, mapping, counts, and backup plan", async () => {
    const result = await rehearseUnifiedCrmPilotDataLoad(admin, {
      rows: [{ customerName: "Alex Morgan", email: "ALEX@EXAMPLE.TEST", opportunityTitle: "2019 Accord", sourceReference: "LEAD-1", vin: "1HGCV1F1XKA033428" }],
      sourceSystem: "pilot-sheet"
    }, { now: () => now, repository: repository() });

    expect(result).toMatchObject({
      counts: { duplicate: 0, invalid: 0, ready: 1, total: 1 },
      dryRun: true,
      state: "READY_FOR_ADMIN_REVIEW"
    });
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.outcomes[0].mapped).toMatchObject({ email: "alex@example.test", sourceReference: "LEAD-1" });
    expect(result.backupPlan.requiredBeforeLiveLoad).toBe(true);
  });

  it("blocks duplicates inside the batch and against existing CRM keys", async () => {
    const result = await rehearseUnifiedCrmPilotDataLoad(admin, {
      rows: [
        { customerName: "Alex Morgan", opportunityTitle: "2019 Accord", sourceReference: "LEAD-1", stockNumber: "STK-1" },
        { customerName: "Alex Morgan", opportunityTitle: "2019 Accord", sourceReference: "LEAD-1", stockNumber: "STK-2" }
      ],
      sourceSystem: "pilot-sheet"
    }, {
      now: () => now,
      repository: repository({ findExistingKeys: vi.fn(async () => keySet({ stockNumbers: ["STK-1"] })) })
    });

    expect(result.state).toBe("BLOCKED");
    expect(result.counts.duplicate).toBe(2);
    expect(result.outcomes.flatMap((outcome) => outcome.duplicateReasons).join(" ")).toContain("Existing CRM stock number match");
    expect(result.outcomes.flatMap((outcome) => outcome.duplicateReasons).join(" ")).toContain("Duplicate opportunity title inside rehearsal batch");
  });

  it("rejects malformed input and non-admin users", async () => {
    await expect(rehearseUnifiedCrmPilotDataLoad(seller, { rows: [], sourceSystem: "pilot" }, {
      repository: repository()
    })).rejects.toMatchObject({ code: "PILOT_DATA_LOAD_NOT_AUTHORIZED" });
    await expect(rehearseUnifiedCrmPilotDataLoad(admin, { rows: [], sourceSystem: "pilot" }, {
      repository: repository()
    })).rejects.toMatchObject({ code: "PILOT_DATA_LOAD_INVALID" });
  });
});
