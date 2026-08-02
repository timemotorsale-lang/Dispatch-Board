import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Vehicle360Workspace, type Vehicle360View } from "@/features/inventory/vehicle-360-workspace";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning"),
}));

const view: Vehicle360View = {
  summary: {
    vehicle: { id: "vehicle-1", vehicleNumber: "VEH-1001", vin: "5XYRGDLC9MG022398", vinState: "VERIFIED", stockNumber: "022398", year: 2021, make: "Kia", model: "Sorento", color: null, licensePlate: null, licensePlateState: null, status: "ACTIVE", version: 2 },
    owner: { id: "user-1", name: "Eli Manager" },
    location: { id: "location-1", name: "Minneapolis" },
    stage: "INSPECTION_AND_TRIAGE",
    operatingState: "ACTIVE",
    nextAction: "Complete receiving inspection",
    targetAt: "2026-08-02T17:00:00.000Z",
    latestOdometer: { reading: 42118, observedAt: "2026-08-01T15:00:00.000Z" },
    risks: ["RECALL_REVIEW_REQUIRED"],
  },
  timeline: [{ id: "timeline-1", occurredAt: "2026-08-01T15:00:00.000Z", source: "INVENTORY", type: "ACTIVE", title: "Receiving intake started", detail: "Custody accepted", subjectType: "INVENTORY_UNIT", subjectId: "unit-1" }],
  tabAccess: {},
  tabs: {
    overview: { vehicle: {} },
    specifications: { available: true, addMode: "VIN", canonical: { vin: "5XYRGDLC9MG022398", year: 2021, make: "Kia", model: "Sorento" }, canonicalOrigins: {}, decodedAt: "2026-08-01T14:50:00.000Z", fieldOrigins: {}, mappingVersion: 1, provider: "NHTSA_VPIC", specifications: { trim: "LX", driveType: "AWD", displacementLiters: 2.5, engineCylinders: 4, bodyClass: "SUV" }, warnings: [] },
    inventory: { allowed: true, items: [{ id: "unit-1", inventoryNumber: "INV-1", lifecycleStage: "INSPECTION_AND_TRIAGE" }] },
    service: { allowed: true, repairOrders: [{ id: "ro-1", repairOrderNumber: "RO-10482", stage: "CLOSED" }] },
    parts: { allowed: true, demands: [], custody: [] },
    appointments: { allowed: true, items: [] },
    documents: { allowed: true, items: [] },
    warranty: { allowed: true, items: [] },
    communications: { allowed: true, items: [] },
    costs: { allowed: true, items: [] },
    decisions: { allowed: true, items: [] },
    audit: { allowed: true, items: [] },
  },
  graph: { nodes: [{ id: "unit-1", type: "INVENTORY_UNIT", label: "INV-1", href: "/vehicles/inventory", status: "ACTIVE" }], edges: [{ id: "edge-1", from: "vehicle-1", to: "unit-1", type: "INVENTORY", label: "inspection" }] },
};

describe("Vehicle 360 enterprise command center", () => {
  it("renders the approved landing page and preserves the exact workflow return", () => {
    const html = renderToStaticMarkup(<Vehicle360Workspace initial={view} />);

    for (const content of [
      "Canonical vehicle command center",
      "2021 Kia Sorento LX",
      "VIN Verified",
      "Dealership inventory",
      "Overview",
      "Identity &amp; specifications",
      "Work &amp; service history",
      "Safety intelligence",
      "Evidence &amp; documents",
      "Current operational state",
      "Do this next",
      "Canonical data health",
      "Connected records",
      "Potential campaigns require VIN-specific verification",
      "Work, service, and evidence timeline",
    ]) expect(html).toContain(content);

    expect(html).toContain('href="/vehicles/vehicle-1/inventory-planning"');
    expect(html).toContain("returnTo=%2Fvehicles%2F360%2Fvehicle-1%3FreturnTo%3D%252Fvehicles%252Fvehicle-1%252Finventory-planning");
    expect(html).toContain("42,118 mi");
    expect(html).toContain("Eli Manager");
    expect(html).toContain("Minneapolis");
  });
});
