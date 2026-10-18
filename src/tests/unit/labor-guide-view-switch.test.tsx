import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { LaborGuideViewSwitch, laborGuideHref } from "@/features/diagnostics/labor-guide-view-switch";
import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";

vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: async () => ({ id: "reviewer" }) }));
vi.mock("@/server/repair-order/service", () => ({ listRepairOrders: async () => ({ items: [] }), getRepairOrderDetail: async () => null }));
vi.mock("@/server/services/labor-catalog-settings", () => ({ getConnectedCatalogSystems: async () => ({ allowedSystemIds: ["brakes", "steering"] }) }));
vi.mock("@/server/services/labor-rate-settings", () => ({ getActiveLaborRate: async () => ({ laborRate: 125, policyId: "policy", policyVersion: 1 }) }));
vi.mock("@/server/policies/access", () => ({ canManageSettings: () => false }));

vi.mock("next/navigation", async importOriginal => ({ ...await importOriginal<typeof import("next/navigation")>(), redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));

import Page from "@/app/(app)/diagnostics/labor-guide/page";
import PrototypePage from "@/app/(app)/prototype/labor-guide/page";

describe("staff labor-guide review switch", () => {
  it.each([
    [{}, "legacy"],
    [{ guide: "unknown" }, "legacy"],
    [{ guide: "legacy" }, "legacy"],
    [{ guide: "legacy", importExplorer: "1", experience: "explorer" }, "legacy"],
  ] as const)("resolves the requested view without adopting a global preference: %j", async (params, expected) => {
    const page = await Page({ searchParams: Promise.resolve(params) });
    expect(page.props.initialGuideView).toBe(expected);
  });
  it.each([{ guide: "new" }, { experience: "explorer" }])("redirects older new-guide links to the separate prototype: %j", async params => {
    await expect(Page({ searchParams: Promise.resolve(params) })).rejects.toThrow("Redirect:/prototype/repair-explorer");
  });
  it("keeps deliberate document imports on the official worksheet", async () => {
    await expect(Page({ searchParams: Promise.resolve({ importExplorer: "1" }) })).rejects.toThrow("Redirect:/prototype/labor-guide?importExplorer=1");
  });
  it("uses different page identities and preserves the requested return context", async () => {
    const legacy = await Page({ searchParams: Promise.resolve({ guide: "legacy", returnTo: "/my-tasks" }) });
    const review = await PrototypePage({ searchParams: Promise.resolve({ returnTo: "/my-tasks" }) });
    expect(legacy.key).not.toBe(review.key);
    expect(review.props.initialGuideView).toBe("new");
    expect(review.props.returnTo).toBe("/my-tasks");
  });
  it("uses accessible current-page links and disables navigation while a request is running", () => {
    const markup = renderToStaticMarkup(<LaborGuideViewSwitch view="new" disabled repairOrderId="ro/1" />);
    expect(markup).toContain('aria-label="Labor guide navigation"');
    expect(markup).toContain('aria-current="page"');
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(markup).toContain("prototype uses a browser draft");
    expect(markup).toContain('href="/prototype/repair-explorer?repairOrderId=ro%2F1"');
    expect(markup).toContain('href="/diagnostics/labor-guide?repairOrderId=ro%2F1"');
    expect(markup.match(/target="_blank"/g)).toHaveLength(2);
    expect(laborGuideHref("new")).toBe("/prototype/repair-explorer");
  });
  it("does not mark the downstream document worksheet as the prototype home", () => {
    const markup = renderToStaticMarkup(<LaborGuideViewSwitch view="new" activeGuide={false} />);
    expect(markup).not.toContain('aria-current="page"');
    expect(markup).toContain('href="/prototype/repair-explorer"');
  });
  it("retains the legacy detailed worksheet and exposes the compact worksheet only when selected", () => {
    const props = { activeRepairOrder: null, catalog: [], laborAddOns: [], repairTaxonomy: LABOR_OPERATION_TAXONOMY };
    const legacy = renderToStaticMarkup(<EnterpriseLaborGuideConsole {...props} />);
    const review = renderToStaticMarkup(<EnterpriseLaborGuideConsole {...props} initialGuideView="new" />);
    expect(legacy).toContain("Build an estimate");
    expect(legacy).toContain("3. Check readiness");
    expect(legacy).not.toContain("Estimate worksheet");
    expect(review).toContain("Estimate worksheet");
    expect(review).not.toContain("Build an estimate");
    expect(review).toContain("not adopted");
  });
});
