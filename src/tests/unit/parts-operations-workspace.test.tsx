import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PartsOperationsWorkspace } from "@/features/inventory/parts-operations-workspace";

describe("PartsOperationsWorkspace", () => {
  it("renders the approved overview and routes consequential work to governed surfaces", () => {
    const markup = renderToStaticMarkup(
      <PartsOperationsWorkspace
        initialRepairOrderId="ro-1"
        initial={{
          capability: { barcodeHardware: "UNVERIFIED_MANUAL_FALLBACK", recommendations: "ADVISORY_NON_EXECUTING", vendorAdapters: "DISABLED" },
          contractVersion: "parts-operations/r8.0.0",
          generatedAt: "2026-07-18T14:00:00.000Z",
          ledger: {
            repairOrders: [{
              id: "ro-1",
              locationId: "loc-1",
              partDemands: [{ id: "demand-1", status: "OPEN" }],
              readinessEvaluations: [{ evaluatedAt: "2026-07-17T14:00:00.000Z", ready: false }],
              repairOrderNumber: "RO-1001",
              vehicle: { make: "Ford", model: "F-150", vehicleNumber: "TMS-100", year: 2025 }
            }]
          },
          service: {
            custodyEvents: [],
            demands: [{
              id: "demand-1",
              part: { description: "Brake caliper", partNumber: "BC-100" },
              quantityRequired: 1,
              quantityReserved: 0,
              repairOrder: { locationId: "loc-1", repairOrderNumber: "RO-1001" },
              requiredAt: "2026-07-18T15:00:00.000Z",
              status: "OPEN"
            }, {
              id: "demand-duplicate",
              part: { description: "Brake caliper", partNumber: "BC-100" },
              quantityRequired: 1,
              quantityReserved: 0,
              repairOrder: { locationId: "loc-1", repairOrderNumber: "RO-1001" },
              requiredAt: "2026-07-18T15:05:00.000Z",
              status: "OPEN"
            }],
            discrepancies: [],
            locations: [{ id: "loc-1", name: "Main Store" }],
            offers: [],
            purchaseOrders: [],
            recoveries: [],
            requisitions: [],
            transfers: []
          },
          waveOne: {
            counts: [],
            discrepancies: [],
            parts: [{ balances: [], description: "Brake caliper", id: "part-1", partNumber: "BC-100" }],
            recommendations: [],
            reservations: [],
            stockLocations: []
          }
        }}
      />
    );

    expect(markup).toContain("Parts Operations");
    expect(markup).toContain("Parts Milestones");
    expect(markup).toContain("Parts Work Queue");
    expect(markup).toContain("Review the actual needed parts for RO-1001");
    expect(markup).toContain("1 repeated demand record detected");
    expect(markup).toContain("2 repeated demand records grouped");
    expect(markup).toContain("Order reviewed needed parts");
    expect(markup).toContain("Edit needed parts");
    expect(markup).toContain("Cancel repeated records");
    expect(markup).toContain("/diagnostics/parts-ordering?");
    expect(markup).toContain("Part # / Description");
    expect(markup).toContain("Repair Order / Job");
    expect(markup).toContain("2025 Ford F-150 · TMS-100");
    expect(markup).toContain("Reviews &amp; Approvals");
    expect(markup).toContain("Review and approval categories");
    expect(markup).toContain("Recommendations are advisory");
    expect(markup).toContain("parts-operations?view=demand");
    expect(markup).toContain("parts-operations?view=counts-exceptions");
    expect(markup).toContain("repairOrderId=ro-1");
    expect(markup).toContain("Vendor adapters: DISABLED");
    expect(markup).toContain('href="/vehicles/service-close-parts"');
    expect(markup).toContain('href="/vehicles/parts-counter"');
    expect(markup).toContain("BC-100");
  });
});
