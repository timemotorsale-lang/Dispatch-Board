import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "staff" }) }));
vi.mock("@/server/sales-documents/deal-drafts", () => ({ saveDealDeskDraft: mocks.save }));
vi.mock("@/server/sales-documents/deal-workbench", () => ({ listDealWorkbench: vi.fn() }));
vi.mock("@/server/sales-documents/deal-lifecycle", () => ({ manageDealLifecycle: vi.fn() }));
import { POST } from "@/app/api/crm/v1/deal-drafts/route";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
const request = () => new Request("http://localhost/api/crm/v1/deal-drafts", { method: "POST", body: JSON.stringify({ id: "existing-deal" }) });
describe("saved deal error recovery", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([["P2021", "required table or column"], ["P2028", "Retry saving this same deal"], ["P2003", "Re-select the linked record"]])("explains %s with a support reference", async (code, message) => {
    mocks.save.mockRejectedValue(Object.assign(new Error("Internal query and private deal data"), { code }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request()), body = await response.json();
      expect(response.status).toBe(503); expect(body.error).toContain(message); expect(body.code).toBe(code); expect(body.reference).toMatch(/^[a-f0-9]{8}$/);
      expect(body.error).not.toContain("private deal data"); expect(log).toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain("private deal data");
    } finally { log.mockRestore(); }
  });
  it("preserves the exact actionable validation message", async () => {
    mocks.save.mockRejectedValue(new SalesDocumentsError("Select the shared customer before saving.", 409));
    const response = await POST(request());
    expect(response.status).toBe(409); expect((await response.json()).error).toBe("Select the shared customer before saving.");
  });
});
