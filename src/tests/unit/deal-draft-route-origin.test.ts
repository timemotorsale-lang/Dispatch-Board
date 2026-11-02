import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), lifecycle: vi.fn(), operations: vi.fn(), archive: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/sales-documents/deal-drafts", () => ({ archiveDuplicateDealDraft: mocks.archive }));
vi.mock("@/server/sales-documents/deal-workbench", () => ({ listDealWorkbench: vi.fn() }));
vi.mock("@/server/sales-documents/deal-lifecycle", () => ({ manageDealLifecycle: mocks.lifecycle }));
vi.mock("@/server/sales-documents/dashboard-operations", () => ({ manageDealOperations: mocks.operations, readDealOperations: vi.fn() }));
import { PATCH } from "@/app/api/crm/v1/deal-drafts/route";
import { SalesDocumentsError } from "@/server/sales-documents/domain";

const publicHost = "dispatch-board.tail0d2437.ts.net";
const body = { action: "MARK_SOLD", id: "existing-deal", revision: 3 };
function request(headers: Record<string, string>, action = "MARK_SOLD") {
  return new Request("http://localhost:3000/api/crm/v1/deal-drafts", { method: "PATCH", headers, body: JSON.stringify({ ...body, action }) });
}
const proxyHeaders = { host: publicHost, origin: `https://${publicHost}`, "sec-fetch-site": "same-origin" };

describe("saved deal actions behind the production proxy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "staff" });
    mocks.lifecycle.mockResolvedValue({ id: body.id, status: "SOLD", revision: 4 });
    mocks.operations.mockResolvedValue({ id: body.id });
    mocks.archive.mockResolvedValue({ id: body.id, status: "ARCHIVED" });
  });
  it("passes the same existing deal to the sold transaction when HTTPS terminates before Next.js", async () => {
    const response = await PATCH(request(proxyHeaders));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: body.id, status: "SOLD", revision: 4 });
    expect(mocks.lifecycle).toHaveBeenCalledWith({ id: "staff" }, body);
    expect(mocks.archive).not.toHaveBeenCalled();
  });
  it.each(["PREPARE_PAPERWORK", "FINISH", "REOPEN", "REQUEST_UNWIND", "DEAL_REMINDER", "DEAL_REASSIGN", "DEAL_FINANCIAL", "DEAL_MILESTONE", "ARCHIVE_DUPLICATE"])("allows %s through the same proxy without bypassing its service", async action => {
    expect((await PATCH(request(proxyHeaders, action))).status).toBe(200);
    const handler = action === "ARCHIVE_DUPLICATE" ? mocks.archive : action.startsWith("DEAL_") ? mocks.operations : mocks.lifecycle;
    expect(handler).toHaveBeenCalledWith({ id: "staff" }, { ...body, action });
  });
  it("supports direct local development requests", async () => {
    expect((await PATCH(request({ origin: "http://localhost:3000" }))).status).toBe(200);
  });
  it.each([
    { ...proxyHeaders, origin: "https://another.example" },
    { ...proxyHeaders, origin: `https://${publicHost}:8443` },
    { ...proxyHeaders, origin: "null" },
    { ...proxyHeaders, origin: "malformed" },
    { ...proxyHeaders, origin: `ftp://${publicHost}` },
    { ...proxyHeaders, "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "cross-site" },
    { origin: "https://another.example", "x-forwarded-host": "another.example" },
  ])("rejects untrusted requests before reading or changing a deal: %j", async headers => {
    const response = await PATCH(request(headers));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("Reload this deal");
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.lifecycle).not.toHaveBeenCalled();
    expect(mocks.archive).not.toHaveBeenCalled();
    expect(mocks.operations).not.toHaveBeenCalled();
  });
  it("preserves lifecycle authorization failures after accepting the public host", async () => {
    mocks.lifecycle.mockRejectedValue(new SalesDocumentsError("This deal is not available to your account.", 403));
    const response = await PATCH(request(proxyHeaders));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("This deal is not available to your account.");
  });
});
