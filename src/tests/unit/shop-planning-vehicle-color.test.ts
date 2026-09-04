import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createShopPlanningRepository } from "@/server/shop-planning/repository";

describe("repair ticket vehicle color loading", () => {
  it("requests persisted color and vehicle version when reopening a ticket and listing tickets", async () => {
    const vehicle = { id: "vehicle-1", color: "Gray", version: 4 };
    const findFirst = vi.fn().mockResolvedValue({ id: "ro-1", vehicle });
    const findMany = vi.fn().mockResolvedValue([{ id: "ro-1", vehicle }]);
    const db = { repairOrder: { findFirst, findMany }, user: { findMany: vi.fn().mockResolvedValue([]) } };
    const repository = createShopPlanningRepository(db as unknown as PrismaClient);
    expect((await repository.get("org-1", "ro-1"))?.vehicle.color).toBe("Gray");
    await repository.list("org-1");
    for (const query of [findFirst.mock.calls[0][0], findMany.mock.calls[0][0]]) {
      expect(query.where.organizationId).toBe("org-1");
      expect(query.include.vehicle.select).toMatchObject({ id: true, color: true, version: true });
    }
  });
});
