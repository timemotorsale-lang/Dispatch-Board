import { describe, expect, it, vi } from "vitest";

import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import { createVehicleRegistryRepository } from "@/server/vehicle-registry/repository";

const command = {
  actorUserId: "manager-1",
  commandType: "CORRECT_VEHICLE_COLOR",
  correlationId: "corr-1",
  domain: "VEHICLE_REGISTRY",
  expectedVersion: 0,
  idempotencyKey: "color-1",
  locationId: "location-1",
  organizationId: "org-1",
  payload: { color: "Silver" },
  reason: "Record missing vehicle color from the repair order vehicle card.",
  requestHash: "hash-1",
  subjectId: "vehicle-1",
  subjectType: "VEHICLE",
};

function database(aggregateVersion = 2) {
  const tx = {
    enterpriseAggregateVersion: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: "aggregate-1", version: aggregateVersion }), update: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    enterpriseCommandLedger: { create: vi.fn().mockResolvedValue({ id: "command-1" }), findUnique: vi.fn().mockResolvedValue(null) },
    enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
    enterpriseOutboxMessage: { create: vi.fn() },
    location: { findFirst: vi.fn().mockResolvedValue({ id: "location-1" }) },
    vehicle: {
      findFirstOrThrow: vi.fn().mockResolvedValue({ color: null, id: "vehicle-1" }),
      update: vi.fn().mockResolvedValue({ color: "Silver", id: "vehicle-1" }),
    },
  };
  return { db: { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) }, tx };
}

describe("vehicle registry repository", () => {
  it("saves vehicle color permanently even when the page version is behind the command ledger", async () => {
    const { db, tx } = database(2);
    const repository = createVehicleRegistryRepository(db as never);

    const result = await repository.correctColor(command, "Silver");

    expect(tx.vehicle.update).toHaveBeenCalledWith({ where: { id: "vehicle-1" }, data: { color: "Silver", version: 3 } });
    expect(tx.enterpriseAggregateVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ version: 3 }),
    }));
    expect(result).toMatchObject({ result: { color: "Silver", id: "vehicle-1", version: 3 }, version: 3 });
  });

  it("keeps strict version protection for vehicle identity corrections", async () => {
    const { db } = database(2);
    const repository = createVehicleRegistryRepository(db as never);

    await expect(repository.correctIdentity({ ...command, commandType: "CORRECT_VEHICLE_IDENTITY" }, {
      color: null,
      licensePlate: null,
      licensePlateNormalized: null,
      licensePlateState: null,
      make: "Mazda",
      model: "CX-30",
      nonVinReason: null,
      stockNumber: null,
      stockNumberNormalized: null,
      vehicleNumber: "VEH-1",
      vin: null,
      vinRaw: null,
      vinState: "NON_VIN_EXCEPTION",
      vinValidationSource: "MANUAL",
      year: 2021,
    })).rejects.toBeInstanceOf(EnterpriseCommandConflictError);
  });
});
