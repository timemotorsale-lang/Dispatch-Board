import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportsPage from "@/app/(app)/reports/page";
import InventoryReportsPage from "@/app/(app)/vehicles/reports/page";

const mocks = vi.hoisted(() => ({ inventory: vi.fn(), redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: async () => ({ id: "manager", name: "Manager", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } }) }));
vi.mock("@/server/inventory-governance/service", () => ({ getInventoryGovernanceConsole: mocks.inventory }));
vi.mock("@/features/reporting/reporting-console", () => ({ ReportingConsole: () => <div>Main reporting console</div> }));
vi.mock("@/features/inventory/governed-reports-workspace", () => ({ GovernedReportsWorkspace: () => <div>Secondary inventory scorecard</div> }));

describe("Reports landing route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.inventory.mockResolvedValue({}); mocks.redirect.mockImplementation(() => { throw new Error("Redirected"); }); });
  it("opens the main reporting console by default without reading the inventory scorecard", async () => {
    const html = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Main reporting console");
    expect(html).not.toContain("Secondary inventory scorecard");
    expect(mocks.inventory).not.toHaveBeenCalled();
  });
  it("routes legacy inventory report links into Inventory, not the reporting landing", async () => {
    await expect(ReportsPage({ searchParams: Promise.resolve({ scope: "inventory" }) })).rejects.toThrow("Redirected");
    expect(mocks.redirect).toHaveBeenCalledWith("/vehicles/reports");
    expect(mocks.inventory).not.toHaveBeenCalled();
  });
  it("keeps inventory reports on their own authorized route", async () => {
    const html = renderToStaticMarkup(await InventoryReportsPage());
    expect(html).toContain("Secondary inventory scorecard");
    expect(html).not.toContain("Main reporting console");
    expect(mocks.inventory).toHaveBeenCalledOnce();
  });
});
