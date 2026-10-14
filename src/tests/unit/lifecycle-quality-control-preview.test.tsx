import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LifecycleQualityControlPreview } from "@/features/inventory/lifecycle-quality-control-preview";

const model = {
  repairOrders: [{
    id: "ro_1",
    repairOrderNumber: "RO-1001",
    origin: "CUSTOMER_SERVICE",
    targetAt: "2026-07-20T20:00:00.000Z",
    vehicle: { vehicleNumber: "VEH-1001", year: 2024, make: "Ford", model: "F-150" },
    customer: { displayName: "Jordan Customer" },
    inventoryUnit: null,
    location: { name: "Time Motor Sales - Minneapolis" },
    serviceVisit: { concernSummary: "Grinding noise from front passenger brakes.", promisedAt: "2026-07-20T21:00:00.000Z" },
    repairJobs: [{
      id: "job_1",
      jobNumber: "J-1",
      description: "Front brake repair",
      plannedCorrection: "Replace pads and verify braking noise is gone.",
      status: "READY_FOR_QC",
      qualityInspections: [],
    }],
  }],
};

describe("LifecycleQualityControlPreview", () => {
  it("shows the approved IQI mockup as the primary lifecycle preview", () => {
    const html = renderToStaticMarkup(
      <LifecycleQualityControlPreview
        initial={model}
        initialRepairOrderId="ro_1"
        returnTo="/vehicles/inventory"
      />,
    );

    expect(html).toContain("Open the approved IQI mockup directly.");
    expect(html).toContain("Approved Initial QC mockup");
    expect(html).toContain("IQI initial QC workspace");
    expect(html).toContain("Selected repair");
    expect(html).toContain("Live QC Queue");
    expect(html).toContain("Repair Order");
  });
});
