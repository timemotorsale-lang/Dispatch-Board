import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), execute: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/deal-continuity/test-drive", () => ({ executeTestDrive: mocks.execute, readTestDrive: vi.fn() }));

import { POST } from "@/app/api/crm/v1/test-drives/[id]/route";

const context = { params: Promise.resolve({ id: "test-drive-draft" }) };
const body = { action: "GENERATE", operationKey: "test-operation" };
const publicHost = "dispatch-board.example";
const proxyHeaders = { host: publicHost, origin: `https://${publicHost}`, "sec-fetch-site": "same-origin" };
const request = (headers: Record<string, string>) => new Request("http://localhost:3000/api/crm/v1/test-drives/test-drive-draft", { method: "POST", headers, body: JSON.stringify(body) });

describe("test drive print request origin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "staff" });
    mocks.execute.mockResolvedValue({ agreement: { id: "prepared-agreement" } });
  });
  it.each([proxyHeaders, { origin: "http://localhost:3000" }])("generates the agreement from the app: %j", async headers => {
    const response = await POST(request(headers), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ agreement: { id: "prepared-agreement" } });
    expect(mocks.execute).toHaveBeenCalledWith({ id: "staff" }, "test-drive-draft", body);
  });
  it.each([
    { ...proxyHeaders, origin: "https://another.example" },
    { ...proxyHeaders, origin: `https://${publicHost}:8443` },
    { ...proxyHeaders, origin: "null" },
    { ...proxyHeaders, "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "cross-site" },
    { origin: "https://another.example", "x-forwarded-host": "another.example" }
  ])("rejects foreign requests before loading the user or generating paperwork: %j", async headers => {
    expect((await POST(request(headers), context)).status).toBe(403);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
