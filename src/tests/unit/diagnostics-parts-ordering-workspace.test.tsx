import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DiagnosticsPartsOrderingWorkspace } from "@/features/diagnostics/diagnostics-parts-ordering-workspace";

describe("diagnostics parts ordering workspace", () => {
  it("renders a compact governed parts workflow with an ordered-parts log", () => {
    const markup = renderToStaticMarkup(<DiagnosticsPartsOrderingWorkspace
      parts={[
        { id: "part-1", name: "Front brake pad set", number: "B4SA-33-28Z", quantity: 1, sourceLabel: "Auto from parts catalog", totalLabel: "$128.99" },
        { id: "part-2", name: "Front brake rotor", number: "B45A-33-25XC", quantity: 2, sourceLabel: "Auto from parts catalog", totalLabel: "$239.90" },
      ]}
      repairOrderId="ro-id-3411"
      repairOrderNumber="RO-3411"
      returnTo="/diagnostics/labor-guide?repairOrderId=ro-id-3411"
      vehicleLabel="2010 Mazda 3"
    />);

    expect(markup).toContain("Govern parts ordering, receiving, and returns in one worksheet.");
    expect(markup).toContain("Record what was actually ordered");
    expect(markup).toContain("Add ordered part");
    expect(markup).toContain("Use the full-width ordered-parts ledger");
    expect(markup).toContain("Add missing vendor");
    expect(markup).toContain("Add vendor");
    expect(markup).toContain("Vendor / source");
    expect(markup).toContain("Ordered date");
    expect(markup).toContain("Document whether ordered parts were actually used");
    expect(markup).toContain("Used qty");
    expect(markup).toContain("Document parts returns");
    expect(markup).toContain("Front brake pad set (B4SA-33-28Z)");
    expect(markup).toContain("Front brake rotor (B45A-33-25XC)");
    expect(markup).toContain("Select source");
    expect(markup).toContain("Custom vendor");
    expect(markup).toContain("Ordered cost");
    expect(markup).toContain("Send estimate to repair workbench");
  });
});
