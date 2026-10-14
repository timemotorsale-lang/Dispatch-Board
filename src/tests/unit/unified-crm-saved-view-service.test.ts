import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmSavedView,
  deleteUnifiedCrmSavedView,
  getUnifiedCrmSavedView,
  listUnifiedCrmSavedViews
} from "@/server/services/unified-crm-saved-view-service";
import type { UnifiedCrmSavedViewRecord, UnifiedCrmSavedViewRepository } from "@/server/repositories/unified-crm-saved-view-repository";
import { normalizeUnifiedCrmSavedViewConfig } from "@/server/unified-crm/saved-view-contract";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller: AuthenticatedUser = {
  id: "seller-1",
  name: "Seller One",
  email: "seller@example.test",
  isActive: true,
  roles: ["Salesperson"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

function record(overrides: Partial<UnifiedCrmSavedViewRecord> = {}): UnifiedCrmSavedViewRecord {
  return {
    config: { dateWindow: "TODAY", includeArchived: false, ownerFilter: "MINE", query: " accord ", sort: "NEXT_ACTION_ASC", stages: ["QUALIFIED"], tab: "pipeline" },
    configSchemaVersion: 1,
    createdAt: new Date("2026-08-26T13:00:00.000Z"),
    createdByUser: { id: seller.id, name: seller.name },
    id: "view-1",
    name: "My Accord follow-up",
    updatedAt: new Date("2026-08-26T13:05:00.000Z"),
    version: 1,
    visibility: "PERSONAL",
    ...overrides
  };
}

function repository(stored: UnifiedCrmSavedViewRecord | null = record()) {
  return {
    create: vi.fn(async (input) => record({ config: input.config, createdByUser: { id: input.createdByUserId, name: input.createdByUserId }, name: input.name, visibility: input.visibility })),
    find: vi.fn(async () => stored),
    list: vi.fn(async () => (stored ? [stored] : [])),
    listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
    remove: vi.fn(async () => undefined)
  } satisfies UnifiedCrmSavedViewRepository;
}

describe("Unified CRM saved views", () => {
  it("normalizes governed filters and recovers malformed optional fields", () => {
    expect(normalizeUnifiedCrmSavedViewConfig({
      dateWindow: "OVERDUE",
      includeArchived: true,
      ownerFilter: "MINE",
      query: "  Pilot Accord  ",
      sort: "VALUE_DESC",
      stages: ["QUALIFIED", "BOGUS", "QUALIFIED"],
      tab: "pipeline"
    })).toEqual({
      dateWindow: "OVERDUE",
      includeArchived: true,
      ownerFilter: "MINE",
      query: "Pilot Accord",
      sort: "VALUE_DESC",
      stages: ["QUALIFIED"],
      tab: "pipeline"
    });
  });

  it("lets sellers create personal CRM views but denies team sharing", async () => {
    const repo = repository(null);
    await expect(createUnifiedCrmSavedView(seller, {
      config: { tab: "work", ownerFilter: "MINE" },
      name: "Mine",
      visibility: "PERSONAL"
    }, { repository: repo })).resolves.toMatchObject({ name: "Mine", visibility: "PERSONAL" });

    await expect(createUnifiedCrmSavedView(seller, {
      config: { tab: "pipeline" },
      name: "Team pipeline",
      visibility: "TEAM"
    }, { repository: repo })).rejects.toMatchObject({ code: "SAVED_VIEW_FORBIDDEN" });
  });

  it("allows managers to share team views and delete team views", async () => {
    const repo = repository(record({ createdByUser: { id: seller.id, name: seller.name }, visibility: "TEAM" }));
    await expect(createUnifiedCrmSavedView(manager, {
      config: { dateWindow: "NEXT_7_DAYS", ownerFilter: "ANY", tab: "work" },
      name: "Team next seven",
      visibility: "TEAM"
    }, { repository: repo })).resolves.toMatchObject({ visibility: "TEAM" });

    await deleteUnifiedCrmSavedView(manager, "view-1", { repository: repo });
    expect(repo.remove).toHaveBeenCalledWith({ id: "view-1", organizationId: "org-1" });
  });

  it("lists only repository-authorized views and recovers invalid stored filters", async () => {
    const repo = repository(record({ config: { tab: "retired", stages: ["RETIRED"] }, configSchemaVersion: 99 }));
    await expect(listUnifiedCrmSavedViews(seller, { repository: repo })).resolves.toMatchObject({
      savedViews: [
        expect.objectContaining({
          recoveryNotice: expect.stringContaining("safe defaults"),
          tab: "work"
        })
      ]
    });
    await expect(getUnifiedCrmSavedView(seller, "view-1", { repository: repo })).resolves.toMatchObject({
      recoveryNotice: expect.stringContaining("safe defaults")
    });
  });

  it("protects delete ownership for personal views", async () => {
    await expect(deleteUnifiedCrmSavedView(seller, "view-1", {
      repository: repository(record({ createdByUser: { id: "other-seller", name: "Other Seller" }, visibility: "PERSONAL" }))
    })).rejects.toMatchObject({ code: "SAVED_VIEW_FORBIDDEN" });
  });
});
