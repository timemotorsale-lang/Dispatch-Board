import { describe, expect, it } from "vitest";

import { searchWorkflowFinder } from "@/components/layout/workflow-finder-registry";

function titlesFor(query: string) {
  return searchWorkflowFinder(query).map((result) => result.title);
}

describe("workflow finder registry", () => {
  it("finds the money tool through staff spending language", () => {
    expect(titlesFor("daily journal")).toContain("Money & Resources");
    expect(searchWorkflowFinder("petty cash").find(result => result.title === "Money & Resources")?.href).toBe("/money-resources");
  });
  it("finds inventory lifecycle even when staff misspell lifecycle", () => {
    expect(titlesFor("inventory lifcycle")).toContain("Inventory Lifecycle");
  });

  it("routes Shop & Recon wording to the unified Recon / Repair Advisor workspace", () => {
    expect(titlesFor("shop and recon")).toContain("Recon / Repair Advisor");
  });

  it("finds workbook capabilities as a family", () => {
    const titles = titlesFor("workbook");

    expect(titles).toContain("Vehicle Operations Lead Workbook");
    expect(titles).toContain("Workbook Checklist");
    expect(titles).toContain("Workbook Quick Update");
    expect(titles).toContain("Workbook Action Plan");
  });

  it("finds staff phrases that do not match route names", () => {
    expect(titlesFor("order parts")).toContain("Parts Operations");
    expect(titlesFor("insurance adjuster")).toContain("Claims Desk");
    expect(titlesFor("vehicle check in")).toContain("Check In Vehicle");
  });
});
