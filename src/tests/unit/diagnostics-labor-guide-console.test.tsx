import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";
import { flattenLaborOperationTaxonomy, LABOR_OPERATION_ADD_ONS, LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";

describe("enterprise labor guide console", () => {
  it("renders the approved dual-mode labor guide and a live repair-order workbench link", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "Clunking noise in front end and rear feels bouncy over bumps", customer: "Jordan Ellis", id: "ro-id-3411", openedAt: "2026-07-21T14:00:00.000Z", repairOrderNumber: "RO-3411", vehicle: { id: "veh-id-1", label: "2018 Ford F-150", vin: "1FTFW1E84KFC12345" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialSelectedWork="starter" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[{ id: "ro-id-3411", label: "RO-3411 - 2018 Ford F-150" }]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("RO Creation Workspace");
    expect(markup).toContain("Search customer, phone, VIN, plate, vehicle, or RO number");
    expect(markup).toContain("RO-3411");
    expect(markup).toContain("Check in vehicle");
    expect(markup).toContain("Manual Labor Guide");
    expect(markup).toContain("Labor Intelligence Engine");
    expect(markup).toContain("Complete Repair Catalog");
    expect(markup).toContain("List");
    expect(markup).toContain("Board");
    expect(markup).toContain("Steering &amp; Suspension");
    expect(markup).toContain("Maintenance &amp; Scheduled Service");
    expect(markup).toContain("Body, Glass, Collision &amp; Refinish");
    expect(markup).toContain("Hybrid, EV &amp; High Voltage");
    expect(markup).toContain("aria-label=\"Repair category shortcuts\"");
    expect(markup).not.toContain("<h3>Repair Categories</h3>");
    expect(markup).toContain("Replace front brake pads and rotors");
    expect(markup).toContain("Replace front brake caliper");
    expect(markup).toContain("Pads, Rotors, Drums &amp; Calipers");
    expect(markup).toContain("ABS, Stability &amp; Parking Brake");
    expect(markup).toContain("4 fixes");
    expect(markup).toContain("3 fixes");
    expect(markup).toContain("aria-expanded=\"false\"");
    expect(markup).not.toContain("Choose what needs to be fixed");
    expect(markup).not.toContain("Select</button>");
    expect(markup).toContain("Add manual part");
    expect(markup).toContain("Auto from parts catalog");
    expect(markup).toContain("Automatic Suggested Add-Ons");
    expect(markup).toContain("Road test and repair verification");
    expect(markup).toContain("Repair area intelligence");
    expect(markup).toContain("Brake Assembly");
    expect(markup).toContain("OEM-BRAKE-PADS-VIN-REVIEW");
    expect(markup).toContain("Selected Work");
    expect(markup).toContain("Evidence 0");
    expect(markup).toContain("Edit Replace front brake pads and rotors");
    expect(markup).toContain("Replace pads");
    expect(markup).toContain("Customer / Vehicle");
    expect(markup).toContain("Estimate / RO Preview");
    expect(markup).toContain("Active RO");
    expect(markup).toContain("#3411");
    expect(markup).toContain("Repair history");
    expect(markup).toContain("/vehicles/repair-workbench?repairOrderId=ro-id-3411");
    expect(markup).toContain("Create Estimate");
    expect(markup).toContain("Parts needed for this repair");
    expect(markup).toContain("Open Parts Ordering Workflow");
    expect(markup).toContain("Sync parts demand to RO");
    expect(markup).toContain("Open Official Estimate");
    expect(markup).toContain("part lines");
    expect(markup).toContain("/diagnostics/parts-ordering?");
    expect(markup).toContain("/repair-estimate?");
    expect(markup).toContain("repairOrderId=ro-id-3411");
    expect(markup).toContain("repairOrderNumber=RO-3411");
    expect(markup).toContain("returnTo=%2Fdiagnostics%2Flabor-guide%3FrepairOrderId%3Dro-id-3411");
    expect(markup).toContain("Advisor review");
    expect(markup).toContain("Prior estimate lines are not carried into this RO");
  });

  it("routes missing vehicle and repair-order context to intake before estimate creation", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("No vehicle selected");
    expect(markup).toContain("No customer selected");
    expect(markup).toContain("Selected Work 0");
    expect(markup).toContain("Parts 0");
    expect(markup).toContain("<dt>Total</dt><dd>$0.00</dd>");
    expect(markup).toContain("No previous estimate is loaded");
    expect(markup).not.toContain("2010 Mazda 3");
    expect(markup).not.toContain("Leo James");
    expect(markup).not.toContain("#0678C112");
    expect(markup).toContain("/vehicles/repair-orders?intakeSource=WALK_IN&amp;returnTo=%2Fdiagnostics%2Flabor-guide");
    expect(markup).toContain("Check in vehicle");
    expect(markup).not.toContain("/vehicles/workflows/add-vehicle");
    expect(markup).toContain("Create Estimate");
    expect(markup).toContain("Selected Work");
    expect(markup).toContain("Parts");
    expect(markup).toContain("Open Parts Ordering Workflow");
    expect(markup).toContain("Open Official Estimate");
    expect(markup).toContain("/diagnostics/parts-ordering?");
    expect(markup).toContain("/repair-estimate?");
    expect(markup).toContain("returnTo=%2Fdiagnostics%2Flabor-guide");
  });

  it("renders a working labor intelligence description input", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialMode="engine" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Describe the repair need, symptom, or advisor notes");
    expect(markup).toContain("front passenger brake");
    expect(markup).toContain("Analyze");
    expect(markup).toContain("Press Enter to analyze");
    expect(markup).toContain("Pads, Rotors, Drums &amp; Calipers");
  });

  it("does not show tax and supplies when no labor or parts are selected", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialSelectedWork="empty" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Selected Work 0");
    expect(markup).toContain("Parts 0");
    expect(markup).toContain("<dt>Tax</dt><dd>$0.00</dd>");
    expect(markup).toContain("<dt>Total</dt><dd>$0.00</dd>");
  });

  it("starts every repair order with a blank estimate", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "New concern", customer: "New Customer", id: "ro-new", openedAt: "2026-08-13T12:00:00.000Z", repairOrderNumber: "RO-NEW", vehicle: { id: "veh-new", label: "2022 Honda Civic", vin: "VIN-NEW" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Selected Work 0");
    expect(markup).toContain("Parts 0");
    expect(markup).toContain("<dt>Labor</dt><dd>0.0 hrs</dd>");
    expect(markup).toContain("<dt>Total</dt><dd>$0.00</dd>");
    expect(markup).toContain("Prior estimate lines are not carried into this RO");
    expect(markup).not.toContain("Replace front brake pads and rotors");
  });

  it("shows transmission replacement required parts, accessories, programming, and MN tax policy", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialSelectedWork="transmission" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Remove and install transmission assembly");
    expect(markup).toContain("Transmission assembly - VIN fitment and supplier price required");
    expect(markup).toContain("Automatic transmission fluid - fill and level set allowance");
    expect(markup).toContain("Transmission filter and pan gasket kit");
    expect(markup).toContain("Axle/output shaft seal set");
    expect(markup).toContain("Torque converter/front pump seal");
    expect(markup).toContain("Transmission programming, configuration, and adaptive relearn");
    expect(markup).toContain("Transmission Assembly");
    expect(markup).toContain("OEM-TRANS-ASSEMBLY-VIN-REVIEW");
    expect(markup).toContain("Program/configure TCM when required.");
    expect(markup).toContain("MN taxable parts");
    expect(markup).toContain("separately stated repair labor is not taxed");
  });

  it("renders bodywork repair-area intelligence for door estimates", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialQuery="door" initialSelectedWork="empty" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Door Assembly");
    expect(markup).toContain("Door shell");
    expect(markup).toContain("Glass and regulator");
    expect(markup).toContain("OEM-DOOR-SHELL-VIN-REVIEW");
    expect(markup).toContain("Door shell replacement needs refinish review");
    expect(markup).toContain("Replace door shell");
  });

  it("provides an evidence upload workspace for RO photos and documents", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "Grinding brake noise", customer: "Leo James", id: "ro-id-1", openedAt: "2026-07-22T12:00:00.000Z", repairOrderNumber: "RO-1", vehicle: { id: "veh-id-1", label: "2010 Mazda 3", vin: "JM1BL1SF3A1257561" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialWorkTab="evidence" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Repair evidence uploads");
    expect(markup).toContain("Upload photos, videos, scan reports, or documents");
    expect(markup).toContain("Attach to");
    expect(markup).toContain("Customer-facing");
    expect(markup).toContain("Ready to upload against checked-in vehicle evidence.");
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
