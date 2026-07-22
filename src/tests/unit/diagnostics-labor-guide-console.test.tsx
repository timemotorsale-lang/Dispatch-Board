import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";
import { flattenLaborOperationTaxonomy, LABOR_OPERATION_ADD_ONS, LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";

describe("enterprise labor guide console", () => {
  it("renders the approved dual-mode labor guide and a live repair-order workbench link", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "Clunking noise in front end and rear feels bouncy over bumps", customer: "Jordan Ellis", id: "ro-id-3411", openedAt: "2026-07-21T14:00:00.000Z", repairOrderNumber: "RO-3411", vehicle: { label: "2018 Ford F-150", vin: "1FTFW1E84KFC12345" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[{ id: "ro-id-3411", label: "RO-3411 - 2018 Ford F-150" }]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Labor Guide Console");
    expect(markup).toContain("Manual Labor Guide");
    expect(markup).toContain("Labor Intelligence Engine");
    expect(markup).toContain("Manual Operation Builder");
    expect(markup).toContain("All repair categories");
    expect(markup).toContain("Hide Categories");
    expect(markup).toContain("Steering &amp; Suspension");
    expect(markup).toContain("Maintenance &amp; Scheduled Service");
    expect(markup).toContain("Body, Glass, Collision &amp; Refinish");
    expect(markup).toContain("Hybrid, EV &amp; High Voltage");
    expect(markup).toContain("Replace front right lower control arm");
    expect(markup).toContain("Replace rear shock absorbers - both sides");
    expect(markup).toContain("Replace front strut assemblies - both sides");
    expect(markup).toContain("Alignment recommended");
    expect(markup).toContain("A/C evac and recharge");
    expect(markup).toContain("Estimate / Work Order Preview");
    expect(markup).toContain("Draft only - no dispatch, no parts order, no authorization.");
    expect(markup).toContain("Select active repair order");
    expect(markup).toContain("Active RO");
    expect(markup).toContain("#3411");
    expect(markup).toContain("Open RO");
    expect(markup).toContain("Open vehicle in RO");
    expect(markup).toContain("Open concern in RO");
    expect(markup).toContain("/vehicles/repair-workbench?repairOrderId=ro-id-3411");
    expect(markup).toContain("Add to Estimate Draft");
    expect(markup).toContain("Send to Advisor Review");
    expect(markup).toContain("Convert to Work Order Lines");
    expect(markup).toContain("Open RO / Estimate for Customer Authorization");
    expect(markup).toContain("Generate Work Package");
    expect(markup).toContain("placeholder=\"Example: replace front right lower control arm and both rear shocks");
  });

  it("routes missing vehicle and repair-order context to intake before estimate creation", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("No vehicle selected");
    expect(markup).toContain("Check in / create RO");
    expect(markup).toContain("/vehicles/repair-orders?intakeSource=WALK_IN&amp;returnTo=%2Fdiagnostics%2Flabor-guide");
    expect(markup).toContain("Add vehicle");
    expect(markup).not.toContain("/vehicles/workflows/add-vehicle");
    expect(markup).toContain("Open customers");
    expect(markup).toContain("Vehicle and RO required");
    expect(markup).toContain("Create RO Before Estimate");
    expect(markup).toContain("Select Active RO");
    expect(markup).toContain("0.0 hrs");
  });

  it("provides a deeper enterprise labor taxonomy across high-volume repair categories", () => {
    const operations = flattenLaborOperationTaxonomy();
    const titles = operations.map((operation) => operation.title);

    expect(LABOR_OPERATION_TAXONOMY.length).toBeGreaterThanOrEqual(10);
    expect(operations.length).toBeGreaterThanOrEqual(70);
    expect(titles).toContain("Replace front brake pads and rotors");
    expect(titles).toContain("Replace A/C compressor");
    expect(titles).toContain("Forward camera calibration");
    expect(titles).toContain("Replace front bumper cover");
    expect(titles).toContain("High-voltage disable and enable procedure");
    expect(operations.filter((operation) => operation.requiredAddOns.length > 0).length).toBeGreaterThan(10);
  });
});
