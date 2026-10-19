import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { LaborGuideVehicleEntry, laborGuideAddVehicleHref } from "@/features/diagnostics/labor-guide-vehicle-entry";

describe("Labor Guide vehicle entry", () => {
  it("uses the existing governed workflow with a fixed Labor Guide return path", () => {
    const url = new URL(laborGuideAddVehicleHref(), "http://localhost");
    expect(url.pathname).toBe("/vehicles/workflows/add-vehicle");
    expect(url.searchParams.get("returnTo")).toBe("/diagnostics/labor-guide");
    expect(url.searchParams.has("vin")).toBe(false);
  });

  it("passes only a complete normalized VIN as an optional identity hint", () => {
    expect(new URL(laborGuideAddVehicleHref(" 1hgcm82633a004352 "), "http://localhost").searchParams.get("vin")).toBe("1HGCM82633A004352");
    for (const vin of ["partial", "1IGCM82633A004352", "https://example.com", "1HGCM82633A004352&returnTo=//other"]) expect(new URL(laborGuideAddVehicleHref(vin), "http://localhost").searchParams.has("vin")).toBe(false);
  });

  it("opens separately with explicit labeling and no create command", () => {
    const html = renderToStaticMarkup(<LaborGuideVehicleEntry />);
    expect(html).toContain("Add vehicle (new tab)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-describedby="labor-guide-add-vehicle-help"');
    expect(html).not.toContain("/api/");
    expect(html).not.toContain("<form");
  });
});
