import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VehicleRegistryWorkspace } from "@/features/inventory/vehicle-registry-workspace";

describe("vehicle registry workspace", () => {
  it("renders search, create, and import workflows", () => {
    const html = renderToStaticMarkup(<VehicleRegistryWorkspace initial={{ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 }} />);
    expect(html).toContain("Vehicle identity command center"); expect(html).toContain("Create canonical identity"); expect(html).toContain("Import preview"); expect(html).toContain("Search VIN, partial VIN");
  });
});
