import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { InventoryTransferWorkspace } from "@/features/inventory/inventory-transfer-workspace";

it("opens the requested import or export workspace directly", () => {
  for (const mode of ["import", "export"] as const) {
    const markup = renderToStaticMarkup(<InventoryTransferWorkspace initialMode={mode} locations={[{ id: "lot", code: "TMS", name: "Lot" }]} />);
    expect(markup).toContain(mode === "import" ? "Choose CSV" : "Download CSV");
    expect(markup).not.toContain(mode === "import" ? "Download CSV" : "Choose CSV");
  }
});
