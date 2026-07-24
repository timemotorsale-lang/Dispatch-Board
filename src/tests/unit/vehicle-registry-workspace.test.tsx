import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";

describe("vehicle registry workspace", () => {
  it("renders search, create, and import workflows", () => {
    const html = renderToStaticMarkup(<VehicleRegistryWorkspace initial={{ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 }} />);
    expect(html).toContain("Find the vehicle and go straight to work");
    expect(html).toContain("Create canonical identity");
    expect(html).toContain("Import preview");
    expect(html).toContain("Search VIN, partial VIN");
    expect(html).toContain("Search and open");
    expect(html).toContain("Open the vehicle workspace faster");
  });

  it("renders each vehicle result as a live route into registry detail and workspaces", () => {
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
            lifecycleState: "ACTIVE",
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
    expect(html).toContain("/vehicles/registry?vehicleId=veh-1");
    expect(html).toContain("/vehicles/360/veh-1");
    expect(html).toContain("/vehicles/veh-1/workbench");
    expect(html).toContain("Preview here");
  });
});
