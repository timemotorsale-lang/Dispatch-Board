import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";

describe("enterprise labor guide console", () => {
  it("renders the approved dual-mode labor guide and a live repair-order workbench link", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "Clunking noise in front end and rear feels bouncy over bumps", customer: "Jordan Ellis", id: "ro-id-3411", openedAt: "2026-07-21T14:00:00.000Z", repairOrderNumber: "RO-3411", vehicle: { label: "2018 Ford F-150", vin: "1FTFW1E84KFC12345" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} repairOrders={[{ id: "ro-id-3411", label: "RO-3411 - 2018 Ford F-150" }]} />);

    expect(markup).toContain("Labor Guide Console");
    expect(markup).toContain("Manual Labor Guide");
    expect(markup).toContain("Labor Intelligence Engine");
    expect(markup).toContain("Manual Operation Builder");
    expect(markup).toContain("All repair categories");
    expect(markup).toContain("Hide Categories");
    expect(markup).toContain("Steering &amp; Suspension");
    expect(markup).toContain("Replace front right lower control arm");
    expect(markup).toContain("Replace rear shock absorbers - both sides");
    expect(markup).toContain("Suspension noise diagnosis");
    expect(markup).toContain("Alignment recommended");
    expect(markup).toContain("Estimate / Work Order Preview");
    expect(markup).toContain("Draft only - no dispatch, no parts order, no authorization.");
    expect(markup).toContain("Select active repair order");
    expect(markup).toContain("Active RO");
    expect(markup).toContain("#3411");
    expect(markup).toContain("/vehicles/repair-workbench?repairOrderId=ro-id-3411");
    expect(markup).toContain("Add to Estimate Draft");
    expect(markup).toContain("Send to Advisor Review");
    expect(markup).toContain("Convert to Work Order Lines");
    expect(markup).toContain("Open RO / Estimate for Customer Authorization");
    expect(markup).toContain("Generate Work Package");
  });
});
