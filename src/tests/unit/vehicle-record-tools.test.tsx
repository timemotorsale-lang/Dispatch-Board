import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VehicleLogs, VehicleTools } from "@/features/inventory/vehicle-record-tools";

describe("vehicle record tools", () => {
  it("uses selected-vehicle routes without immediate sold/delete writes", () => {
    const html = renderToStaticMarkup(<VehicleTools vehicleId="vehicle-1"/>);
    expect(html).toContain("pathway=retail-sale&amp;new=1");
    expect(html).toContain("pathway=finance&amp;new=1");
    expect(html).toContain("/vehicles/retail-completion?vehicleId=vehicle-1");
    expect(html).toContain("/vehicles/acquisition-appraisal?vehicleId=vehicle-1");
    expect(html).toContain("Mark as Deleted (unavailable)");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
  it("renders authorized source history and empty/unavailable states", () => {
    const html = renderToStaticMarkup(<VehicleLogs context={{ available: true, specifications: [], timeline: [{ id: "1", occurredAt: "2026-10-10T12:00:00Z", source: "INVENTORY", type: "ACTIVE", title: "Inventory received", detail: "Receipt recorded" }] }}/>);
    expect(html).toContain("Inventory received");
    expect(html).toContain("Receipt recorded");
    expect(html).not.toContain("temporarily unavailable");
    expect(renderToStaticMarkup(<VehicleLogs context={null}/>)).toContain("temporarily unavailable");
  });
});
