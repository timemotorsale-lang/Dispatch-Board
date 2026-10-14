import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { createDispositionWholesaleRepository } from "@/server/disposition-wholesale/repository";

vi.mock("@/server/enterprise-command/aggregate-mutation", () => ({ executeAggregateMutation: async (database: unknown, _command: unknown, _topic: unknown, mutation: (database: unknown, version: number) => unknown) => mutation(database, 1), toJson: (value: unknown) => value }));
const command = { organizationId: "org", subjectId: "case" } as EnterpriseCommandCommitInput;
const data = { inventoryUnitId: "unit", ownerUserId: "staff", reasonCodes: ["AS_IS_SALE_REVIEW"], targetAt: new Date(), occurredAt: new Date(), recommendation: {}, asIsReview: { saleCondition: "AS_IS" as const, reconDecisionReason: "Not economical to repair", knownDefects: "Engine fault disclosed" } };
describe("as-is sale transaction guards", () => {
  it.each(["missing ownership", "stale intake cycle"])("rejects %s before creating a disposition record", async scenario => {
    const create = vi.fn();
    const database = { inventoryUnit: { findFirst: async () => ({ id: "unit", vehicleId: "vehicle" }) }, inventoryIntakeRevision: { findFirst: async () => ({ status: "CONFIRMED", inventoryUnitId: scenario === "stale intake cycle" ? "old-unit" : "unit" }) }, vehicleRelationship: { findFirst: async () => scenario === "missing ownership" ? null : { relationshipType: "DEALERSHIP_OWNED" } }, inventoryDispositionCase: { create } } as unknown as PrismaClient;
    await expect(createDispositionWholesaleRepository(database).create(command, data)).rejects.toThrow("Confirmed acquisition intake");
    expect(create).not.toHaveBeenCalled();
  });
});
