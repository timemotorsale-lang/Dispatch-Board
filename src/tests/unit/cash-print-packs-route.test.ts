import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ actor: vi.fn(), list: vi.fn(), change: vi.fn(), policy: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: m.actor }));
vi.mock("@/server/sales-documents/cash-print-packs", () => ({ listCashPrintPacks: m.list, changeCashPrintPack: m.change, setCashPrintPackPolicy: m.policy }));
import { GET, POST, PATCH } from "@/app/api/crm-next/cash-print-packs/route";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
const actor = { id: "staff" };
describe("cash print pack HTTP boundary", () => {
  beforeEach(() => { vi.resetAllMocks(); m.actor.mockResolvedValue(actor); m.list.mockResolvedValue({ packs: [] }); m.change.mockResolvedValue({ pack: { id: "pack" } }); });
  it("returns private uncached pack data", async () => { const response = await GET(); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(response.headers.get("vary")).toBe("Cookie"); });
  it("rejects cross-site pack changes before calling the service", async () => {
    const response = await POST(new Request("https://crm.example.test/api/crm-next/cash-print-packs", { method: "POST", headers: { origin: "https://outside.example.test" }, body: "{}" }));
    expect(response.status).toBe(403); expect(m.change).not.toHaveBeenCalled();
  });
  it("routes manager permission updates to the server permission check", async () => {
    m.policy.mockRejectedValue(new SalesDocumentsError("Managers only", 403));
    const response = await PATCH(new Request("https://crm.example.test/api/crm-next/cash-print-packs", { method: "PATCH", headers: { origin: "https://crm.example.test", "content-type": "application/json" }, body: JSON.stringify({ action: "SET_POLICY", staffCanEdit: false, updatedAt: null }) }));
    expect(response.status).toBe(403); expect(m.policy).toHaveBeenCalledWith(actor, expect.objectContaining({ staffCanEdit: false })); expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
