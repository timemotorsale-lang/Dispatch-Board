import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { OutsideVendorDirectory } from "@/features/inventory/outside-vendor-directory";

describe("outside vendor directory", () => {
  it("keeps reusable vendors in their own operating ledger workspace", () => {
    const html = renderToStaticMarkup(<OutsideVendorDirectory vendors={[{ id: "vendor-1", code: "DIEGO-AUTO-BODY", name: "Diego Auto Body", vendorType: "BODY_SHOP", contactName: "Diego", phoneNumber: "555-0199", email: null, address: "Body Shop Road", defaultLeadDays: 2, notes: null, status: "ACTIVE" }]} />);
    expect(html).toContain("Operations · Outside vendor workspace");
    expect(html).toContain("Diego Auto Body");
    expect(html).toContain("Supporting party · Vendor");
    expect(html).toContain("Supporting parties stay connected");
    expect(html).toContain("Vendor work ledger");
    expect(html).toContain("Billing and invoice control");
    expect(html).toContain("Add outside vendor");
  });

  it("shows total ledger records and a correction path for misassigned vendor work", () => {
    const html = renderToStaticMarkup(<OutsideVendorDirectory vendors={[
      { id: "vendor-northside", code: "NORTHSIDE-GARAGE", name: "Northside Garage", vendorType: "MECHANICAL_SUBLET", contactName: null, phoneNumber: null, email: null, address: null, defaultLeadDays: 3, notes: null, status: "ACTIVE", workAssignments: [
        { id: "work-honda", vendorId: "vendor-northside", vendorName: "Northside Garage", workType: "MECHANICAL_SUBLET", status: "COMPLETED", approvalStatus: "APPROVED", scope: "Simba Collision fixed the dash lights by replacing the timing chain.", estimateAmountCents: 32000, approvedAmountCents: 32000, supplementalAmountCents: null, expectedReturnAt: null, returnedAt: "2026-08-12T20:00:00Z", sentAt: "2026-08-09T14:00:00Z", currentLocation: "Dealership", lastUpdateSummary: "Repair complete.", nextAction: "Ask for invoice.", nextFollowUpAt: null, repairOrder: { id: "ro-honda", repairOrderNumber: "RO-8534C883", stage: "ADVISOR_REVIEW", operatingState: "ACTIVE", targetAt: "2026-08-12T20:00:00Z", customer: null, inventoryUnit: { inventoryNumber: "033428" }, location: { name: "Time Motor Sales" }, vehicle: { year: 2019, make: "HONDA", model: "Accord", vehicleNumber: "veh-honda", vin: "1HGCV1F1XKA033428" } }, events: [] },
        { id: "work-older", vendorId: "vendor-northside", vendorName: "Northside Garage", workType: "MECHANICAL_SUBLET", status: "CANCELLED", approvalStatus: "DECLINED", scope: "Cancelled duplicate vendor record.", estimateAmountCents: null, approvedAmountCents: null, supplementalAmountCents: null, expectedReturnAt: null, returnedAt: null, sentAt: "2026-08-09T14:00:00Z", currentLocation: "Northside Garage", lastUpdateSummary: "Cancelled duplicate.", nextAction: "No action.", nextFollowUpAt: null, repairOrder: { id: "ro-duplicate", repairOrderNumber: "RO-DUP", stage: "REPAIR", operatingState: "CLOSED", targetAt: "2026-08-12T20:00:00Z", customer: null, inventoryUnit: { inventoryNumber: "033428" }, location: { name: "Time Motor Sales" }, vehicle: { year: 2019, make: "HONDA", model: "Accord", vehicleNumber: "veh-honda", vin: null } }, events: [] },
      ] },
      { id: "vendor-simba", code: "SIMBA-COLLISION", name: "Simba Collision", vendorType: "MECHANICAL_SUBLET", contactName: null, phoneNumber: null, email: null, address: null, defaultLeadDays: 3, notes: null, status: "ACTIVE", workAssignments: [] },
    ]} />);
    expect(html).toContain("1 repair-order record(s)");
    expect(html).toContain("Correct ledger vendor");
    expect(html).toContain("Move work to selected vendor");
    expect(html).toContain("If two facilities each performed payable work");
  });
});
