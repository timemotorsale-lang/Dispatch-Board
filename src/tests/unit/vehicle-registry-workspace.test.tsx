import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseQuickVehicleIdentity, VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";

describe("vehicle registry workspace", () => {
  it("renders search, create, and import workflows", () => {
    const html = renderToStaticMarkup(<VehicleRegistryWorkspace initial={{ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 }} />);
    expect(html).toContain("Find the vehicle and go straight to work");
    expect(html).toContain("Create canonical identity");
    expect(html).toContain("Import preview");
    expect(html).toContain("Search VIN, partial VIN");
    expect(html).toContain("Search and open");
    expect(html).toContain("Open the vehicle workspace faster");
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
