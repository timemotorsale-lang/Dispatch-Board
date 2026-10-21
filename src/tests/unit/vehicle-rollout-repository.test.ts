import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";

const input = { actorUserId: "manager-1", organizationId: "org-1", locationId: null, code: "VEHICLE_REGISTRY", mode: "GENERAL" as const, rolloutPercent: 100, allowedUserIds: [], targetAt: null, expectedVersion: 0, correlationId: "repair-1", reason: "Configure missing registry control." };
const persisted = { ...input, id: "flag-1", version: 1, updatedAt: new Date() };

function setup(prior: typeof persisted | null = null) {
  const tx = {
    vehicleOperationsFeatureFlag: {
      findFirst: vi.fn().mockResolvedValue(prior),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirstOrThrow: vi.fn().mockResolvedValue(persisted)
    },
    location: { findFirst: vi.fn().mockResolvedValue(null) },
    vehicleOperationsRolloutEvent: { create: vi.fn() }
  };
  const database = { $transaction: vi.fn(async callback => callback(tx)) } as unknown as PrismaClient;
  return { tx, repository: createEnterpriseCommandRepository(database) };
}

describe("vehicle rollout configuration repair", () => {
  it("creates only the requested missing control and retains an audit event", async () => {
    const { tx, repository } = setup();
    expect(await repository.updateFeatureFlag(input)).toEqual(persisted);
    expect(tx.vehicleOperationsFeatureFlag.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", locationId: null, code: "VEHICLE_REGISTRY" } });
    expect(tx.vehicleOperationsFeatureFlag.createMany).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: "org-1", locationId: null, code: "VEHICLE_REGISTRY", version: 1, mode: "GENERAL", updatedByUserId: "manager-1" }), skipDuplicates: true });
    expect(tx.vehicleOperationsRolloutEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: "manager-1", action: "FEATURE_FLAG_CREATED", reason: input.reason, correlationId: "repair-1" }) });
    expect(tx.vehicleOperationsFeatureFlag.updateMany).not.toHaveBeenCalled();
  });

  it("does not overwrite a concurrently initialized control", async () => {
    const { tx, repository } = setup();
    tx.vehicleOperationsFeatureFlag.createMany.mockResolvedValue({ count: 0 });
    await expect(repository.updateFeatureFlag(input)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(tx.vehicleOperationsRolloutEvent.create).not.toHaveBeenCalled();
  });

  it("requires an exact version for existing and missing controls", async () => {
    const existing = setup(persisted);
    await expect(existing.repository.updateFeatureFlag(input)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    const missing = setup();
    await expect(missing.repository.updateFeatureFlag({ ...input, expectedVersion: 2 })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });

  it("uses an atomic version check when updating an existing control", async () => {
    const { tx, repository } = setup(persisted);
    tx.vehicleOperationsFeatureFlag.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.updateFeatureFlag({ ...input, expectedVersion: 1 })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(tx.vehicleOperationsFeatureFlag.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "flag-1", version: 1 } }));
    expect(tx.vehicleOperationsRolloutEvent.create).not.toHaveBeenCalled();
  });

  it("rejects another organization's location", async () => {
    const { repository } = setup();
    await expect(repository.updateFeatureFlag({ ...input, locationId: "other-location" })).rejects.toThrow("Location does not belong");
  });
});
