import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EnterpriseLaborGuideConsole } from "@/features/diagnostics/enterprise-labor-guide-console";
import { LABOR_GUIDE_DIAGNOSTIC_NAVIGATION } from "@/server/diagnostics/labor-guide-navigation";

describe("enterprise labor guide console", () => {
  it("renders the governed diagnostic catalog and a live repair-order workbench link", () => {
    const markup = renderToStaticMarkup(<EnterpriseLaborGuideConsole activeRepairOrder={{ concern: "Intermittent no-start", customer: "Jordan Ellis", id: "ro-id-3411", openedAt: "2026-07-21T14:00:00.000Z", repairOrderNumber: "RO-3411", vehicle: { label: "2018 Ford F-150", vin: "1FTFW1E84KFC12345" } }} catalog={LABOR_GUIDE_DIAGNOSTIC_NAVIGATION} />);

    expect(markup).toContain("Diagnostic System Navigator");
    expect(markup).toContain("Starting &amp; Charging");
    expect(markup).toContain("Hybrid, EV &amp; High Voltage");
    expect(markup).toContain("Collision, Body &amp; Refinish");
    expect(markup).toContain("Search diagnostic systems and repair areas");
    expect(markup).toContain("Active RO-3411");
    expect(markup).toContain("/vehicles/repair-workbench?repairOrderId=ro-id-3411");
    expect(markup).toContain("Create Advisor Draft");
    expect(markup).toContain("Compare Models");
    expect(markup).toContain("View History");
  });
});

