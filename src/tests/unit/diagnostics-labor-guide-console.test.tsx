import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { describe, expect, it } from "vitest";

import { estimateRevisionSeed, type SavedEstimateRevision } from "@/lib/labor-guide-estimate-revision";
import { searchRepairs } from "@/features/prototype/repair-explorer/catalog";
import { initialEstimatePricing } from "@/lib/labor-guide-controls";
import { ConnectedRepairCatalog } from "@/features/diagnostics/connected-repair-catalog";
import { GuidedEstimate } from "@/features/diagnostics/guided-estimate";
import { emptyManualLaborReview } from "@/lib/estimate-review";
import { EnterpriseLaborGuideConsole, estimatePresentationError, laborLineForEstimatePart, repairExplorerDraftHref } from "@/features/diagnostics/enterprise-labor-guide-console";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";
import { flattenLaborOperationTaxonomy, LABOR_OPERATION_ADD_ONS, LABOR_OPERATION_TAXONOMY } from "@/server/diagnostics/labor-operation-taxonomy";

describe("enterprise labor guide console", () => {
  it("keeps catalog controls in Find and gives Review only the worksheet and estimate summary", () => {
    const props = { vehicle: "Known vehicle", concern: "", selected: [], laborRate: 150, onSelect: () => undefined, onReview: () => undefined };
    const slots = { onFind: () => undefined, review: <div>Worksheet contents</div>, context: null, sidebar: <div>Estimate summary</div>, toolbar: null };
    const find = renderToStaticMarkup(<ConnectedRepairCatalog {...props} explorer={{ ...slots, reviewOpen: false }} />);
    expect(find).toContain('aria-label="Search connected repairs"');
    expect(find).toContain('aria-label="Connected vehicle systems"');
    expect(find).toContain("Estimate summary");
    expect(find).not.toContain("Worksheet contents");
    const review = renderToStaticMarkup(<ConnectedRepairCatalog {...props} explorer={{ ...slots, reviewOpen: true }} />);
    expect(review).toContain("reviewColumns");
    expect(review).toContain("Worksheet contents");
    expect(review).toContain("Estimate summary");
    expect(review).toContain("Find repair");
    expect(review).not.toContain('aria-label="Search connected repairs"');
    expect(review).not.toContain('aria-label="Connected vehicle systems"');
  });

  it("starts saved estimate revisions in the shop catalog and keeps saved scope in view", () => {
    const revision: SavedEstimateRevision = {
      documentId: "document", documentHash: "hash", estimateId: "estimate", version: 1, expectedVersion: 4, discountCents: 0, taxRatePercent: 7,
      lines: [
        { key: "saved-labor", type: "LABOR", description: "Saved labor line", laborGuideMinutes: 60, quantity: 1, unitPriceCents: 10000 },
        { key: "saved-part", type: "PART", description: "Saved part line", quantity: 1, unitPriceCents: 5000 },
      ],
    };
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole presentation="explorer" activeRepairOrder={{ id: "ro", repairOrderNumber: "RO-1", openedAt: "2026-07-21T14:00:00.000Z", concern: "", customer: "Saved customer", vehicle: { id: "vehicle", label: "Saved vehicle", vin: "VIN" } }} catalog={[]} laborAddOns={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} estimateRevision={revision} initialExplorerSeed={estimateRevisionSeed(revision, [])} />);
    expect(markup).toContain('aria-label="Search connected repairs"');
    expect(markup).toContain("Revising estimate v1");
    expect(markup).toContain("Saved labor line");
    expect(markup).toContain("Saved part line");
    expect(markup).not.toContain("Add manual labor");
    expect(searchRepairs("front sway bar link").some(match => match.repair.label === "Replace front stabilizer link")).toBe(true);
  });

  it("shows My work once and keeps a distinct source link", () => {
    const props = { presentation: "explorer" as const, activeRepairOrder: null, catalog: [], laborAddOns: [], repairTaxonomy: LABOR_OPERATION_TAXONOMY };
    const fallback = renderToStaticMarkup(<EnterpriseLaborGuideConsole {...props} returnTo="/my-tasks" returnLabel="My work" />);
    expect(fallback.match(/href="\/my-tasks"/g)).toHaveLength(1);
    const distinct = renderToStaticMarkup(<EnterpriseLaborGuideConsole {...props} returnTo="/crm-next/deals" returnLabel="Back to deal" />);
    expect(distinct).toContain('href="/crm-next/deals">Back to deal');
  });

  it("uses the full visual catalog, actual identity and reconciled estimate sidebar in Explorer presentation", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole presentation="explorer" activeRepairOrder={{
      id: "ro-saved", openedAt: "2026-07-21T14:00:00.000Z", repairOrderNumber: "RO-SAVED", concern: "Brake noise", customer: "Real Customer",
      vehicle: { id: "saved-vehicle", label: "Actual Civic", vin: "VALID-VIN" },
    }} catalog={[]} initialSelectedWork="starter" laborAddOns={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);
    for (const text of ["<h1>Find the work. Build the estimate.</h1>", "Vehicle systems", "Find it visually", "Review estimate", 'aria-label="Estimate"', "Real Customer", "Actual Civic", "VALID-VIN", "RO-SAVED", "Other charges &amp; supplies", "Discount", "Tax", "Estimate total", "Save quote"]) {
      expect(markup).toContain(text);
    }
    expect(markup).not.toContain("Diagnostic vehicle workspace");
    expect(markup).not.toContain("Sample estimate");
    expect(markup).not.toContain("Review ten-system expansion");
    expect(markup).toContain('href="/vehicles/service-billing?repairOrderId=ro-saved">Billing &amp; receipts');
  });

  it("opens the strongest exact-name group before loose front/left matches in another system", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={[]} initialQuery="front left complete loaded strut" laborAddOns={LABOR_OPERATION_ADD_ONS} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);
    expect(markup).toContain("<strong>Replace front left complete loaded strut</strong>");
    expect(markup).toContain('<option value="steering-suspension" selected="">');
    expect(markup).toContain("Scope, parts &amp; safety checks");
  });
  it("renders the unified estimate worksheet with catalog tools and a live repair-order workbench link", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "Clunking noise in front end and rear feels bouncy over bumps", customer: "Jordan Ellis", id: "ro-id-3411", openedAt: "2026-07-21T14:00:00.000Z", repairOrderNumber: "RO-3411", vehicle: { id: "veh-id-1", label: "2018 Ford F-150", vin: "1FTFW1E84KFC12345" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialSelectedWork="starter" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[{ id: "ro-id-3411", label: "RO-3411 - 2018 Ford F-150" }]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Find saved repair work");
    expect(markup).toContain("Results open in a new tab so you can keep working here.");
    expect(markup).toContain("Diagnostic vehicle workspace");
    expect(markup).toContain("Search customer, phone, VIN, plate, vehicle, or RO number");
    expect(markup).toContain("RO-3411");
    expect(markup).toContain("Check in vehicle");
    expect(markup).toContain("Find labor or parts");
    expect(markup).toContain("Catalog, parts, evidence, notes");
    expect(markup).toContain("Manual Labor Guide");
    expect(markup).toContain("Labor Intelligence Engine");
    expect(markup).toContain("Complete Repair Catalog");
    expect(markup).toContain("Find labor or parts");
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
    expect(markup).toContain("Drum Brakes &amp; Measurements");
    expect(markup).toContain("Electronic Assist &amp; Regenerative Braking");
    expect(markup).toContain("aria-expanded=\"false\"");
    expect(markup).not.toContain("Choose what needs to be fixed");
    expect(markup).not.toContain("Select</button>");
    expect(markup).toContain("Add manual part");
    expect(markup).toContain("Retail");
    expect(markup).toContain("Edit Front brake pad set price and quantity");
    expect(markup).toContain("Suggested catalog match - fitment and price need review");
    expect(markup).toContain("Automatic Suggested Add-Ons");
    expect(markup).toContain("Full brake fluid exchange (not an included circuit bleed)");
    expect(markup).toContain("Helpful items to review");
    expect(markup).not.toContain("Estimate Labor Rules");
    expect(markup).not.toContain("OEM Parts Map");
    expect(markup).not.toContain("OEM-BRAKE-PADS-VIN-REVIEW");
    expect(markup).toContain("Selected Work");
    expect(markup).toContain("Evidence 0");
    expect(markup).toContain("Edit Replace front brake pads and rotors");
    expect(markup).toContain("Replace pads");
    expect(markup).toContain("Customer / Vehicle");
    expect(markup).toContain("Estimate worksheet");
    expect(markup).toContain("Generate / Print Estimate");
    expect(markup).toContain("Active RO");
    expect(markup).toContain("Active RO RO-3411");
    expect(markup).toContain("Open simple findings entry");
    expect(markup).toContain("/vehicles/repair-workbench?repairOrderId=ro-id-3411");
    expect(markup).toContain("Generate / Print Estimate");
    expect(markup).not.toContain("Mark manually reviewed");
    expect(markup).toContain("Front brake pad set");
    expect(markup).toContain("Estimate total");
    expect(markup).toContain("Estimate tax rate");
    expect(markup).not.toContain("Legacy guide");
  });

  it("routes missing vehicle and repair-order context to intake before estimate creation", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Choose a vehicle to begin");
    expect(markup).toContain("Customer not selected");
    expect(markup).toContain("Selected Work 0");
    expect(markup).toContain("Parts 0");
    expect(markup).toContain("<dt>Estimate total</dt><dd><strong>$0.00</strong></dd>");
    expect(markup).toContain("No work selected");
    expect(markup).not.toContain("2010 Mazda 3");
    expect(markup).not.toContain("Leo James");
    expect(markup).not.toContain("#0678C112");
    expect(markup).toContain("/vehicles/repair-orders?intakeSource=WALK_IN&amp;returnTo=%2Fdiagnostics%2Flabor-guide");
    expect(markup).toContain("Check in vehicle");
    expect(markup).toContain("/vehicles/workflows/add-vehicle?returnTo=%2Fdiagnostics%2Flabor-guide");
    expect(markup).toContain("Add vehicle (new tab)");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain("without leaving this estimate");
    expect(markup).toContain(">Link repair order</button>");
    expect(markup).not.toContain("Generate / Print Estimate");
    expect(markup).toContain("Link an open repair order to issue the estimate.");
    expect(markup).toContain('aria-label="Find an open repair order"');
    expect(markup).toContain("Check in vehicle in a new tab");
    expect(markup).not.toContain("Preview / Print Preliminary Quote");
    expect(markup).toContain("Selected Work");
    expect(markup).toContain("Parts");
    expect(markup).not.toContain("Mark manually reviewed");
    expect(markup).toContain("returnTo=%2Fdiagnostics%2Flabor-guide");
  });

  it("offers a separate preliminary print preview for unlinked proposed work", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialSelectedWork="starter" laborAddOns={LABOR_OPERATION_ADD_ONS} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);
    expect(markup).toContain(">Preview / Print Preliminary Quote</button>");
    expect(markup).not.toContain('href="/repair-estimate?');
    expect(markup).not.toContain("/vehicles/service-billing?repairOrderId=");
  });

  it("keeps an invalid tax rate visible without crashing the unlinked worksheet", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={[]} initialPricing={{ ...initialEstimatePricing, taxRatePercent: 31 }} laborAddOns={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);
    expect(markup).toContain("Enter a tax rate between 0% and 30%.");
    expect(markup).toContain("Pending tax rate");
    expect(markup).not.toContain("/vehicles/service-billing?repairOrderId=");
  });

  it("keeps standalone parts billable without a fabricated labor reference", () => {
    const labor = [{ id: "catalog-inspection", rowId: "selected-inspection" }];
    expect(laborLineForEstimatePart("manual", labor)).toBeUndefined();
    expect(laborLineForEstimatePart("removed-labor", labor)).toBeUndefined();
    expect(laborLineForEstimatePart("catalog-inspection", labor)).toBe("labor-selected-inspection");
  });

  it("builds the return route with the newly saved draft ID and retained source context", () => {
    const href = repairExplorerDraftHref({ savedId: "just-saved-id", repairOrderId: "ro-9", reviewWorkflow: true, returnTo: "/crm-next/deals?view=saved", returnLabel: "Back to deal" });
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/prototype/repair-explorer");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      draftId: "just-saved-id", repairOrderId: "ro-9", workflow: "review",
      returnTo: "/crm-next/deals?view=saved", returnLabel: "Back to deal",
    });
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
    expect(markup).toContain("<dt>Estimate total</dt><dd><strong>$0.00</strong></dd>");
  });

  it("starts every repair order with a blank estimate", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "New concern", customer: "New Customer", id: "ro-new", openedAt: "2026-08-13T12:00:00.000Z", repairOrderNumber: "RO-NEW", vehicle: { id: "veh-new", label: "2022 Honda Civic", vin: "VIN-NEW" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Selected Work 0");
    expect(markup).toContain("Parts 0");
    expect(markup).toContain("<dt>Labor</dt><dd>$0.00</dd>");
    expect(markup).toContain("<dt>Estimate total</dt><dd><strong>$0.00</strong></dd>");
    expect(markup).not.toContain("Legacy guide");
    expect(markup).not.toContain("Replace front brake pads and rotors");
  });

  it("keeps transmission access materials pending and follow-up work separate", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialSelectedWork="transmission" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Remove and install transmission assembly");
    expect(markup).toContain("no replacement assembly assumed");
    expect(markup).not.toContain("ATF-VIN-SPEC");
    expect(markup).toContain("Helpful items to review");
    expect(markup).toContain("Transmission assembly");
    expect(markup).not.toContain("OEM-TRANS-ASSEMBLY-VIN-REVIEW");
    expect(markup).toContain("confirm fitment before ordering");
    expect(markup).toContain("Estimate tax rate");
    expect(markup).toContain("<dt>Tax</dt>");
  });

  it("renders bodywork repair-area intelligence for door estimates", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={null} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} initialQuery="door" initialSelectedWork="empty" laborAddOns={LABOR_OPERATION_ADD_ONS} repairOrders={[]} repairTaxonomy={LABOR_OPERATION_TAXONOMY} />);

    expect(markup).toContain("Helpful items to review");
    expect(markup).toContain("Door shell");
    expect(markup).toContain("Door glass and regulator");
    expect(markup).not.toContain("OEM-DOOR-SHELL-VIN-REVIEW");
    expect(markup).toContain("Add part");
    expect(markup).toContain("Panels, glass &amp; specialist assessment");
    expect(flattenLaborOperationTaxonomy().find(operation => operation.id === "door-shell")?.title).toBe("Replace door shell");
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
    expect(operations.find(operation => operation.id === "transmission-remove-install")!.requiredAddOns).toEqual([]);
    expect(LABOR_OPERATION_TAXONOMY.find(system => system.id === "steering-suspension")!.groups.flatMap(group => group.operations).every(operation => !operation.requiredAddOns.includes("alignment"))).toBe(true);
  });
});

describe("worksheet action feedback", () => {
  const props = {
    hasRO: true, lines: [], review: emptyManualLaborReview, scope: "", total: "$0.00",
    onReview: () => undefined, onEdit: () => undefined, onSave: () => undefined, onPresent: () => undefined,
  };
  it("labels a pending draft save separately from issuing and renders a local save result", () => {
    const saving = renderToStaticMarkup(<GuidedEstimate {...props} busy savingDraft />);
    expect(saving).toContain("Saving draft…");
    expect(saving).not.toContain("Generating estimate…");
    const saved = renderToStaticMarkup(<GuidedEstimate {...props} busy={false} saveNotice="Quote draft saved." />);
    expect(saved).toContain('role="status" tabindex="-1">Quote draft saved.');
    const failed = renderToStaticMarkup(<GuidedEstimate {...props} busy={false} feedback="The quote could not be saved." />);
    expect(failed).toContain('role="alert" tabindex="-1">The quote could not be saved.');
  });
});

it("explains the rollout block and preserves unrelated errors", () => {
  const message = estimatePresentationError("Shop Operations rollout: MASTER_DISABLED");
  expect(message).toContain("The estimate was not issued.");
  expect(message).toContain("Settings > Vehicle Operations");
  expect(message).toContain("You can still save the quote.");
  expect(message).not.toContain("MASTER_DISABLED");
  expect(estimatePresentationError("Invoice print failed.")).toBe("Invoice print failed.");
});
