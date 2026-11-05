import { describe, expect, it } from "vitest";
import { formsLibraryDealHref, knownLibraryForms, libraryFormsForPathway, readFormsLibraryRequest } from "@/lib/forms-library-navigation";

describe("Forms Library deal handoff", () => {
  it("opens an existing deal without changing its pathway or status", () => {
    const url = new URL(formsLibraryDealHref("fictional-draft", "finance", ["sales-agreement", "retail-installment-contract"]), "http://localhost");
    expect(url.pathname).toBe("/crm-next/deals/start");
    expect(Object.fromEntries(url.searchParams)).toEqual({ draftId: "fictional-draft", formsLibrary: "1", printForms: "sales-agreement,retail-installment-contract" });
  });
  it("deduplicates known forms and rejects links that can target another route", () => {
    expect(knownLibraryForms(["sales-agreement", "unknown", "sales-agreement"])).toEqual(["sales-agreement"]);
    expect(() => formsLibraryDealHref("../../other", "bhph", [])).toThrow("Select a saved deal");
  });
  it("keeps wholesale originals separate from retail consumer agreements", () => {
    expect(libraryFormsForPathway(["sales-agreement", "wholesale-bill-of-sale", "odometer-disclosure"], "wholesale")).toEqual(["wholesale-bill-of-sale", "odometer-disclosure"]);
  });
  it("requires an explicit request matching the actually loaded draft", () => {
    const params = new URLSearchParams("draftId=fictional-draft&formsLibrary=1&printForms=trade-documents,unknown,trade-documents");
    expect(readFormsLibraryRequest(params, "different-draft")).toBeNull();
    expect(readFormsLibraryRequest(params, "")).toBeNull();
    expect(readFormsLibraryRequest(params, "fictional-draft")).toEqual({ ids: ["trade-documents"] });
    params.delete("formsLibrary");
    expect(readFormsLibraryRequest(params, "fictional-draft")).toBeNull();
  });
  it("distinguishes keeping saved selections from an explicitly empty applicable selection", () => {
    const keep = new URL(formsLibraryDealHref("fictional-draft", "finance", []), "http://localhost");
    expect(readFormsLibraryRequest(keep.searchParams, "fictional-draft")).toEqual({ ids: null });
    const empty = new URL(formsLibraryDealHref("fictional-draft", "wholesale", ["sales-agreement"]), "http://localhost");
    expect(readFormsLibraryRequest(empty.searchParams, "fictional-draft")).toEqual({ ids: [] });
  });
});
