import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/vehicle-evidence/sales-media/route";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), change: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "staff" }) }));
vi.mock("@/server/vehicle-360/service", () => ({ uploadVehicleEvidence: mocks.upload, changeVehicleSalesMedia: mocks.change, getVehicleSalesMedia: vi.fn() }));
const send = (changes = {}) => POST(new Request("http://local/api/vehicle-evidence/sales-media", { method: "POST", body: JSON.stringify({ action: "upload-intake", angle: "front_left", vehicleId: "v1", fileName: "IMG001.jpg", contentType: "image/jpeg", ...changes }) }));
beforeEach(() => { vi.resetAllMocks(); mocks.upload.mockResolvedValue({ evidence: { status: "AVAILABLE" } }); });
describe("consolidated intake uploads", () => {
  it("forces intake purpose and internal access despite forged client metadata", async () => {
    expect((await send({ subjectType: "SALES_MEDIA", accessLevel: "PUBLIC", relationship: "PUBLISH", category: "OTHER" })).status).toBe(201);
    expect(mocks.upload).toHaveBeenCalledWith({ id: "staff" }, expect.objectContaining({ fileName: "front_left-IMG001.jpg", subjectType: "INTAKE_PHOTO", subjectId: "v1", relationship: "SUPPORTS", category: "PHOTO", accessLevel: "INTERNAL" }));
  });
  it.each([{ angle: "forged" }, { fileName: "" }, { contentType: "video/mp4" }])("rejects invalid intake metadata %j before storage", async data => {
    expect((await send(data)).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("preserves capability and rollout rejection from the governed upload service", async () => {
    mocks.upload.mockRejectedValue(new Error("Vehicle 360 mutations are not enabled (MASTER_DISABLED)."));
    expect((await send()).status).toBe(403);
  });
});
