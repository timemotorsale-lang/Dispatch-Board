import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import styles from "@/features/inventory/vehicle-registry-workspace.module.css";
import { parseQuickVehicleIdentity, VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";

describe("vehicle registry workspace", () => {
  it("renders search, create, and import workflows", () => {
    const html = renderToStaticMarkup(<VehicleRegistryWorkspace initial={{ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 }} />);
    expect(html).toContain("Find the vehicle and go straight to work");
    expect(html).toContain("Create canonical identity");
    expect(html).toContain("Import preview");
    expect(html).toContain("Search VIN, partial VIN");
    expect(html).toContain("Search and open");
    expect(html).not.toContain("Open the vehicle workspace faster");
    expect(html).toContain("Quick add from description");
    expect(html).toContain("Fill form from sentence");
  });

  it("parses a plain-language quick vehicle intake sentence", () => {
    expect(parseQuickVehicleIdentity("2025 Mitsubishi Outlander Silver with 32145 miles, vehicle located at Time Motor Sales 1101 Lake Street")).toEqual({
      color: "Silver",
      initialCustodyPosition: "Time Motor Sales 1101 Lake Street",
      initialOdometerMiles: "32145",
      make: "Mitsubishi",
      model: "Outlander",
      year: "2025",
    });
  });

  it("derives quick-intake stock when the sentence includes a VIN", () => {
    expect(parseQuickVehicleIdentity("2025 Mitsubishi Outlander Silver VIN JA4J3VA87SZ029081 with 32145 miles at Time Motor Sales")).toMatchObject({
      stockNumber: "029081",
      vin: "JA4J3VA87SZ029081",
    });
  });

  it("renders each vehicle result as a direct route into the Vehicle Workbench", () => {
    const html = renderToStaticMarkup(
      <VehicleRegistryWorkspace
        initial={{
          items: [{
            id: "veh-1",
            vehicleNumber: "VEH-100",
            vin: "1HGCM82633A004352",
            vinState: "VALID",
            stockNumber: "STK-100",
            year: 2026,
            make: "Honda",
            model: "Accord",
            color: "Blue",
            status: "ACTIVE",
            vinRaw: null,
            licensePlate: null,
            version: 1,
            updatedAt: "2026-07-24T10:00:00.000Z",
            _count: { duplicateCasesAsCandidate: 0, duplicateCasesAsPrimary: 0 },
          }],
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1,
        }}
      />
    );

    expect(html).toContain("VEH-100");
    expect(html).toContain("<table>");
    expect(html).toContain("Stock</th>");
    expect(html).toContain("VIN</th>");
    expect(html).not.toContain("inventory-vehicle-result-card");
    expect(html).toContain("/vehicles/360/veh-1");
    expect(html).toContain("/vehicles/veh-1/workbench");
    expect(html).toContain("/vehicles/veh-1/sale");
    expect(html).toContain("/vehicles/veh-1/sale?mode=as-is");
    expect(html).toContain("Preview here");
    if (process.env.INVENTORY_REVIEW_OUTPUT) {
      const css = readFileSync("src/features/inventory/vehicle-registry-workspace.module.css", "utf8").replace(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g, (_, key) => `.${styles[key]}`);
      writeFileSync(join(process.env.INVENTORY_REVIEW_OUTPUT, "vehicle-registry.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial;margin:24px;background:#f5f7f9}*{box-sizing:border-box}.page-stack{display:grid;gap:16px}.page-copy h1{font-size:24px}.form-actions{display:flex;flex-wrap:wrap;gap:12px}.panel-card{padding:16px;background:white}.form-field{display:grid;gap:6px}${css}</style></head><body>${html}</body></html>`);
    }
  });

  it("shows the active search as a filtered vehicle match count", () => {
    const html = renderToStaticMarkup(
      <VehicleRegistryWorkspace
        initial={{
          items: [],
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 1,
        }}
        initialQuery="2025 Toyota Sienna"
      />
    );

    expect(html).toContain('0 vehicle matches for &quot;2025 Toyota Sienna&quot;');
    expect(html).toContain("No matching vehicle found");
  });
});
