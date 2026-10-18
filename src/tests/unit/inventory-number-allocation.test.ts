import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { allocateInventoryNumber, inventoryNumberBase } from "@/server/inventory-unit/number-allocation";

describe("automatic inventory numbers", () => {
  function fixture(numbers: string[] = [], duplicate: unknown = null) {
    const transaction = { $executeRaw: vi.fn().mockResolvedValue(1), inventoryUnit: { findMany: vi.fn().mockResolvedValue(numbers.map(inventoryNumber => ({ inventoryNumber }))), findFirst: vi.fn().mockResolvedValue(duplicate) } };
    return { transaction, database: transaction as unknown as Pick<Prisma.TransactionClient, "$executeRaw" | "inventoryUnit"> };
  }

  it("uses the last six VIN characters, including letters", () => {
    expect(inventoryNumberBase("3FA6P0K91HR406095", "vehicle-1")).toBe("406095");
    expect(inventoryNumberBase(" abcdefgh1234abcde ", "vehicle-1")).toBe("4ABCDE");
  });

  it("uses a stable fallback only when no valid-format VIN is available", () => {
    expect(inventoryNumberBase(null, "vehicle-12345678")).toBe("INV-12345678");
    expect(inventoryNumberBase("invalid", "vehicle-12345678")).toBe("INV-12345678");
  });

  it.each([ [[], "406095"], [["406095"], "406095-2"], [["406095", "406095-2", "406095-4"], "406095-3"] ] as [string[], string][])("adds the first available short suffix: %j", async (used, expected) => {
    const { database, transaction } = fixture(used);
    expect(await allocateInventoryNumber(database, "org-1", { id: "vehicle", vin: "3FA6P0K91HR406095" }, null)).toBe(expected);
    expect(transaction.$executeRaw).toHaveBeenCalledOnce();
    expect(transaction.inventoryUnit.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-1", inventoryNumber: { startsWith: "406095", mode: "insensitive" } }, select: { inventoryNumber: true } });
  });

  it("does not collide with closed inventory numbers or existing custom numbers", async () => {
    const { database } = fixture(["4abcde", "4ABCDE-2"]);
    expect(await allocateInventoryNumber(database, "org-1", { id: "vehicle", vin: "ABCDEFGH1234ABCDE" }, null)).toBe("4ABCDE-3");
  });

  it("preserves an explicit custom number and rejects a duplicate rather than renaming it", async () => {
    expect(await allocateInventoryNumber(fixture().database, "org-1", { id: "vehicle" }, "MY-STOCK")).toBe("MY-STOCK");
    await expect(allocateInventoryNumber(fixture([], { id: "existing" }).database, "org-1", { id: "vehicle" }, "MY-STOCK")).rejects.toThrow("already in use");
  });
});
