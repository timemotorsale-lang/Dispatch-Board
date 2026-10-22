import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({ actor: vi.fn(), extract: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: dependencies.actor }));
vi.mock("@/server/document-library/text-extraction", () => ({ extractDocumentText: dependencies.extract }));
import { POST } from "@/app/api/document-library/id-front/route";

function request(origin = "http://localhost", mime = "image/jpeg", bytes = new Uint8Array([255, 216, 255, 224])) {
  const form = new FormData(); form.append("file", new File([bytes], "front.jpg", { type: mime }));
  return new Request("http://localhost/api/document-library/id-front", { method: "POST", headers: { origin }, body: form });
}
beforeEach(() => {
  vi.resetAllMocks(); dependencies.actor.mockResolvedValue({ id: "staff-1", isActive: true, roles: [], duties: { all: [] } });
  dependencies.extract.mockResolvedValue({ text: "Name: JAMIE EXAMPLE\nID number: TEST1234\nDOB: 04/21/1990", method: "OCR_TEXT", warnings: [] });
});
describe("front-of-ID OCR endpoint", () => {
  it("requires sign-in and an active account before reading files", async () => {
    dependencies.actor.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    dependencies.actor.mockResolvedValue({ id: "staff-1", isActive: false });
    expect((await POST(request())).status).toBe(403);
    expect(dependencies.extract).not.toHaveBeenCalled();
  });
  it("makes front-of-ID OCR available without a document role or rollout gate", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(dependencies.extract).toHaveBeenCalledOnce();
  });
  it("rejects cross-origin and invalid image payloads", async () => {
    expect((await POST(request("https://unrelated.example"))).status).toBe(403);
    expect((await POST(request("http://localhost", "image/jpeg", new Uint8Array([1, 2, 3])))).status).toBe(400);
    expect(dependencies.extract).not.toHaveBeenCalled();
  });
  it("rejects an oversized request before running OCR", async () => {
    const oversized = new Request("http://localhost/api/document-library/id-front", { method: "POST", headers: { "content-length": "10000000" }, body: "not parsed" });
    expect((await POST(oversized)).status).toBe(413);
    expect(dependencies.extract).not.toHaveBeenCalled();
  });
  it("returns non-cacheable field suggestions without raw OCR text", async () => {
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.fields.licenseNumber).toBe("TEST1234");
    expect(body.needsReview).toBe(true);
    expect(body).not.toHaveProperty("text");
    expect(body).not.toHaveProperty("extractedText");
  });
});
