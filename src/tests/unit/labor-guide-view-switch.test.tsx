import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { laborGuideHref } from "@/features/diagnostics/labor-guide-view-switch";
import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";
vi.mock("next/navigation", async importOriginal => ({ ...await importOriginal<typeof import("next/navigation")>(), redirect: (url: string) => { throw new Error(`Redirect:${url}`); } }));
import Page from "@/app/(app)/diagnostics/labor-guide/page";

describe("single labor guide", () => {
  it.each([{}, { guide: "legacy" }, { guide: "new" }, { experience: "explorer" }])("redirects old entry points to the same guide: %j", async params => {
    await expect(Page({ searchParams: Promise.resolve(params) })).rejects.toThrow("Redirect:/prototype/repair-explorer");
  });
  it("preserves the RO and return context on old bookmarks", async () => {
    await expect(Page({ searchParams: Promise.resolve({ guide: "legacy", repairOrderId: "ro/1", workflow: "review", returnTo: "/my-tasks" }) })).rejects.toThrow("Redirect:/prototype/repair-explorer?repairOrderId=ro%2F1&workflow=review&returnTo=%2Fmy-tasks");
  });
  it("preserves deliberate draft imports", async () => {
    await expect(Page({ searchParams: Promise.resolve({ guide: "legacy", importExplorer: "1", repairOrderId: "ro/1" }) })).rejects.toThrow("Redirect:/prototype/labor-guide?importExplorer=1&repairOrderId=ro%2F1");
  });
  it("uses one worksheet regardless of an old view flag", () => {
    const props = { activeRepairOrder: null, catalog: [], laborAddOns: [], repairTaxonomy: LABOR_OPERATION_TAXONOMY };
    for (const initialGuideView of [undefined, "legacy", "new"] as const) {
      const html = renderToStaticMarkup(<EnterpriseLaborGuideConsole {...props} initialGuideView={initialGuideView} />);
      expect(html).toContain("Estimate worksheet");
      expect(html).not.toContain("Legacy guide");
      expect(html).not.toContain("Mark manually reviewed");
      expect(html).not.toContain("Build an estimate");
    }
    expect(laborGuideHref("legacy", "ro/1")).toBe(laborGuideHref("new", "ro/1"));
  });
});
