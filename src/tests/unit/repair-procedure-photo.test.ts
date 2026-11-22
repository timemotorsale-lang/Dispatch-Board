import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadRepairProcedurePhoto } from "@/server/vehicle-360/service";
import { repairProcedurePhotoSubject } from "@/server/shop-execution/procedure-photo";

const { findJob, createEvidence } = vi.hoisted(() => ({ findJob: vi.fn(), createEvidence: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { repairJob: { findFirst: findJob } } }));
vi.mock("@/server/vehicle-360/repository", () => ({ createVehicle360Repository: () => ({ createEvidence }) }));
vi.mock("@/server/enterprise-command/repository", () => ({
  createEnterpriseCommandRepository: () => ({
    listCapabilityGrants: async () => [],
    listFeatureFlags: async () => ["VEHICLE_OPERATIONS_MASTER", "SHOP_OPERATIONS"].map(code =>
      ({ code, mode: "GENERAL", rolloutPercent: 100, locationId: null, allowedUserIds: [] })),
  }),
}));

const mechanic = { id: "assigned-mechanic", name: "Mechanic", email: "mechanic@example.test", isActive: true,
  roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const job = {
  repairOrder: { vehicleId: "job-vehicle", locationId: "shop" },
  dispatches: [{ id: "active-dispatch" }],
  procedureVersion: { requiredEvidence: ["After photo", "Final measurement"] },
};

function photo(requirement = "After photo") {
  const form = new FormData();
  form.set("photo", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "repair.jpg", { type: "image/jpeg" }));
  form.set("requirement", requirement);
  form.set("idempotencyKey", "upload-123");
  form.set("vehicleId", "unrelated-vehicle");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  findJob.mockResolvedValue(job);
});

describe("assigned technician procedure photo", () => {
  it("stores the required photo on the vehicle linked to the active job", async () => {
    await uploadRepairProcedurePhoto(mechanic, "job-id", photo());
    expect(findJob).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ dispatches: expect.objectContaining({
        where: { technicianUserId: mechanic.id, position: "CURRENT", status: "ACTIVE" },
      }) }),
    }));
    expect(createEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      vehicleId: "job-vehicle", ...repairProcedurePhotoSubject("job-id", "After photo"), accessLevel: "INTERNAL",
    }));
    expect(repairProcedurePhotoSubject("job-id", "After photo")).not.toEqual(repairProcedurePhotoSubject("job-id", "Before photo"));
    expect(repairProcedurePhotoSubject("job-id", "After photo")).not.toEqual(repairProcedurePhotoSubject("another-job", "After photo"));
  });

  it("rejects an unassigned technician or an item without a required photo", async () => {
    findJob.mockResolvedValueOnce({ ...job, dispatches: [] });
    await expect(uploadRepairProcedurePhoto(mechanic, "job-id", photo())).rejects.toThrow("Only the assigned technician");
    await expect(uploadRepairProcedurePhoto(mechanic, "job-id", photo("Final measurement"))).rejects.toThrow("Choose a photo required");
    expect(createEvidence).not.toHaveBeenCalled();
  });
});
