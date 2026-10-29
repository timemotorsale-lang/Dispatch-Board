import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { listings, execute, store, session } = vi.hoisted(() => ({ listings: vi.fn(), execute: vi.fn(), store: vi.fn(), session: vi.fn() }));
vi.mock("../src/server/listings", () => ({ getListings: listings }));
vi.mock("../src/server/preview-store", () => ({ execute, store, session, existingSession: vi.fn(), records: vi.fn() }));
vi.mock("../src/server/preview-security", () => ({ allowPreviewRequest: () => true }));
import { POST } from "../src/app/api/preview/route";

beforeEach(() => { vi.clearAllMocks(); execute.mockReturnValue({ reference: "preview-reference" }); session.mockReturnValue({ identifier: "sample-session", created: false }); });
const request = () => new NextRequest("http://127.0.0.1:3115/api/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "REQUEST", key: "12345678-1234-1234-1234-123456789abc", value: { kind: "PURCHASE", vehicleId: "sample-rav4" } }) });

describe("purchase intake rechecks availability before preview storage", () => {
  it.each(["RESERVED", "SOLD", "COMING_SOON", "EXPIRED", "MISSING"])("rejects %s without creating a session or request", async state => {
    listings.mockResolvedValue({ listings: state === "MISSING" ? [] : [{ id: "sample-rav4", availability: state === "EXPIRED" ? "AVAILABLE" : state, validUntil: state === "EXPIRED" ? "2000-01-01T00:00:00Z" : new Date(Date.now() + 60000).toISOString() }] });
    expect((await POST(request())).status).toBe(409);
    expect(execute).not.toHaveBeenCalled();
    expect(session).not.toHaveBeenCalled();
  });
  it("keeps an available request explicitly preview-only", async () => {
    listings.mockResolvedValue({ listings: [{ id: "sample-rav4", availability: "AVAILABLE", validUntil: new Date(Date.now() + 60000).toISOString() }] });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ preview: true, message: "Saved in this private preview. Not delivered to staff." });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
